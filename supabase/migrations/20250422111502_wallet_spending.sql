ALTER TABLE utxos ADD COLUMN reserved BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN utxos.reserved IS 'Whether the UTXO is reserved for a transaction';

CREATE TABLE unsigned_transactions (
    id TEXT PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES multi_sig_wallets(id),
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    is_signing BOOLEAN NOT NULL DEFAULT FALSE,
    is_broadcasted BOOLEAN NOT NULL DEFAULT FALSE,
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    initiated_by UUID NOT NULL REFERENCES auth.users(id),
    signatures_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE unsigned_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unsigned transactions"
ON unsigned_transactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM multi_sig_wallets
        WHERE multi_sig_wallets.id = unsigned_transactions.wallet_id
        AND user_owns_wallet(multi_sig_wallets.id)
    )
);

COMMENT ON TABLE unsigned_transactions IS 'A transaction that is in the process of being signed';
COMMENT ON COLUMN unsigned_transactions.id IS 'The human readable ID of the unsigned transaction prefixed with tx-';
COMMENT ON COLUMN unsigned_transactions.created_at IS 'The date and time the transaction was created';
COMMENT ON COLUMN unsigned_transactions.wallet_id IS 'The wallet that the transaction belongs to';
COMMENT ON COLUMN unsigned_transactions.is_complete IS 'Whether the transaction is complete';
COMMENT ON COLUMN unsigned_transactions.is_signing IS 'Whether the transaction is currently being signed';
COMMENT ON COLUMN unsigned_transactions.is_broadcasted IS 'Whether the transaction has been broadcasted to the network';
COMMENT ON COLUMN unsigned_transactions.is_cancelled IS 'Whether the transaction has been cancelled';
COMMENT ON COLUMN unsigned_transactions.signatures_count IS 'The number of signatures that have been collected for the transaction';
COMMENT ON COLUMN unsigned_transactions.initiated_by IS 'The user that initiated the transaction';

CREATE TABLE unsigned_transaction_inputs (
    utxo_id INTEGER NOT NULL REFERENCES utxos(id),
    unsigned_transaction_id TEXT NOT NULL REFERENCES unsigned_transactions(id),
    PRIMARY KEY (utxo_id, unsigned_transaction_id)
);

ALTER TABLE unsigned_transaction_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unsigned transaction inputs"
ON unsigned_transaction_inputs
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM unsigned_transactions
        WHERE unsigned_transactions.id = unsigned_transaction_inputs.unsigned_transaction_id
        AND user_owns_wallet(unsigned_transactions.wallet_id)
    )
);

COMMENT ON TABLE unsigned_transaction_inputs IS 'A UTXO that is part of an unsigned transaction';
COMMENT ON COLUMN unsigned_transaction_inputs.utxo_id IS 'The UTXO that is part of the unsigned transaction';
COMMENT ON COLUMN unsigned_transaction_inputs.unsigned_transaction_id IS 'The unsigned transaction that the UTXO is part of';

CREATE TABLE psbts (
    id SERIAL PRIMARY KEY,
    unsigned_transaction_id TEXT NOT NULL REFERENCES unsigned_transactions(id),
    psbt_base64 TEXT NOT NULL,
    public_key_id INTEGER REFERENCES public_keys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ON psbts (unsigned_transaction_id, public_key_id);

ALTER TABLE psbts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PSBTs"
ON psbts
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM unsigned_transactions
        WHERE unsigned_transactions.id = psbts.unsigned_transaction_id
        AND user_owns_wallet(unsigned_transactions.wallet_id)
    )
);

COMMENT ON TABLE psbts IS 'A PSBT that is part of an unsigned transaction';
COMMENT ON COLUMN psbts.unsigned_transaction_id IS 'The unsigned transaction that the PSBT is part of';
COMMENT ON COLUMN psbts.created_at IS 'The date and time the PSBT was created';
COMMENT ON COLUMN psbts.public_key_id IS 'The public key that signed the PSBT';

CREATE OR REPLACE FUNCTION get_wallet_utxos(_wallet_id UUID)
RETURNS TABLE (
    utxo TEXT,
    value BIGINT,
    is_spent BOOLEAN,
    confirmed BOOLEAN,
    address TEXT,
    address_index INTEGER,
    change BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT u.utxo, u.value, u.is_spent, u.confirmed, a.address, a.address_index, a.change
    FROM utxos u
    JOIN addresses a ON u.address_id = a.id
    WHERE a.wallet_id = _wallet_id
    AND u.is_spent = false
    AND u.reserved = false
    ORDER BY u.created_at ASC; -- oldest first
END
$$;

CREATE OR REPLACE FUNCTION initiate_spend_transaction(_unsigned_transaction_id TEXT, _wallet_id UUID, _psbt_base64 TEXT, _inputs TEXT[], _outputs JSONB, _fee_per_byte INTEGER, _initiated_by UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    _input TEXT;
BEGIN
    -- Update the UTXOs to be reserved
    UPDATE utxos SET reserved = true WHERE utxo = ANY(_inputs);

    -- Create the unsigned transaction
    INSERT INTO unsigned_transactions (id, wallet_id, is_complete, is_signing, initiated_by)
    VALUES (_unsigned_transaction_id, _wallet_id, false, false, _initiated_by);

    -- Insert the inputs into the unsigned transaction
    FOREACH _input IN ARRAY _inputs LOOP
        INSERT INTO unsigned_transaction_inputs (utxo_id, unsigned_transaction_id)
        VALUES ((SELECT id FROM utxos WHERE utxo = _input), _unsigned_transaction_id);
    END LOOP;

    -- Insert the PSBT into the unsigned transaction
    INSERT INTO psbts (unsigned_transaction_id, psbt_base64, public_key_id)
    VALUES (_unsigned_transaction_id, _psbt_base64, NULL);
END
$$;

CREATE OR REPLACE FUNCTION submit_signed_psbt(_unsigned_transaction_id TEXT, _psbt_base64 TEXT, _public_key TEXT)
RETURNS TABLE (
    is_complete BOOLEAN,
    signatures_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    _public_key_id INTEGER;
    _signatures_count INTEGER;
BEGIN
    -- Get the public key ID
    SELECT id INTO _public_key_id FROM public_keys WHERE public_key_id = _public_key;

    -- Insert the PSBT into the psbts table
    INSERT INTO psbts (unsigned_transaction_id, psbt_base64, public_key_id)
    VALUES (_unsigned_transaction_id, _psbt_base64, _public_key_id);

    -- Update the signatures count
    UPDATE unsigned_transactions SET signatures_count = signatures_count + 1 WHERE id = _unsigned_transaction_id;

    SELECT signatures_count INTO _signatures_count FROM unsigned_transactions WHERE id = _unsigned_transaction_id;

    IF _signatures_count >= (SELECT m FROM multi_sig_wallets WHERE id = (SELECT wallet_id FROM unsigned_transactions WHERE id = _unsigned_transaction_id)) THEN
        UPDATE unsigned_transactions SET is_complete = true WHERE id = _unsigned_transaction_id;
    END IF;

    RETURN QUERY
    SELECT is_complete, signatures_count FROM unsigned_transactions WHERE id = _unsigned_transaction_id;
END
$$;
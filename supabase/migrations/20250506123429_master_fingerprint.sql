ALTER TABLE public_keys ADD COLUMN master_fingerprint TEXT;

COMMENT ON COLUMN public_keys.master_fingerprint IS 'The master fingerprint of the device that generated the public key';

CREATE TABLE ledger_policies (
    policy_id_hex TEXT NOT NULL,
    policy_hmac_hex TEXT NOT NULL,
    wallet_id UUID NOT NULL REFERENCES multi_sig_wallets(id),
    public_key_id INT NOT NULL REFERENCES public_keys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (wallet_id, public_key_id)
);

COMMENT ON TABLE ledger_policies IS 'Ledger app policies for the multi-sig wallet';
COMMENT ON COLUMN ledger_policies.policy_id_hex IS 'The policy ID of the ledger app';
COMMENT ON COLUMN ledger_policies.policy_hmac_hex IS 'The HMAC of the policy ID';
COMMENT ON COLUMN ledger_policies.wallet_id IS 'The multi-sig wallet ID';
COMMENT ON COLUMN ledger_policies.public_key_id IS 'The public key ID';
COMMENT ON COLUMN ledger_policies.created_at IS 'The creation date of the policy';
COMMENT ON COLUMN ledger_policies.updated_at IS 'The last update date of the policy';

ALTER TABLE ledger_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet policies"
ON ledger_policies
FOR SELECT
TO authenticated
USING (
    user_owns_wallet(ledger_policies.wallet_id)
);

CREATE OR REPLACE FUNCTION create_ledger_policy(
    _wallet_id UUID,
    _xpub TEXT,
    _policy_id_hex TEXT,
    _policy_hmac_hex TEXT
) RETURNS VOID AS $$
DECLARE
    _public_key_id INT;
    _exists BOOLEAN;
BEGIN
    SELECT id INTO _public_key_id
    FROM public_keys
    WHERE xpub = _xpub;


    IF _public_key_id IS NULL THEN
        RAISE EXCEPTION 'Public key not found';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM ledger_policies
        WHERE wallet_id = _wallet_id AND public_key_id = _public_key_id
    ) INTO _exists;

    IF _exists THEN
        RAISE EXCEPTION 'Ledger policy already exists';
    END IF;

    INSERT INTO ledger_policies (wallet_id, public_key_id, policy_id_hex, policy_hmac_hex)
    VALUES (_wallet_id, _public_key_id, _policy_id_hex, _policy_hmac_hex);
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_or_create_public_key(UUID, TEXT, TEXT);

DROP FUNCTION IF EXISTS get_or_create_public_key(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION get_or_create_public_key(
    _user_id UUID,
    _xpub TEXT,
    _account_node_derivation_path TEXT,
    _device TEXT,
    _master_fingerprint TEXT DEFAULT NULL,
    _label TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    _public_key_id INT;
BEGIN
    SELECT id INTO _public_key_id
    FROM public_keys
    WHERE xpub = _xpub;

    IF _public_key_id IS NULL THEN
        INSERT INTO public_keys (user_id, xpub, account_node_derivation_path, device, label, master_fingerprint)
        VALUES (_user_id, _xpub, _account_node_derivation_path, _device, _label, _master_fingerprint)
        RETURNING id INTO _public_key_id;
    END IF;

    RETURN _public_key_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS create_wallet(UUID, TEXT, INT, INT, supported_chains, TEXT, INT, INTEGER, TEXT, JSONB[]);
CREATE OR REPLACE FUNCTION create_wallet(
    _user_id UUID,
    _wallet_name TEXT,
    _m INT,
    _n INT,
    _chain supported_chains,
    _wallet_descriptor TEXT,
    _server_signers INT,
    _server_signer_id INTEGER,
    _server_signer_derivation_path TEXT,
    _server_xpub TEXT,
    _user_public_keys JSONB[]
) RETURNS UUID AS $$
DECLARE
    _wallet_id UUID;
    _user_public_key JSONB;
    _public_key_id INT;
BEGIN
    INSERT INTO multi_sig_wallets (name, m, n, chain, wallet_descriptor, server_signers)
    VALUES (_wallet_name, _m, _n, _chain, _wallet_descriptor, _server_signers)
    RETURNING id INTO _wallet_id;
    
    -- Insert the user as admin in the wallet_owners table
    INSERT INTO wallet_owners (wallet_id, user_id, role)
    VALUES (_wallet_id, _user_id, 'admin');

    FOREACH _user_public_key IN ARRAY _user_public_keys
    LOOP
        SELECT get_or_create_public_key(
            _user_id, 
            _user_public_key->>'xpub', 
            _user_public_key->>'path',
            _user_public_key->>'device',
            _user_public_key->>'master_fingerprint',
            _user_public_key->>'label'
        ) INTO _public_key_id;

        INSERT INTO user_signers (public_key_id, wallet_id)
        VALUES (_public_key_id, _wallet_id);
    END LOOP;

    UPDATE server_signers
    SET wallet_id = _wallet_id, account_node_derivation_path = _server_signer_derivation_path, xpub = _server_xpub
    WHERE account_id = _server_signer_id;

    RETURN _wallet_id;
END;
$$ LANGUAGE plpgsql;


DROP FUNCTION IF EXISTS get_wallet_data(UUID);
CREATE FUNCTION get_wallet_data(
    _wallet_id UUID
) RETURNS TABLE (
    account_id INT,
    m INT,
    user_xpubs TEXT[],
    user_master_fingerprints TEXT[],
    user_derivation_paths TEXT[]
) AS $$
DECLARE
    _account_id INT;
    _m INT;
    _user_xpubs TEXT[];
    _user_master_fingerprints TEXT[];
    _user_derivation_paths TEXT[];
BEGIN
    SELECT ss.account_id
    INTO _account_id
    FROM server_signers ss
    WHERE ss.wallet_id = _wallet_id;

    SELECT msw.m
    INTO _m
    FROM multi_sig_wallets msw
    WHERE msw.id = _wallet_id;

    -- we need to order by id ASC to get the correct order of the public keys
    SELECT array_agg(pk.xpub ORDER BY pk.id ASC)
    INTO _user_xpubs
    FROM public_keys pk
    JOIN user_signers us ON pk.id = us.public_key_id
    WHERE us.wallet_id = _wallet_id;

    -- we need to order by id ASC to get the correct order of the public keys
    SELECT array_agg(pk.master_fingerprint ORDER BY pk.id ASC)
    INTO _user_master_fingerprints
    FROM public_keys pk
    JOIN user_signers us ON pk.id = us.public_key_id
    WHERE us.wallet_id = _wallet_id;

    -- we need to order by id ASC to get the correct order of the public keys
    SELECT array_agg(pk.account_node_derivation_path ORDER BY pk.id ASC)
    INTO _user_derivation_paths
    FROM public_keys pk
    JOIN user_signers us ON pk.id = us.public_key_id
    WHERE us.wallet_id = _wallet_id;

    RETURN QUERY SELECT _account_id, _m, _user_xpubs, _user_master_fingerprints, _user_derivation_paths;
END;
$$ LANGUAGE plpgsql;

DROP TABLE psbts;

ALTER TABLE unsigned_transactions ADD COLUMN psbt_base64 TEXT NOT NULL;
COMMENT ON COLUMN unsigned_transactions.psbt_base64 IS 'The PSBT base64 for the unsigned transaction';

-- Make all fields in the unsigned_transaction_outputs table NOT NULL
ALTER TABLE unsigned_transaction_outputs 
    ALTER COLUMN unsigned_transaction_id SET NOT NULL,
    ALTER COLUMN recipient_address_id SET NOT NULL,
    ALTER COLUMN amount SET NOT NULL,
    ALTER COLUMN vout SET NOT NULL;

ALTER TABLE unsigned_transaction_outputs
    ADD COLUMN is_change BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE unsigned_transaction_inputs
    ALTER COLUMN vin SET NOT NULL;

DROP FUNCTION IF EXISTS initiate_spend_transaction;
CREATE OR REPLACE FUNCTION initiate_spend_transaction(_unsigned_transaction_id TEXT, _wallet_id UUID, _psbt_base64 TEXT, _inputs TEXT[], _outputs JSONB[], _fee_per_byte INTEGER, _initiated_by UUID, _total_spent BIGINT, _fee_base_currency_amount BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    _input TEXT;
    _input_index INTEGER := 0;
    _output_index INTEGER := 0;
    _recipient_address_id INTEGER;
    _output_amount INTEGER;
    _output JSONB;
BEGIN
    -- Update the UTXOs to be reserved
    UPDATE utxos SET reserved = true WHERE utxo = ANY(_inputs);

    -- Create the unsigned transaction
    INSERT INTO unsigned_transactions (id, wallet_id, is_complete, is_signing, initiated_by, fee_per_byte, total_spent, fee_base_currency_amount, psbt_base64)
    VALUES (_unsigned_transaction_id, _wallet_id, false, false, _initiated_by, _fee_per_byte, _total_spent, _fee_base_currency_amount, _psbt_base64);

    -- Insert the inputs into the unsigned transaction
    FOREACH _input IN ARRAY _inputs LOOP
        INSERT INTO unsigned_transaction_inputs (utxo_id, unsigned_transaction_id, vin)
        VALUES ((SELECT id FROM utxos WHERE utxo = _input), _unsigned_transaction_id, _input_index);
        _input_index := _input_index + 1;
    END LOOP;

    -- Insert the outputs into the unsigned transaction
    FOREACH _output IN ARRAY _outputs LOOP
        RAISE NOTICE 'Output: %', _output;
        _recipient_address_id := get_or_create_recipient_address(_wallet_id, _output->>'address'::TEXT, _output->>'label'::TEXT);
        _output_amount := (_output->>'value')::INTEGER;
        INSERT INTO unsigned_transaction_outputs (unsigned_transaction_id, recipient_address_id, amount, vout)
        VALUES (_unsigned_transaction_id, _recipient_address_id, _output_amount, _output_index);
        _output_index := _output_index + 1;
    END LOOP;
END
$$;


CREATE TABLE partial_signatures (
    unsigned_tx_id TEXT NOT NULL REFERENCES unsigned_transactions(id),
    input_index INTEGER NOT NULL,
    xpub_id INTEGER NOT NULL REFERENCES public_keys(id),
    pubkey TEXT NOT NULL,
    signature TEXT NOT NULL,
    tapleaf_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (unsigned_tx_id, input_index, xpub_id)
);

COMMENT ON TABLE partial_signatures IS 'Partial signatures for a PSBT';
COMMENT ON COLUMN partial_signatures.unsigned_tx_id IS 'The unsigned transaction ID';
COMMENT ON COLUMN partial_signatures.input_index IS 'The input index';
COMMENT ON COLUMN partial_signatures.xpub_id IS 'The public key ID';
COMMENT ON COLUMN partial_signatures.pubkey IS 'The public key for the input';
COMMENT ON COLUMN partial_signatures.signature IS 'The signature for the input';
COMMENT ON COLUMN partial_signatures.tapleaf_hash IS 'The tapleaf hash for the input';

DROP FUNCTION IF EXISTS submit_signed_psbt;
CREATE OR REPLACE FUNCTION submit_partial_signatures(
    _unsigned_tx_id TEXT,
    _master_fingerprint TEXT,
    _partial_signatures JSONB[]
) RETURNS TABLE (
    signatures_count INTEGER,
    is_complete BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    _input_index INTEGER;
    _xpub_id INTEGER;
    _pubkey TEXT;
    _signature TEXT;
    _tapleaf_hash TEXT;
    _number_of_signatures INTEGER;
    _number_of_inputs INTEGER;
    _number_of_signers INTEGER;
    _total_signatures_count INTEGER;
    _m INTEGER;
    _partial_signature JSONB;
BEGIN
    -- Check if the unsigned transaction exists
    IF NOT EXISTS (SELECT 1 FROM unsigned_transactions WHERE id = _unsigned_tx_id) THEN
        RAISE EXCEPTION 'Unsigned transaction not found';
    END IF;
    
    SELECT id INTO _xpub_id
    FROM public_keys
    WHERE master_fingerprint = _master_fingerprint;

    IF _xpub_id IS NULL THEN
        RAISE EXCEPTION 'Public key not found';
    END IF;

    _number_of_signatures := jsonb_array_length(_partial_signatures);
    SELECT COUNT(*) INTO _number_of_inputs
    FROM unsigned_transaction_inputs
    WHERE unsigned_transaction_id = _unsigned_tx_id;
    
    -- Check if the number of signatures is evenly divisible by the number of inputs
    IF _number_of_signatures % _number_of_inputs != 0 THEN
        RAISE EXCEPTION 'Number of signatures (%) must be evenly divisible by number of inputs (%)', _number_of_signatures, _number_of_inputs;
    END IF;
    
    -- how many signers submitted signatures in this call
    _number_of_signers := _number_of_signatures / _number_of_inputs;

    UPDATE unsigned_transactions
    SET signatures_count = signatures_count + _number_of_signers
    WHERE id = _unsigned_tx_id;

    -- if signatures is now equal to the number of signers, we can sign the transaction
    SELECT signatures_count INTO _total_signatures_count
    FROM unsigned_transactions
    WHERE id = _unsigned_tx_id;

    -- get the m for the wallet
    SELECT m INTO _m
    FROM multi_sig_wallets
    WHERE id = (SELECT wallet_id FROM unsigned_transactions WHERE id = _unsigned_tx_id);

    -- if the number of signatures is now greater than or equal to m, we can complete the transaction
    IF _total_signatures_count >= _m THEN
        UPDATE unsigned_transactions
        SET is_complete = true
        WHERE id = _unsigned_tx_id;
    END IF;

    -- insert the partial signatures into the database
    FOREACH _partial_signature IN ARRAY _partial_signatures LOOP
        _input_index := (_partial_signature->>'input_index')::INTEGER;
        _signature := _partial_signature->>'signature';
        _pubkey := _partial_signature->>'pubkey';
        _tapleaf_hash := _partial_signature->>'tapleaf_hash';

        INSERT INTO partial_signatures (unsigned_tx_id, input_index, xpub_id, pubkey, signature, tapleaf_hash)
        VALUES (_unsigned_tx_id, _input_index, _xpub_id, _pubkey, _signature, _tapleaf_hash);
    END LOOP;

    RETURN QUERY SELECT _total_signatures_count, _is_complete FROM unsigned_transactions WHERE id = _unsigned_tx_id;
END;
$$;


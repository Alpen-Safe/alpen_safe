ALTER TABLE unsigned_transaction_inputs ADD COLUMN vin INTEGER;

CREATE TABLE recipient_addresses (
    id SERIAL PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES multi_sig_wallets(id),
    address TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE recipient_addresses IS 'The recipient addresses of the unsigned transaction';
COMMENT ON COLUMN recipient_addresses.address IS 'The address of the recipient';
COMMENT ON COLUMN recipient_addresses.label IS 'The label of the recipient';
COMMENT ON COLUMN recipient_addresses.wallet_id IS 'The wallet id of the sender wallet';

CREATE TABLE unsigned_transaction_outputs (
  unsigned_transaction_id TEXT REFERENCES unsigned_transactions(id),
  recipient_address_id INTEGER REFERENCES recipient_addresses(id),
  amount INTEGER,
  vout INTEGER
);

COMMENT ON TABLE unsigned_transaction_outputs IS 'The outputs of the unsigned transaction';
COMMENT ON COLUMN unsigned_transaction_outputs.vout IS 'The index of the output in the transaction';

CREATE INDEX ON unsigned_transaction_outputs (unsigned_transaction_id);
CREATE INDEX ON unsigned_transaction_inputs (unsigned_transaction_id);

ALTER TABLE unsigned_transaction_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view their own unsigned transaction outputs"
ON unsigned_transaction_outputs
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM unsigned_transactions
        WHERE unsigned_transactions.id = unsigned_transaction_outputs.unsigned_transaction_id
        AND user_owns_wallet(unsigned_transactions.wallet_id)
    )
);

ALTER TABLE recipient_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view their own recipient addresses"
ON recipient_addresses
FOR SELECT
USING (
    user_owns_wallet(recipient_addresses.wallet_id)
);

CREATE FUNCTION get_or_create_recipient_address(_wallet_id UUID, _address TEXT, _label TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    _recipient_address_id INTEGER;
BEGIN
    RAISE NOTICE 'Getting or creating recipient address for wallet % and address %', _wallet_id, _address;
    SELECT id FROM recipient_addresses WHERE wallet_id = _wallet_id AND address = _address INTO _recipient_address_id;

    IF _recipient_address_id IS NULL THEN
        INSERT INTO recipient_addresses (wallet_id, address, label) VALUES (_wallet_id, _address, _label) RETURNING id INTO _recipient_address_id;
    ELSE 
        IF _label IS NOT NULL THEN
            UPDATE recipient_addresses SET label = _label WHERE id = _recipient_address_id;
        END IF;
    END IF;

    RETURN _recipient_address_id;
END
$$;


DROP FUNCTION IF EXISTS initiate_spend_transaction;
CREATE OR REPLACE FUNCTION initiate_spend_transaction(_unsigned_transaction_id TEXT, _wallet_id UUID, _psbt_base64 TEXT, _inputs TEXT[], _outputs JSONB[], _fee_per_byte INTEGER, _initiated_by UUID)
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
    INSERT INTO unsigned_transactions (id, wallet_id, is_complete, is_signing, initiated_by)
    VALUES (_unsigned_transaction_id, _wallet_id, false, false, _initiated_by);

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

    -- Insert the PSBT into the unsigned transaction
    INSERT INTO psbts (unsigned_transaction_id, psbt_base64, public_key_id)
    VALUES (_unsigned_transaction_id, _psbt_base64, NULL);
END
$$;
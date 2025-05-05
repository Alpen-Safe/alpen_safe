ALTER TABLE unsigned_transactions ADD COLUMN fee_per_byte INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN unsigned_transactions.fee_per_byte IS 'The fee per byte for the transaction';

ALTER TABLE unsigned_transactions ADD COLUMN fee_base_currency_amount BIGINT NOT NULL DEFAULT 0;
COMMENT ON COLUMN unsigned_transactions.fee_base_currency_amount IS 'The fee in base currency for the transaction';

ALTER TABLE unsigned_transactions ADD COLUMN total_spent BIGINT NOT NULL DEFAULT 0;
COMMENT ON COLUMN unsigned_transactions.total_spent IS 'The total amount spent in the transaction, including the fee';

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
    INSERT INTO unsigned_transactions (id, wallet_id, is_complete, is_signing, initiated_by, fee_per_byte, total_spent, fee_base_currency_amount)
    VALUES (_unsigned_transaction_id, _wallet_id, false, false, _initiated_by, _fee_per_byte, _total_spent, _fee_base_currency_amount);

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
CREATE OR REPLACE FUNCTION broadcast_tx(_unsigned_tx_id TEXT, _blockchain_txid TEXT)
RETURNS VOID AS $$
DECLARE
    _utxos INTEGER[];
    _utxo INTEGER;
    _internal_tx_id INTEGER;
BEGIN
    SELECT array_agg(utxo_id) INTO _utxos FROM unsigned_transaction_inputs WHERE unsigned_transaction_id = _unsigned_tx_id;

    UPDATE utxos SET is_spent = TRUE, confirmed = FALSE WHERE id = ANY(_utxos);

    -- Check if the transaction already exists
    SELECT id INTO _internal_tx_id FROM transactions WHERE transaction_id = _blockchain_txid AND chain = 'bitcoin';

    -- If the transaction is not found, create it
    IF _internal_tx_id IS NULL THEN
        INSERT INTO transactions (transaction_id, chain, confirmed) VALUES (_blockchain_txid, 'bitcoin', FALSE) RETURNING id INTO _internal_tx_id;
    END IF;

    UPDATE unsigned_transactions SET is_broadcasted = TRUE, tx_id = _internal_tx_id WHERE id = _unsigned_tx_id;

    FOREACH _utxo IN ARRAY _utxos LOOP
        INSERT INTO transaction_inputs (transaction_id, utxo_id) VALUES (_internal_tx_id, _utxo);
    END LOOP;

    -- TODO: Check the transaction outputs - does it deposit to an address from a wallet in the database?
END;
$$ LANGUAGE plpgsql;
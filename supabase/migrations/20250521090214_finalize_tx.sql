ALTER TABLE unsigned_transactions ADD COLUMN tx_id INTEGER;
ALTER TABLE unsigned_transactions ADD CONSTRAINT unsigned_transactions_tx_id_fkey FOREIGN KEY (tx_id) REFERENCES transactions(id);

COMMENT ON COLUMN unsigned_transactions.tx_id IS 'The internal transaction id of the transaction on the blockchain once it is broadcasted';

CREATE OR REPLACE FUNCTION broadcast_tx(_unsigned_tx_id TEXT, _blockchain_txid TEXT)
RETURNS VOID AS $$
DECLARE
    _utxos INTEGER[];
    _utxo INTEGER;
    _internal_tx_id INTEGER;
BEGIN
    SELECT array_agg(utxo_id) INTO _utxos FROM unsigned_transaction_inputs WHERE unsigned_transaction_id = _unsigned_tx_id;

    UPDATE utxos SET is_spent = TRUE, confirmed = FALSE WHERE id = ANY(_utxos);

    INSERT INTO transactions (transaction_id, chain, confirmed) VALUES (_blockchain_txid, 'bitcoin', FALSE) RETURNING id INTO _internal_tx_id;

    UPDATE unsigned_transactions SET is_broadcasted = TRUE, tx_id = _internal_tx_id WHERE id = _unsigned_tx_id;

    FOREACH _utxo IN ARRAY _utxos LOOP
        INSERT INTO transaction_inputs (transaction_id, utxo_id) VALUES (_internal_tx_id, _utxo);
    END LOOP;

    -- TODO: Check the transaction outputs - does it deposit to an address from a wallet in the database?
END;
$$ LANGUAGE plpgsql;

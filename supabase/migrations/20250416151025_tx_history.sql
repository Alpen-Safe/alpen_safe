ALTER TABLE transactions DROP COLUMN IF EXISTS value;

CREATE OR REPLACE FUNCTION received_utxo_in_monitored_address(_txid TEXT, _address TEXT, _utxo TEXT, _value BIGINT, _is_spent BOOLEAN, _confirmed BOOLEAN)
RETURNS VOID AS $$
DECLARE
    _address_id INTEGER;
    _confirmed_at TIMESTAMP WITH TIME ZONE;
    _utxo_id INTEGER;
    _transaction_id INTEGER;
BEGIN
    SELECT id INTO _address_id FROM addresses WHERE address = _address;
    IF _address_id IS NULL THEN
        RAISE EXCEPTION 'Address not found';
    END IF;

    -- only insert if the utxo is not already in the database
    INSERT INTO utxos (utxo, value, address_id, is_spent, confirmed)
    SELECT _utxo, _value, _address_id, _is_spent, _confirmed
    WHERE NOT EXISTS (
        SELECT 1 FROM utxos WHERE utxo = _utxo
    );

    -- Get the utxo_id
    SELECT id INTO _utxo_id FROM utxos WHERE utxo = _utxo;

    -- Update confirmed flag if UTXO exists and new confirmed flag is true
    -- this is to update the mempool utxos to be confirmed
    IF _confirmed = true THEN
        UPDATE utxos 
        SET confirmed = true
        WHERE utxo = _utxo;
    END IF;

    -- Mark the address as used
    UPDATE addresses
    SET is_used = TRUE
    WHERE address = _address;

    -- create the transaction
    IF _confirmed = true THEN
        _confirmed_at = NOW();
    ELSE
        _confirmed_at = NULL;
    END IF;

    -- create the transaction
    INSERT INTO transactions (transaction_id, chain, confirmed, confirmed_at)
    VALUES (_txid, 'bitcoin', _confirmed, _confirmed_at)
    ON CONFLICT (transaction_id) DO NOTHING
    RETURNING id INTO _transaction_id;
    
    -- If transaction already exists, get its id
    IF _transaction_id IS NULL THEN
        SELECT id INTO _transaction_id FROM transactions WHERE transaction_id = _txid;
    END IF;

    -- update the transaction to be confirmed if it is not already confirmed
    UPDATE transactions
    SET confirmed = true, confirmed_at = _confirmed_at
    WHERE transaction_id = _txid
    AND _confirmed = true
    AND confirmed = false;

    -- create the transaction outputs
    INSERT INTO transaction_outputs (transaction_id, utxo_id)
    VALUES (_transaction_id, _utxo_id)
    ON CONFLICT (transaction_id, utxo_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Create function to get transaction history for a wallet
CREATE OR REPLACE FUNCTION get_tx_history(_wallet_id UUID)
RETURNS TABLE (
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  chain supported_chains,
  confirmed BOOLEAN,
  input_value BIGINT,
  output_value BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.transaction_id,
    t.created_at,
    t.confirmed_at,
    t.chain,
    t.confirmed,
    COALESCE(SUM(ui.value), 0)::BIGINT as input_value, 
    COALESCE(SUM(uo.value), 0)::BIGINT as output_value 
  FROM transactions t
  LEFT JOIN transaction_inputs txi on t.id = txi.transaction_id
  LEFT JOIN utxos ui on ui.id = txi.utxo_id
  LEFT JOIN transaction_outputs txo on t.id = txo.transaction_id
  LEFT JOIN utxos uo ON uo.id = txo.utxo_id
  LEFT JOIN addresses txia on txia.id = ui.address_id
  LEFT JOIN addresses txoa on txoa.id = uo.address_id
  WHERE txia.wallet_id = _wallet_id 
  OR txoa.wallet_id = _wallet_id
  GROUP BY t.transaction_id, t.created_at, t.confirmed_at, t.chain, t.confirmed;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_tx_input_value(_transaction_id TEXT)
RETURNS BIGINT AS $$
DECLARE
  input_value BIGINT;
BEGIN
  SELECT SUM(u.value) INTO input_value FROM transactions t
  JOIN transaction_inputs txi on t.id = txi.transaction_id
  JOIN utxos u on u.id = txi.utxo_id
  WHERE t.transaction_id = _transaction_id;
  RETURN input_value;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_tx_output_value(_transaction_id TEXT)
RETURNS BIGINT AS $$
DECLARE
  output_value BIGINT;
BEGIN
  SELECT SUM(u.value) INTO output_value FROM transactions t
  JOIN transaction_outputs txo on t.id = txo.transaction_id
  JOIN utxos u on u.id = txo.utxo_id
  WHERE t.transaction_id = _transaction_id;
  RETURN output_value;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW btc_wallet_balance
WITH (security_invoker = true)
AS
SELECT w.id as wallet_id, COALESCE(SUM(value), 0) as balance 
FROM multi_sig_wallets w
JOIN addresses a ON a.wallet_id = w.id
LEFT JOIN utxos u ON u.address_id = a.id AND u.is_spent = FALSE
WHERE public.user_owns_wallet(w.id)
GROUP BY w.id;

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
    get_tx_input_value(t.transaction_id) as input_value, 
    get_tx_output_value(t.transaction_id) as output_value 
  FROM transactions t
  LEFT JOIN transaction_inputs txi on t.id = txi.transaction_id
  LEFT JOIN utxos ui on ui.id = txi.utxo_id
  LEFT JOIN transaction_outputs txo on t.id = txo.transaction_id
  LEFT JOIN utxos uo ON uo.id = txo.utxo_id
  LEFT JOIN addresses txia on txia.id = ui.address_id
  LEFT JOIN addresses txoa on txoa.id = uo.address_id
  WHERE txia.wallet_id = _wallet_id 
  OR txoa.wallet_id = _wallet_id
  GROUP BY t.transaction_id, t.created_at, t.confirmed_at, t.chain, t.confirmed
  ORDER BY COALESCE(t.confirmed_at, t.created_at) DESC;
END;
$$ LANGUAGE plpgsql;
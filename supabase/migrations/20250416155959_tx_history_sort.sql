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
  GROUP BY t.transaction_id, t.created_at, t.confirmed_at, t.chain, t.confirmed
  ORDER BY 
    CASE WHEN t.confirmed_at IS NULL THEN 1 ELSE 0 END,
    t.confirmed_at DESC,
    t.created_at DESC;
END;
$$ LANGUAGE plpgsql;
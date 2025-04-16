CREATE OR REPLACE VIEW btc_wallet_balance
WITH (security_invoker = true)
AS
SELECT w.id as wallet_id, COALESCE(SUM(value), 0) as balance 
FROM multi_sig_wallets w
JOIN addresses a ON a.wallet_id = w.id
LEFT JOIN utxos u ON u.address_id = a.id
WHERE public.user_owns_wallet(w.id)
GROUP BY w.id;
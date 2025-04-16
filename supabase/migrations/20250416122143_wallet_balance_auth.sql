CREATE OR REPLACE VIEW btc_wallet_balance
WITH (security_invoker = true)
AS
SELECT w.id as wallet_id, SUM(value) as balance FROM utxos u
JOIN addresses a ON a.id = u.address_id
JOIN multi_sig_wallets w ON w.id = a.wallet_id
WHERE public.user_owns_wallet(w.id)
GROUP BY w.id;
-- Create a view with limited columns from server_signers
CREATE OR REPLACE VIEW public.server_signers_limited 
WITH (security_invoker=true)
AS
SELECT server_signers.wallet_id, server_signers.xpub
FROM server_signers
WHERE EXISTS (
    SELECT 1
    FROM wallet_owners
    WHERE wallet_owners.wallet_id = server_signers.wallet_id
    AND wallet_owners.user_id = auth.uid()
);
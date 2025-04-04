-- Drop the previous view and create a secure function-based approach
DROP VIEW IF EXISTS public.server_signers_limited;

-- Create a function to check if current user owns a wallet
CREATE OR REPLACE FUNCTION public.user_owns_wallet(wallet_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM wallet_owners
    WHERE wallet_owners.wallet_id = user_owns_wallet.wallet_id
    AND wallet_owners.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view directly from the table to preserve foreign key relationships
CREATE OR REPLACE VIEW public.server_signers_limited
AS
SELECT server_signers.wallet_id, server_signers.xpub
FROM server_signers
WHERE public.user_owns_wallet(server_signers.wallet_id);
ALTER TABLE partial_signatures
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view their own partial signatures"
ON partial_signatures
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM unsigned_transactions
        WHERE unsigned_transactions.id = partial_signatures.unsigned_tx_id
        AND user_owns_wallet(unsigned_transactions.wallet_id)
    )
);


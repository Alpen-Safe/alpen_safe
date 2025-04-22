CREATE OR REPLACE FUNCTION get_wallet_utxos(_wallet_id UUID)
RETURNS TABLE (
    utxo TEXT,
    value BIGINT,
    is_spent BOOLEAN,
    confirmed BOOLEAN,
    address TEXT,
    address_index INTEGER,
    change BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT u.utxo, u.value, u.is_spent, u.confirmed, a.address, a.address_index, a.change
    FROM utxos u
    JOIN addresses a ON u.address_id = a.id
    WHERE a.wallet_id = _wallet_id
    AND u.is_spent = false
    ORDER BY u.created_at ASC; -- oldest first
END
$$;

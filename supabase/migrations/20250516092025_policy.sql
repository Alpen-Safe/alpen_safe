
ALTER TABLE ledger_policies DROP COLUMN public_key_id;
ALTER TABLE ledger_policies ADD COLUMN master_fingerprint TEXT NOT NULL;

CREATE UNIQUE INDEX idx_ledger_policies_wallet_id_master_fingerprint ON ledger_policies (wallet_id, master_fingerprint);

DROP FUNCTION IF EXISTS create_ledger_policy(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_ledger_policy(
    _wallet_id UUID,
    _master_fingerprint TEXT,
    _policy_id_hex TEXT,
    _policy_hmac_hex TEXT
) RETURNS VOID AS $$
DECLARE
    _exists BOOLEAN;
    _is_master_fingerprint_from_this_wallet BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM ledger_policies
        WHERE wallet_id = _wallet_id AND master_fingerprint = _master_fingerprint
    ) INTO _exists;

    IF _exists THEN
        RAISE EXCEPTION 'Ledger policy already exists';
    END IF;


    SELECT EXISTS (
        SELECT 1
        FROM user_signers us
        JOIN public_keys pk ON us.public_key_id = pk.id
        WHERE pk.master_fingerprint = _master_fingerprint AND us.wallet_id = _wallet_id
    ) INTO _is_master_fingerprint_from_this_wallet;

    IF NOT _is_master_fingerprint_from_this_wallet THEN
        RAISE EXCEPTION 'Master fingerprint not found in this wallet public keys';
    END IF;

    INSERT INTO ledger_policies (wallet_id, master_fingerprint, policy_id_hex, policy_hmac_hex)
    VALUES (_wallet_id, _master_fingerprint, _policy_id_hex, _policy_hmac_hex);
END;
$$ LANGUAGE plpgsql;
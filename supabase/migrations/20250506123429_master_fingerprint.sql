ALTER TABLE public_keys ADD COLUMN master_fingerprint TEXT;

COMMENT ON COLUMN public_keys.master_fingerprint IS 'The master fingerprint of the device that generated the public key';

DROP FUNCTION IF EXISTS get_or_create_public_key(UUID, TEXT, TEXT);

DROP FUNCTION IF EXISTS get_or_create_public_key(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION get_or_create_public_key(
    _user_id UUID,
    _xpub TEXT,
    _account_node_derivation_path TEXT,
    _device TEXT,
    _master_fingerprint TEXT DEFAULT NULL,
    _label TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    _public_key_id INT;
BEGIN
    SELECT id INTO _public_key_id
    FROM public_keys
    WHERE xpub = _xpub;

    IF _public_key_id IS NULL THEN
        INSERT INTO public_keys (user_id, xpub, account_node_derivation_path, device, label, master_fingerprint)
        VALUES (_user_id, _xpub, _account_node_derivation_path, _device, _label, _master_fingerprint)
        RETURNING id INTO _public_key_id;
    END IF;

    RETURN _public_key_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS create_wallet(UUID, TEXT, INT, INT, supported_chains, TEXT, INT, INTEGER, TEXT, JSONB[]);
CREATE OR REPLACE FUNCTION create_wallet(
    _user_id UUID,
    _wallet_name TEXT,
    _m INT,
    _n INT,
    _chain supported_chains,
    _wallet_descriptor TEXT,
    _server_signers INT,
    _server_signer_id INTEGER,
    _server_signer_derivation_path TEXT,
    _server_xpub TEXT,
    _user_public_keys JSONB[]
) RETURNS UUID AS $$
DECLARE
    _wallet_id UUID;
    _user_public_key JSONB;
    _public_key_id INT;
BEGIN
    INSERT INTO multi_sig_wallets (name, m, n, chain, wallet_descriptor, server_signers)
    VALUES (_wallet_name, _m, _n, _chain, _wallet_descriptor, _server_signers)
    RETURNING id INTO _wallet_id;
    
    -- Insert the user as admin in the wallet_owners table
    INSERT INTO wallet_owners (wallet_id, user_id, role)
    VALUES (_wallet_id, _user_id, 'admin');

    FOREACH _user_public_key IN ARRAY _user_public_keys
    LOOP
        SELECT get_or_create_public_key(
            _user_id, 
            _user_public_key->>'xpub', 
            _user_public_key->>'path',
            _user_public_key->>'device',
            _user_public_key->>'master_fingerprint',
            _user_public_key->>'label'
        ) INTO _public_key_id;

        INSERT INTO user_signers (public_key_id, wallet_id)
        VALUES (_public_key_id, _wallet_id);
    END LOOP;

    UPDATE server_signers
    SET wallet_id = _wallet_id, account_node_derivation_path = _server_signer_derivation_path, xpub = _server_xpub
    WHERE account_id = _server_signer_id;

    RETURN _wallet_id;
END;
$$ LANGUAGE plpgsql;
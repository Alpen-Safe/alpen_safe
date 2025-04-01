-- Add device and created_at columns to public_keys table
ALTER TABLE public_keys ADD COLUMN device TEXT NOT NULL;
ALTER TABLE public_keys ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public_keys ALTER COLUMN account_node_derivation_path SET NOT NULL;
ALTER TABLE public_keys ADD COLUMN label TEXT;

COMMENT ON COLUMN public_keys.device IS 'The device that the public key was created on';
COMMENT ON COLUMN public_keys.created_at IS 'The date and time the public key was created';
COMMENT ON COLUMN public_keys.label IS 'The label of the public key defined by the user';

ALTER TABLE multi_sig_wallets DROP COLUMN user_owner;

CREATE TYPE wallet_owner_role AS ENUM ('admin', 'viewer');

CREATE TABLE wallet_owners (
    wallet_id UUID NOT NULL REFERENCES multi_sig_wallets(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role wallet_owner_role NOT NULL,
    PRIMARY KEY (wallet_id, user_id)
);

COMMENT ON TABLE wallet_owners IS 'Table to store wallet owners';
COMMENT ON COLUMN wallet_owners.wallet_id IS 'The id of the wallet';
COMMENT ON COLUMN wallet_owners.user_id IS 'The id of the user';
COMMENT ON COLUMN wallet_owners.role IS 'The role of the user';

ALTER TABLE multi_sig_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallets" ON multi_sig_wallets
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM wallet_owners
        WHERE wallet_owners.wallet_id = multi_sig_wallets.id
        AND wallet_owners.user_id = auth.uid()
    )
);

-- Enable RLS on wallet_owners table
ALTER TABLE wallet_owners ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their wallet owner records
CREATE POLICY "Users can view their own wallet owner records" ON wallet_owners
FOR SELECT USING (
    user_id = auth.uid()
);

-- Policy for users to view their public keys
CREATE POLICY "Users can view their own public keys" ON public_keys
FOR SELECT USING (
    user_id = auth.uid()
);

DROP POLICY none_shall_pass ON public_keys;
DROP POLICY none_shall_pass ON multi_sig_wallets;
DROP POLICY none_shall_pass ON addresses;

CREATE POLICY "Users can view their own addresses" ON addresses
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM wallet_owners
        WHERE wallet_owners.wallet_id = addresses.wallet_id
        AND wallet_owners.user_id = auth.uid()
    )
);


CREATE FUNCTION get_or_create_public_key(
    _user_id UUID,
    _xpub TEXT,
    _account_node_derivation_path TEXT,
    _device TEXT,
    _label TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    _public_key_id INT;
BEGIN
    SELECT id INTO _public_key_id
    FROM public_keys
    WHERE xpub = _xpub;

    IF _public_key_id IS NULL THEN
        INSERT INTO public_keys (user_id, xpub, account_node_derivation_path, device, label)
        VALUES (_user_id, _xpub, _account_node_derivation_path, _device, _label)
        RETURNING id INTO _public_key_id;
    END IF;

    RETURN _public_key_id;
END;
$$ LANGUAGE plpgsql;

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
            _user_public_key->>'label'
        ) INTO _public_key_id;

        INSERT INTO user_signers (public_key_id, wallet_id)
        VALUES (_public_key_id, _wallet_id);
    END LOOP;

    UPDATE server_signers
    SET wallet_id = _wallet_id, account_node_derivation_path = _server_signer_derivation_path
    WHERE account_id = _server_signer_id;

    RETURN _wallet_id;
END;
$$ LANGUAGE plpgsql;
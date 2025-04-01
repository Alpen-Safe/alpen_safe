DROP POLICY none_shall_pass ON user_signers;

CREATE POLICY "Users can view their own user signers" ON user_signers
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM wallet_owners
        WHERE wallet_owners.wallet_id = user_signers.wallet_id
        AND wallet_owners.user_id = auth.uid()
    )
);

ALTER TABLE server_signers ADD COLUMN xpub TEXT;
COMMENT ON COLUMN server_signers.xpub IS 'The xpub of the server signer';

-- Create a view with limited columns from server_signers
CREATE OR REPLACE VIEW public.server_signers_limited AS
SELECT server_signers.wallet_id, server_signers.xpub
FROM server_signers
WHERE EXISTS (
    SELECT 1
    FROM wallet_owners
    WHERE wallet_owners.wallet_id = server_signers.wallet_id
    AND wallet_owners.user_id = auth.uid()
);


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

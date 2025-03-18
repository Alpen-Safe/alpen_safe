CREATE TYPE supported_chains AS ENUM ('bitcoin', 'ethereum');

CREATE TABLE multi_sig_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_owner UUID NOT NULL REFERENCES auth.users,
    name TEXT NOT NULL,
    m INT NOT NULL,
    n INT NOT NULL,
    chain supported_chains NOT NULL DEFAULT 'bitcoin',
    server_signers INT NOT NULL,
    wallet_descriptor TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

alter table public.multi_sig_wallets enable row level security;

create policy none_shall_pass on public.MULTI_SIG_WALLETS
for select
using (false);

COMMENT ON TABLE MULTI_SIG_WALLETS IS 'Table to store multi-sig wallets';
COMMENT ON COLUMN MULTI_SIG_WALLETS.id IS 'Unique identifier for the multi-sig wallet';
COMMENT ON COLUMN MULTI_SIG_WALLETS.name IS 'Name of the multi-sig wallet';
COMMENT ON COLUMN MULTI_SIG_WALLETS.m IS 'Number of signatures required to sign a transaction';
COMMENT ON COLUMN MULTI_SIG_WALLETS.n IS 'Total number of signers';
COMMENT ON COLUMN MULTI_SIG_WALLETS.created_at IS 'Timestamp when the multi-sig wallet was created';
COMMENT ON COLUMN MULTI_SIG_WALLETS.updated_at IS 'Timestamp when the multi-sig wallet was last updated';
COMMENT ON COLUMN MULTI_SIG_WALLETS.chain IS 'Blockchain network the multi-sig wallet is on';
COMMENT ON COLUMN MULTI_SIG_WALLETS.server_signers IS 'Number of server keys used for the multi-sig wallet';
COMMENT ON COLUMN MULTI_SIG_WALLETS.wallet_descriptor IS 'The wallet descriptor for the multi-sig wallet';

CREATE TABLE server_signers (
    account_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    wallet_id UUID REFERENCES multi_sig_wallets(id),
    account_node_derivation_path TEXT
);

COMMENT ON TABLE SERVER_SIGNERS IS 'Table to store server signers';
COMMENT ON COLUMN SERVER_SIGNERS.wallet_id IS 'Foreign key to the multi-sig wallet';
COMMENT ON COLUMN SERVER_SIGNERS.account_id IS 'The {account} derivation parameter from BIP84';
COMMENT ON COLUMN SERVER_SIGNERS.account_node_derivation_path IS 'The full derivation path for the server signer';


alter table public.server_signers enable row level security;

create policy none_shall_pass on public.SERVER_SIGNERS
for select
using (false);

CREATE TABLE public_keys (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users,
    xpub TEXT UNIQUE NOT NULL,
    account_node_derivation_path TEXT
);

COMMENT ON TABLE public_keys IS 'Table to store public keys for users';
COMMENT ON COLUMN public_keys.user_id IS 'Foreign key to the user';
COMMENT ON COLUMN public_keys.xpub IS 'The public key of the user';
COMMENT ON COLUMN public_keys.account_node_derivation_path IS 'the full derivation path for the user';

alter table public.public_keys enable row level security;

create policy none_shall_pass on public.PUBLIC_KEYS
for select
using (false);

CREATE TABLE user_signers (
    public_key_id INT NOT NULL REFERENCES public_keys(id),
    wallet_id UUID NOT NULL REFERENCES multi_sig_wallets(id)
);

COMMENT ON TABLE user_signers IS 'Table to store user signers';
COMMENT ON COLUMN user_signers.public_key_id IS 'Foreign key to the public key';
COMMENT ON COLUMN user_signers.wallet_id IS 'Foreign key to the multi-sig wallet';

alter table public.user_signers enable row level security;

create policy none_shall_pass on public.USER_SIGNERS
for select
using (false);

CREATE FUNCTION get_or_create_public_key(
    _user_id UUID,
    _xpub TEXT,
    _account_node_derivation_path TEXT
) RETURNS INT AS $$
DECLARE
    _public_key_id INT;
BEGIN
    SELECT id INTO _public_key_id
    FROM public_keys
    WHERE xpub = _xpub;

    IF _public_key_id IS NULL THEN
        INSERT INTO public_keys (user_id, xpub, account_node_derivation_path)
        VALUES (_user_id, _xpub, _account_node_derivation_path)
        RETURNING id INTO _public_key_id;
    END IF;

    RETURN _public_key_id;
END;
$$ LANGUAGE plpgsql;


CREATE FUNCTION create_wallet(
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
    INSERT INTO multi_sig_wallets (user_owner, name, m, n, chain, wallet_descriptor, server_signers)
    VALUES (_user_id, _wallet_name, _m, _n, _chain, _wallet_descriptor, _server_signers)
    RETURNING id INTO _wallet_id;

    FOREACH _user_public_key IN ARRAY _user_public_keys
    LOOP
        SELECT get_or_create_public_key(
            _user_id, 
            _user_public_key->>'xpub', 
            _user_public_key->>'path'
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
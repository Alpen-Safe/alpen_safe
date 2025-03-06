CREATE TYPE supported_chains AS ENUM ('bitcoin', 'ethereum');

CREATE TABLE multi_sig_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_owner UUID NOT NULL REFERENCES auth.users,
    name TEXT NOT NULL,
    m INT NOT NULL,
    n INT NOT NULL,
    chain supported_chains NOT NULL DEFAULT 'bitcoin',
    server_keys INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
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
COMMENT ON COLUMN MULTI_SIG_WALLETS.server_keys IS 'Number of server keys used for the multi-sig wallet';

CREATE TABLE server_signers (
    account_id SERIAL PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES multi_sig_wallets(id),
    derivation_path TEXT NOT NULL
);

COMMENT ON TABLE SERVER_SIGNERS IS 'Table to store server signers';
COMMENT ON COLUMN SERVER_SIGNERS.wallet_id IS 'Foreign key to the multi-sig wallet';
COMMENT ON COLUMN SERVER_SIGNERS.account_id IS 'The {account} derivation parameter from BIP84';
COMMENT ON COLUMN SERVER_SIGNERS.derivation_path IS 'The full derivation path for the server signer';


alter table public.server_signers enable row level security;

create policy none_shall_pass on public.SERVER_SIGNERS
for select
using (false);

CREATE TABLE user_signers (
    wallet_id UUID NOT NULL REFERENCES multi_sig_wallets(id),
    user_id UUID NOT NULL REFERENCES auth.users,
    public_key_hex TEXT NOT NULL,
    derivation_path TEXT
);

alter table public.user_signers enable row level security;

create policy none_shall_pass on public.USER_SIGNERS
for select
using (false);
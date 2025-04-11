CREATE TABLE IF NOT EXISTS utxos (
    utxo_id TEXT NOT NULL PRIMARY KEY,
    value BIGINT NOT NULL,
    address_id INTEGER REFERENCES addresses(id),
    is_spent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE utxos IS 'UTXOs are unspent transaction outputs';
COMMENT ON COLUMN utxos.utxo_id IS 'The id of the UTXO';
COMMENT ON COLUMN utxos.value IS 'The value of the UTXO';
COMMENT ON COLUMN utxos.address_id IS 'The id of the address the UTXO belongs to';
COMMENT ON COLUMN utxos.is_spent IS 'Whether the UTXO has been spent';


-- Create a function that will automatically set the updated_at column to now()
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Example of how to apply this trigger to a table:
-- CREATE TRIGGER set_timestamp
-- BEFORE UPDATE ON your_table
-- FOR EACH ROW
-- EXECUTE FUNCTION update_timestamp();

-- Apply the trigger to the utxos table
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON utxos
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

ALTER TABLE utxos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own utxos" ON utxos
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM utxos
    JOIN addresses ON utxos.address_id = addresses.id
    WHERE user_owns_wallet(addresses.wallet_id)
  )
);

CREATE TYPE transaction_type AS ENUM ('send', 'receive');

CREATE TABLE transactions (
    transaction_id TEXT NOT NULL PRIMARY KEY,
    chain supported_chains NOT NULL DEFAULT 'bitcoin',
    type transaction_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    value BIGINT NOT NULL,
    confirmations INTEGER NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE transactions IS 'Transactions are created when a user sends or receives funds';
COMMENT ON COLUMN transactions.chain IS 'The chain the transaction is on';
COMMENT ON COLUMN transactions.transaction_id IS 'The transaction id';
COMMENT ON COLUMN transactions.confirmations IS 'The number of confirmations the transaction has';
COMMENT ON COLUMN transactions.confirmed_at IS 'The timestamp the transaction was confirmed';
COMMENT ON COLUMN transactions.type IS 'The type of transaction';
COMMENT ON COLUMN transactions.value IS 'The value of the transaction';

CREATE TABLE transaction_inputs (
    transaction_id TEXT NOT NULL REFERENCES transactions(transaction_id),
    utxo_id TEXT NOT NULL REFERENCES utxos(utxo_id),
    PRIMARY KEY (transaction_id, utxo_id)
);

CREATE TABLE transaction_outputs (
    transaction_id TEXT NOT NULL REFERENCES transactions(transaction_id),
    address_id INTEGER NOT NULL REFERENCES addresses(id),
    value BIGINT NOT NULL,
    PRIMARY KEY (transaction_id, address_id)
);



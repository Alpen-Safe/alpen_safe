CREATE TABLE IF NOT EXISTS utxos (
    id SERIAL PRIMARY KEY,
    utxo TEXT UNIQUE NOT NULL,
    value BIGINT NOT NULL,
    address_id INTEGER REFERENCES addresses(id),
    is_spent BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE utxos IS 'UTXOs are unspent transaction outputs';
COMMENT ON COLUMN utxos.utxo IS 'The id of the UTXO';
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
    FROM addresses 
    WHERE addresses.id = utxos.address_id 
    AND user_owns_wallet(addresses.wallet_id)
  )
);

CREATE TYPE transaction_type AS ENUM ('send', 'receive');

ALTER TABLE addresses ADD COLUMN is_used BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN addresses.is_used IS 'Whether the address has been used';

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
    utxo_id INTEGER NOT NULL REFERENCES utxos(id),
    PRIMARY KEY (transaction_id, utxo_id)
);

CREATE TABLE transaction_outputs (
    transaction_id TEXT NOT NULL REFERENCES transactions(transaction_id),
    address_id INTEGER NOT NULL REFERENCES addresses(id),
    value BIGINT NOT NULL,
    utxo_id INTEGER NOT NULL REFERENCES utxos(id),
    PRIMARY KEY (transaction_id, address_id)
);

CREATE FUNCTION received_utxo_in_monitored_address(_address TEXT, _utxo TEXT, _value BIGINT, _is_spent BOOLEAN, _confirmed BOOLEAN)
RETURNS VOID AS $$
DECLARE
    _address_id INTEGER;
BEGIN
    SELECT id INTO _address_id FROM addresses WHERE address = _address;
    IF _address_id IS NULL THEN
        RAISE EXCEPTION 'Address not found';
    END IF;

    -- only insert if the utxo is not already in the database
    INSERT INTO utxos (utxo, value, address_id, is_spent, confirmed)
    SELECT _utxo, _value, _address_id, _is_spent, _confirmed
    WHERE NOT EXISTS (
        SELECT 1 FROM utxos WHERE utxo = _utxo
    );

    -- Update confirmed flag if UTXO exists and new confirmed flag is true
    -- this is to update the mempool utxos to be confirmed
    IF _confirmed = true THEN
        UPDATE utxos 
        SET confirmed = true
        WHERE utxo = _utxo;
    END IF;


    -- Mark the address as used
    UPDATE addresses
    SET is_used = TRUE
    WHERE address = _address;

END;
$$ LANGUAGE plpgsql;
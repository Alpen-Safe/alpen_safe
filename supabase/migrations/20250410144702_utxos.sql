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

ALTER TABLE addresses ADD COLUMN is_used BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN addresses.is_used IS 'Whether the address has been used';

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL,
    chain supported_chains NOT NULL DEFAULT 'bitcoin',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    value BIGINT NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE transactions IS 'Transactions are created when a user sends or receives funds';
COMMENT ON COLUMN transactions.chain IS 'The chain the transaction is on';
COMMENT ON COLUMN transactions.transaction_id IS 'The transaction id in hex format';
COMMENT ON COLUMN transactions.confirmed IS 'Whether the transaction has been confirmed';
COMMENT ON COLUMN transactions.confirmed_at IS 'The timestamp the transaction was confirmed';
COMMENT ON COLUMN transactions.value IS 'The value of the transaction';


CREATE TABLE transaction_inputs (
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    utxo_id INTEGER NOT NULL REFERENCES utxos(id),
    PRIMARY KEY (transaction_id, utxo_id)
);

CREATE TABLE transaction_outputs (
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    utxo_id INTEGER NOT NULL REFERENCES utxos(id),
    PRIMARY KEY (transaction_id, utxo_id)
);

ALTER TABLE transaction_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction inputs" ON transaction_inputs
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM addresses a
    JOIN utxos u ON u.address_id = a.id
    WHERE u.id = transaction_inputs.utxo_id
    AND user_owns_wallet(a.wallet_id)
  )
);

CREATE POLICY "Users can view their own transaction outputs" ON transaction_outputs
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM addresses a
    JOIN utxos u ON u.address_id = a.id
    WHERE u.id = transaction_outputs.utxo_id
    AND user_owns_wallet(a.wallet_id)
  )
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions because they are inputs" ON transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM addresses a
    JOIN transaction_inputs ti ON ti.transaction_id = transactions.id
    JOIN utxos u ON u.id = ti.utxo_id
    WHERE u.address_id = a.id
    AND user_owns_wallet(a.wallet_id)
  )
);

CREATE POLICY "Users can view their own transactions because they are outputs" ON transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM addresses a
    JOIN transaction_outputs outs ON outs.transaction_id = transactions.id
    JOIN utxos u ON u.id = outs.utxo_id
    WHERE u.address_id = a.id
    AND user_owns_wallet(a.wallet_id)
  )
);


CREATE FUNCTION received_utxo_in_monitored_address(_txid TEXT, _address TEXT, _utxo TEXT, _value BIGINT, _is_spent BOOLEAN, _confirmed BOOLEAN)
RETURNS VOID AS $$
DECLARE
    _address_id INTEGER;
    _confirmed_at TIMESTAMP WITH TIME ZONE;
    _utxo_id INTEGER;
    _transaction_id INTEGER;
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

    -- Get the utxo_id
    SELECT id INTO _utxo_id FROM utxos WHERE utxo = _utxo;

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

    -- create the transaction
    IF _confirmed = true THEN
        _confirmed_at = NOW();
    ELSE
        _confirmed_at = NULL;
    END IF;

    -- create the transaction
    INSERT INTO transactions (transaction_id, chain, value, confirmed, confirmed_at)
    VALUES (_txid, 'bitcoin', _value, _confirmed, _confirmed_at)
    ON CONFLICT (transaction_id) DO NOTHING
    RETURNING id INTO _transaction_id;
    
    -- If transaction already exists, get its id
    IF _transaction_id IS NULL THEN
        SELECT id INTO _transaction_id FROM transactions WHERE transaction_id = _txid;
    END IF;

    -- update the transaction to be confirmed if it is not already confirmed
    UPDATE transactions
    SET confirmed = true, confirmed_at = _confirmed_at
    WHERE transaction_id = _txid
    AND _confirmed = true
    AND confirmed = false;

    -- create the transaction outputs
    INSERT INTO transaction_outputs (transaction_id, utxo_id)
    VALUES (_transaction_id, _utxo_id)
    ON CONFLICT (transaction_id, utxo_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;
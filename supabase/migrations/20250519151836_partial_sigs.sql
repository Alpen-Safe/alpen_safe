-- Drop the primary key constraint from partial_signatures table
ALTER TABLE partial_signatures DROP CONSTRAINT partial_signatures_pkey;

-- Add new composite primary key
ALTER TABLE partial_signatures ADD PRIMARY KEY (unsigned_tx_id, input_index, xpub_id, pubkey);

-- Create index on partial_signatures table for unsigned_tx_id column
CREATE INDEX idx_partial_signatures_unsigned_tx_id ON partial_signatures (unsigned_tx_id);

-- Create view that returns unique unsigned_tx_id and xpub_id combinations
CREATE OR REPLACE VIEW tx_signers
WITH (security_invoker=true)
AS
SELECT DISTINCT unsigned_tx_id, xpub_id
FROM partial_signatures;

CREATE POLICY "Users can view public keys for wallets they own"
ON public_keys
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_signers us
        WHERE us.public_key_id = public_keys.id
        AND user_owns_wallet(us.wallet_id)
    )
);

DROP FUNCTION IF EXISTS submit_partial_signatures;
CREATE OR REPLACE FUNCTION submit_partial_signatures(
    _unsigned_tx_id TEXT,
    _master_fingerprint TEXT,
    _partial_signatures JSONB[]
) RETURNS TABLE (
    signatures_count INTEGER,
    is_complete BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    _input_index INTEGER;
    _xpub_id INTEGER;
    _pubkey TEXT;
    _signature TEXT;
    _tapleaf_hash TEXT;
    _number_of_signatures INTEGER;
    _number_of_inputs INTEGER;
    _number_of_signers INTEGER;
    _total_signatures_count INTEGER;
    _m INTEGER;
    _partial_signature JSONB;
BEGIN
    -- Check if the unsigned transaction exists
    IF NOT EXISTS (SELECT 1 FROM unsigned_transactions WHERE id = _unsigned_tx_id) THEN
        RAISE EXCEPTION 'Unsigned transaction not found';
    END IF;
    
    SELECT id INTO _xpub_id
    FROM public_keys
    WHERE master_fingerprint = _master_fingerprint;

    IF _xpub_id IS NULL THEN
        RAISE EXCEPTION 'Public key not found';
    END IF;

    _number_of_signatures := array_length(_partial_signatures, 1);
    SELECT COUNT(*) INTO _number_of_inputs
    FROM unsigned_transaction_inputs
    WHERE unsigned_transaction_id = _unsigned_tx_id;
    
    -- Check if the number of signatures is evenly divisible by the number of inputs
    IF _number_of_signatures % _number_of_inputs != 0 THEN
        RAISE EXCEPTION 'Number of signatures (%) must be evenly divisible by number of inputs (%)', _number_of_signatures, _number_of_inputs;
    END IF;
    
    -- how many signers submitted signatures in this call
    _number_of_signers := _number_of_signatures / _number_of_inputs;

    UPDATE unsigned_transactions
    SET signatures_count = unsigned_transactions.signatures_count + _number_of_signers
    WHERE id = _unsigned_tx_id;

    -- if signatures is now equal to the number of signers, we can sign the transaction
    SELECT unsigned_transactions.signatures_count INTO _total_signatures_count
    FROM unsigned_transactions
    WHERE id = _unsigned_tx_id;

    -- get the m for the wallet
    SELECT m INTO _m
    FROM multi_sig_wallets
    WHERE id = (SELECT wallet_id FROM unsigned_transactions WHERE id = _unsigned_tx_id);

    -- if the number of signatures is now greater than or equal to m, we can complete the transaction
    IF _total_signatures_count >= _m THEN
        UPDATE unsigned_transactions
        SET is_complete = true
        WHERE id = _unsigned_tx_id;
    END IF;

    -- insert the partial signatures into the database
    FOREACH _partial_signature IN ARRAY _partial_signatures LOOP
        _input_index := (_partial_signature->>'input_index')::INTEGER;
        _signature := _partial_signature->>'signature';
        _pubkey := _partial_signature->>'pubkey';
        _tapleaf_hash := _partial_signature->>'tapleaf_hash';

        INSERT INTO partial_signatures (unsigned_tx_id, input_index, xpub_id, pubkey, signature, tapleaf_hash)
        VALUES (_unsigned_tx_id, _input_index, _xpub_id, _pubkey, _signature, _tapleaf_hash);
    END LOOP;

    RETURN QUERY SELECT _total_signatures_count, unsigned_transactions.is_complete FROM unsigned_transactions WHERE id = _unsigned_tx_id;
END;
$$;
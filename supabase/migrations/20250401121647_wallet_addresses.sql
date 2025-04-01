CREATE INDEX ON addresses (wallet_id);

CREATE UNIQUE INDEX ON addresses (wallet_id,address_index, change);

CREATE UNIQUE INDEX ON addresses (address);

CREATE FUNCTION create_addresses(
    _wallet_id UUID,
    _addresses JSONB
) RETURNS void AS $$
DECLARE
    _address JSONB;
BEGIN
    FOR _address IN SELECT * FROM jsonb_array_elements(_addresses)
    LOOP
        INSERT INTO addresses (wallet_id, address, address_index, change)
        VALUES (
            _wallet_id, 
            _address->>'address', 
            (_address->>'address_index')::int, 
            (_address->>'change')::boolean
        )
        ON CONFLICT (address) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


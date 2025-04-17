ALTER TABLE addresses ADD COLUMN handed_out BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN addresses.handed_out IS 'Whether the address has been handed out';

CREATE OR REPLACE FUNCTION handout_addresses(_wallet_id UUID, _is_change BOOLEAN DEFAULT FALSE, _amount INTEGER DEFAULT 1)
RETURNS TABLE (address TEXT, address_index INTEGER, change BOOLEAN) AS $$
DECLARE
  _address_ids INTEGER[];
  _found_count INTEGER;
BEGIN
  SELECT ARRAY_AGG(subq.id)
  INTO _address_ids
  FROM (
    SELECT a.id
    FROM addresses a
    WHERE a.wallet_id = _wallet_id 
    AND a.change = _is_change 
    AND a.handed_out = FALSE
    AND a.is_used = FALSE
    ORDER BY a.address_index ASC
    LIMIT _amount
  ) subq;
  
  SELECT COUNT(*) INTO _found_count 
  FROM UNNEST(_address_ids) AS ids
  WHERE ids IS NOT NULL;
  
  IF _found_count < _amount THEN
    RAISE EXCEPTION 'Not enough addresses available. Requested: %, Found: %', _amount, _found_count;
  END IF;

  UPDATE addresses SET handed_out = TRUE WHERE id = ANY(_address_ids);

  RETURN QUERY
  SELECT a.address, a.address_index, a.change
  FROM addresses a
  WHERE a.id = ANY(_address_ids);
END;
$$ LANGUAGE plpgsql;

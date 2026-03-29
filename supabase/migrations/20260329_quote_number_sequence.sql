-- Atomically generate the next sequential quote number.
-- Prevents race conditions when two quotes are created simultaneously.
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num integer;
  year_str text;
BEGIN
  year_str := to_char(now(), 'YYYY');

  -- Lock the quotes table briefly to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('generate_quote_number'));

  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(quote_number FROM 'QT-' || year_str || '-(\d+)')
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO next_num
  FROM quotes
  WHERE quote_number LIKE 'QT-' || year_str || '-%';

  RETURN 'QT-' || year_str || '-' || LPAD(next_num::text, 4, '0');
END;
$$;

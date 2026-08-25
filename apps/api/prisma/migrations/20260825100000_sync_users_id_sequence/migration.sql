-- Keep the users identity sequence ahead of existing manually imported rows.
DO $$
DECLARE
  sequence_name text := pg_get_serial_sequence('users', 'id');
  maximum_id bigint;
BEGIN
  SELECT MAX(id) INTO maximum_id FROM users;

  IF maximum_id IS NULL THEN
    PERFORM setval(sequence_name::regclass, 1, false);
  ELSE
    PERFORM setval(sequence_name::regclass, maximum_id, true);
  END IF;
END $$;

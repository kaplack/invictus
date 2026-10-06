-- Only inactive personal Yape/Plin methods may retain incomplete draft data.
DO $$ DECLARE item RECORD; BEGIN
 FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='team_payment_methods'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%phone IS NOT NULL%' AND pg_get_constraintdef(oid) LIKE '%holder_name IS NOT NULL%' LOOP
  EXECUTE format('ALTER TABLE team_payment_methods DROP CONSTRAINT %I',item.conname);
 END LOOP;
END $$;
ALTER TABLE team_payment_methods ADD CONSTRAINT personal_mobile_draft_or_complete CHECK (type NOT IN ('YAPE','PLIN') OR (phone IS NOT NULL AND holder_name IS NOT NULL AND currency='PEN') OR (team_id IS NULL AND event_id IS NOT NULL AND active=false AND currency='PEN'));

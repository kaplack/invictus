-- Preserve all existing events; a draft can have no date yet.
ALTER TABLE events ALTER COLUMN starts_at DROP NOT NULL;
ALTER TABLE events ADD CONSTRAINT events_public_date_required CHECK (status = 'DRAFT' OR starts_at IS NOT NULL);

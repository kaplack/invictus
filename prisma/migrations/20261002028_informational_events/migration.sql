ALTER TABLE events
 ADD COLUMN mode VARCHAR(20) NOT NULL DEFAULT 'MANAGED',
 ADD COLUMN public_organizer_name VARCHAR(160),
 ADD COLUMN external_url VARCHAR(2048),
 ADD CONSTRAINT events_mode_check CHECK (mode IN ('MANAGED','INFORMATIONAL')),
 ADD CONSTRAINT events_informational_team_check CHECK (mode <> 'INFORMATIONAL' OR team_id IS NULL);

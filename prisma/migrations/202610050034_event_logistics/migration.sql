ALTER TABLE events
 ADD COLUMN meeting_at timestamptz(6), ADD COLUMN meeting_venue varchar(500),
 ADD COLUMN kit_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN kit_starts_at timestamptz(6), ADD COLUMN kit_ends_at timestamptz(6),
 ADD COLUMN kit_venue varchar(500), ADD COLUMN kit_address varchar(500),
 ADD COLUMN route_image_file_id uuid REFERENCES stored_files(id) ON DELETE RESTRICT,
 ADD CONSTRAINT events_kit_time_order CHECK (kit_starts_at IS NULL OR kit_ends_at IS NULL OR kit_ends_at > kit_starts_at);

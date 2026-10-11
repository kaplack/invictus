ALTER TABLE events ADD COLUMN rules_file_id uuid REFERENCES stored_files(id) ON DELETE RESTRICT;
CREATE INDEX events_rules_file_id_idx ON events(rules_file_id);

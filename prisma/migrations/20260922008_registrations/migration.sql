CREATE TABLE event_registrations (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events(id),
  user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('PENDING','PENDING_REVIEW','CONFIRMED','REJECTED','CANCELLED','COMPLETED')),
  payment_instructions_snapshot jsonb,
  proof_file_id uuid REFERENCES stored_files(id),
  participation_code text UNIQUE, participation_qr_data_url text,
  profile_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,user_id)
);
CREATE INDEX event_registrations_event_status_idx ON event_registrations(event_id,status);


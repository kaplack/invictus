ALTER TABLE event_registrations ALTER COLUMN user_id DROP NOT NULL, ADD COLUMN guest_access_hash CHAR(64);
CREATE UNIQUE INDEX event_registrations_guest_access_hash_key ON event_registrations(guest_access_hash);
ALTER TABLE event_registrations ADD CONSTRAINT registration_identity_check CHECK ((user_id IS NOT NULL AND guest_access_hash IS NULL) OR (user_id IS NULL AND guest_access_hash IS NOT NULL));
ALTER TABLE stored_files ALTER COLUMN owner_id DROP NOT NULL, ADD COLUMN guest_access_hash CHAR(64);
ALTER TABLE stored_files ADD CONSTRAINT file_identity_check CHECK ((owner_id IS NOT NULL AND guest_access_hash IS NULL) OR (owner_id IS NULL AND guest_access_hash IS NOT NULL AND visibility = 'private'));
ALTER TABLE payment_operations ALTER COLUMN payer_id DROP NOT NULL;
ALTER TABLE payment_operations ADD CONSTRAINT guest_payment_source_check CHECK (payer_id IS NOT NULL OR source_type = 'registration');
ALTER TABLE registration_audits ALTER COLUMN actor_id DROP NOT NULL;

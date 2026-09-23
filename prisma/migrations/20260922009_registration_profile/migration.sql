ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES participant_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE;

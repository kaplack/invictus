-- Extend existing accounts; preserve Team rows and historical composite foreign keys.
ALTER TABLE team_payment_methods ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE team_payment_methods ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE team_payment_methods ADD CONSTRAINT payment_method_scope_check CHECK ((team_id IS NOT NULL) <> (event_id IS NOT NULL));
ALTER TABLE team_payment_methods ADD CONSTRAINT personal_method_type_check CHECK (event_id IS NULL OR type IN ('YAPE','PLIN'));
CREATE INDEX team_payment_methods_event_id_active_idx ON team_payment_methods(event_id,active);
ALTER TABLE event_payment_methods ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE event_payment_methods ADD CONSTRAINT event_payment_methods_event_id_fkey FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE event_payment_methods ADD CONSTRAINT event_payment_methods_method_id_fkey FOREIGN KEY(method_id) REFERENCES team_payment_methods(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
-- Null Team values must not bypass method/event ownership checks.
CREATE FUNCTION check_event_payment_method_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_team UUID; method_team UUID; method_event UUID;
BEGIN
 SELECT team_id INTO event_team FROM events WHERE id=NEW.event_id;
 SELECT team_id,event_id INTO method_team,method_event FROM team_payment_methods WHERE id=NEW.method_id;
 IF NEW.team_id IS DISTINCT FROM event_team OR
    (event_team IS NULL AND (method_team IS NOT NULL OR method_event IS DISTINCT FROM NEW.event_id)) OR
    (event_team IS NOT NULL AND (method_team IS DISTINCT FROM event_team OR method_event IS NOT NULL)) THEN
   RAISE EXCEPTION 'Payment method belongs to a different event or Team' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER event_payment_method_scope BEFORE INSERT OR UPDATE ON event_payment_methods FOR EACH ROW EXECUTE FUNCTION check_event_payment_method_scope();

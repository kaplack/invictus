ALTER TABLE events ADD COLUMN competitor_sequence integer NOT NULL DEFAULT 0 CHECK (competitor_sequence >= 0);
ALTER TABLE event_registrations ADD COLUMN competitor_number integer CHECK (competitor_number > 0);
-- Existing accepted competitors receive stable numbers ordered by their first acceptance.
WITH accepted AS (
 SELECT r.id, row_number() OVER (PARTITION BY r.event_id ORDER BY coalesce(a.accepted_at,r.created_at),r.id) AS number
 FROM event_registrations r
 LEFT JOIN (SELECT registration_id,min(created_at) AS accepted_at FROM registration_audits WHERE to_status='CONFIRMED' GROUP BY registration_id) a ON a.registration_id=r.id
 WHERE r.status IN ('CONFIRMED','COMPLETED')
)
UPDATE event_registrations r SET competitor_number=a.number FROM accepted a WHERE r.id=a.id;
UPDATE events e SET competitor_sequence=counts.last_number FROM (SELECT event_id,max(competitor_number) AS last_number FROM event_registrations WHERE competitor_number IS NOT NULL GROUP BY event_id) counts WHERE e.id=counts.event_id;
CREATE UNIQUE INDEX event_registrations_event_id_competitor_number_key ON event_registrations(event_id,competitor_number);
-- Updating the event counter locks one event, serializing concurrent acceptances.
-- Keep assigned numbers after cancellation; the counter never goes backwards.
CREATE FUNCTION invictus_assign_competitor_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.competitor_number IS NOT NULL AND NEW.competitor_number IS DISTINCT FROM OLD.competitor_number THEN
  RAISE EXCEPTION 'El número de competidor no se modifica';
 END IF;
 IF NEW.status='CONFIRMED' AND NEW.competitor_number IS NULL THEN
  UPDATE events SET competitor_sequence=competitor_sequence+1 WHERE id=NEW.event_id RETURNING competitor_sequence INTO NEW.competitor_number;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER assign_competitor_number BEFORE INSERT OR UPDATE ON event_registrations FOR EACH ROW EXECUTE FUNCTION invictus_assign_competitor_number();

-- Separate from participation/check-in codes; available before payment review.
CREATE FUNCTION invictus_registration_code() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'INV-' || substr(code,1,4) || '-' || substr(code,5,4) || '-' || substr(code,9,4) || '-' || substr(code,13,4)
  FROM (SELECT translate(upper(substr(md5(random()::text || random()::text || clock_timestamp()::text),1,16)), '01', 'GH') AS code) s;
$$;
ALTER TABLE event_registrations ADD COLUMN registration_code varchar(23) NOT NULL DEFAULT invictus_registration_code();
CREATE UNIQUE INDEX event_registrations_registration_code_key ON event_registrations(registration_code);

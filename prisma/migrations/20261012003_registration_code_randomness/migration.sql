-- Use PostgreSQL's cryptographic UUID source for public lookup codes.
CREATE OR REPLACE FUNCTION invictus_registration_code() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'INV-' || substr(code,1,4) || '-' || substr(code,5,4) || '-' || substr(code,9,4) || '-' || substr(code,13,4)
  FROM (SELECT translate(upper(substr(md5(gen_random_uuid()::text),1,16)), '01', 'GH') AS code) s;
$$;

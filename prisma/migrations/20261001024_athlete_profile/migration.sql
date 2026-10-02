CREATE TYPE "ProfileGender" AS ENUM ('MALE','FEMALE','NON_BINARY','SELF_DESCRIBED','PREFER_NOT_TO_SAY');
CREATE TYPE "IdentityDocumentType" AS ENUM ('DNI','FOREIGN_RESIDENT_CARD','PASSPORT');
ALTER TABLE participant_profiles
  ADD COLUMN name VARCHAR(80),
  ADD COLUMN last_name VARCHAR(120),
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN gender "ProfileGender",
  ADD COLUMN document_type "IdentityDocumentType",
  ADD COLUMN document_number VARCHAR(30),
  ADD COLUMN phone VARCHAR(16),
  ADD COLUMN country_code CHAR(2),
  ADD COLUMN department VARCHAR(120),
  ADD COLUMN province VARCHAR(120),
  ADD COLUMN district VARCHAR(120),
  ADD COLUMN ubigeo_code CHAR(6),
  ADD COLUMN banner_file_id UUID REFERENCES stored_files(id) ON DELETE RESTRICT ON UPDATE CASCADE;
-- Copy known names verbatim. Do not guess names from public_name or a district from location.
UPDATE participant_profiles p SET name = NULLIF(u.name,''), last_name = NULLIF(u.last_name,'')
FROM users u WHERE u.id = p.user_id;
ALTER TABLE participant_profiles
  ADD CONSTRAINT profile_phone_format CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{6,14}$'),
  ADD CONSTRAINT profile_ubigeo_format CHECK (ubigeo_code IS NULL OR (country_code = 'PE' AND ubigeo_code ~ '^[0-9]{6}$')),
  ADD CONSTRAINT profile_document_format CHECK (document_number IS NULL OR
    (document_type IS NOT NULL AND (document_type <> 'DNI' OR document_number ~ '^[0-9]{8}$')));

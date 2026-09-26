CREATE UNIQUE INDEX event_categories_id_event_id_key ON event_categories(id,event_id);
ALTER TABLE event_registrations
 ADD COLUMN category_id UUID,
 ADD COLUMN method_id UUID REFERENCES team_payment_methods(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD COLUMN category_snapshot JSONB,
 ADD COLUMN participant_snapshot JSONB,
 ADD COLUMN amount_cents INTEGER CHECK(amount_cents >= 0),
 ADD COLUMN currency CHAR(3),
 ADD COLUMN review_note VARCHAR(300),
 ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
 ADD CONSTRAINT event_registrations_category_id_event_id_fkey FOREIGN KEY(category_id,event_id) REFERENCES event_categories(id,event_id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX event_registrations_category_id_status_idx ON event_registrations(category_id,status);
ALTER TABLE event_registrations DROP CONSTRAINT event_registrations_status_check;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_status_check CHECK(status IN ('PENDING','PENDING_REVIEW','OBSERVED','CONFIRMED','REJECTED','CANCELLED','COMPLETED'));
CREATE TABLE registration_audits (
 id UUID PRIMARY KEY,
 registration_id UUID NOT NULL REFERENCES event_registrations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 from_status TEXT, to_status TEXT NOT NULL, note VARCHAR(300), participant_snapshot JSONB,
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX registration_audits_registration_id_created_at_idx ON registration_audits(registration_id,created_at);

-- Extend existing payment attempts/results; preserve every historical row and decision.
ALTER TABLE manual_payments DROP CONSTRAINT manual_payments_method_check,
 DROP CONSTRAINT manual_payments_status_check, DROP CONSTRAINT manual_payments_check,
 DROP CONSTRAINT manual_payments_check1, DROP CONSTRAINT manual_payments_check2;
ALTER TABLE manual_payments
 ADD CONSTRAINT manual_payments_method_check CHECK(method IN ('cash','yape','plin','transfer')),
 ADD CONSTRAINT manual_payments_status_check CHECK(status IN ('pending','pending_review','verified','rejected','observed')),
 ADD CONSTRAINT manual_payments_check CHECK(method='cash' OR (proof_file_id IS NOT NULL AND status<>'pending')),
 ADD CONSTRAINT manual_payments_check1 CHECK((status IN ('verified','rejected','observed') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL) OR (status IN ('pending','pending_review') AND reviewed_at IS NULL AND reviewed_by IS NULL)),
 ADD CONSTRAINT manual_payments_check2 CHECK(status NOT IN ('rejected','observed') OR (rejection_reason IS NOT NULL AND length(trim(rejection_reason))>0));
DROP INDEX manual_payments_one_active;
CREATE UNIQUE INDEX manual_payments_one_active ON manual_payments(operation_id) WHERE status NOT IN ('rejected','observed');
ALTER TABLE payment_results DROP CONSTRAINT payment_results_status_check;
ALTER TABLE payment_results ADD CONSTRAINT payment_results_status_check CHECK(status IN ('verified','rejected','observed'));

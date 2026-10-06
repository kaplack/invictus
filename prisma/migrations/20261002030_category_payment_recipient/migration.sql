-- Category-priced events have general amount 0 but still need a payment recipient.
-- Preserve the requirement for a recipient when the general event price is positive.
ALTER TABLE event_registration_config DROP CONSTRAINT event_registration_config_check;
ALTER TABLE event_registration_config ADD CONSTRAINT event_registration_config_check CHECK (amount_cents = 0 OR payment_recipient_id IS NOT NULL);

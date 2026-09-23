CREATE TABLE event_registration_config (
  event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 0 AND 2000000000),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  max_capacity integer CHECK (max_capacity > 0),
  payment_recipient_id uuid,
  CHECK ((amount_cents = 0 AND payment_recipient_id IS NULL) OR (amount_cents > 0 AND payment_recipient_id IS NOT NULL))
);

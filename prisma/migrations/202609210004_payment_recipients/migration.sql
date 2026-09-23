CREATE TABLE payment_recipients (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(9) CHECK (phone IS NULL OR phone ~ '^9[0-9]{8}$'),
  holder VARCHAR(120),
  qr_file_id UUID REFERENCES stored_files(id) ON DELETE RESTRICT
);
CREATE TABLE recipient_members (
  recipient_id UUID NOT NULL REFERENCES payment_recipients(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  manage BOOLEAN NOT NULL DEFAULT false,
  review BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (recipient_id, user_id)
);
CREATE TABLE payment_operations (
  id UUID PRIMARY KEY,
  source_type VARCHAR(40) NOT NULL,
  source_id VARCHAR(100) NOT NULL,
  payer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES payment_recipients(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency CHAR(3) NOT NULL,
  instructions JSONB NOT NULL,
  qr_file_id UUID REFERENCES stored_files(id) ON DELETE RESTRICT,
  accepting_payments BOOLEAN NOT NULL DEFAULT true,
  accepting_reviews BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX payment_operations_source_type_source_id_key ON payment_operations(source_type, source_id);
CREATE INDEX payment_operations_recipient_id_created_at_idx ON payment_operations(recipient_id, created_at);
CREATE INDEX payment_operations_payer_id_created_at_idx ON payment_operations(payer_id, created_at);

-- Destinatario histórico: no inventar un número, titular o QR para pagos anteriores.
INSERT INTO payment_recipients (id, name) VALUES ('10000000-0000-4000-8000-000000000001', 'Tienda (configurar)');
INSERT INTO payment_operations (id, source_type, source_id, payer_id, recipient_id, amount_cents, currency, instructions, accepting_payments, accepting_reviews, created_at)
SELECT id, 'order', id::text, owner_id, '10000000-0000-4000-8000-000000000001', total_cents, currency,
  '{"recipientName":"Tienda (histórico)","phone":null,"holder":null,"qrFileId":null,"legacy":true}'::jsonb,
  status NOT IN ('completed','cancelled'), status <> 'cancelled', created_at FROM commerce_orders;

ALTER TABLE manual_payments DROP CONSTRAINT manual_payments_order_id_fkey;
ALTER TABLE manual_payments RENAME COLUMN order_id TO operation_id;
ALTER TABLE manual_payments ADD CONSTRAINT manual_payments_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES payment_operations(id) ON DELETE RESTRICT;
ALTER INDEX manual_payments_order_id_created_at_idx RENAME TO manual_payments_operation_id_created_at_idx;
-- El índice parcial manual_payments_one_active ahora apunta a operation_id tras el rename.
CREATE TABLE payment_results (
  payment_id UUID PRIMARY KEY REFERENCES manual_payments(id) ON DELETE RESTRICT,
  operation_id UUID NOT NULL REFERENCES payment_operations(id) ON DELETE RESTRICT,
  source_type VARCHAR(40) NOT NULL,
  source_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('verified','rejected')),
  reviewed_at TIMESTAMP(3) NOT NULL,
  reviewed_by UUID NOT NULL,
  rejection_reason VARCHAR(300)
);
-- Se preservan decisiones históricas; la migración no dispara callbacks del anfitrión.
INSERT INTO payment_results (payment_id, operation_id, source_type, source_id, status, reviewed_at, reviewed_by, rejection_reason)
SELECT id, operation_id, 'order', operation_id::text, status, reviewed_at, reviewed_by, rejection_reason
FROM manual_payments WHERE status IN ('verified','rejected');

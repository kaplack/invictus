CREATE TABLE commerce_checkouts (
  owner_id uuid NOT NULL,
  key varchar(100) NOT NULL,
  request_hash char(64) NOT NULL,
  order_id uuid NOT NULL UNIQUE REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  PRIMARY KEY(owner_id, key)
);

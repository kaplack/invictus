-- Migración aditiva para la tienda. Ejecutar después de usuarios/sesiones.
CREATE TABLE shop_categories (id uuid PRIMARY KEY, name varchar(120) NOT NULL UNIQUE, slug varchar(140) NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE shop_products (id uuid PRIMARY KEY, category_id uuid REFERENCES shop_categories(id) ON DELETE SET NULL, name varchar(180) NOT NULL, description text NOT NULL, image_file_id uuid REFERENCES stored_files(id) ON DELETE SET NULL, price_cents integer NOT NULL CHECK (price_cents >= 0), published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE shop_variants (id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE, name varchar(160) NOT NULL, sku varchar(80) NOT NULL UNIQUE, price_cents integer NOT NULL CHECK (price_cents >= 0), stock integer NOT NULL CHECK (stock >= 0), position integer NOT NULL DEFAULT 0);
CREATE TABLE shop_carts (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE SET NULL, items jsonb NOT NULL, total_cents integer NOT NULL CHECK (total_cents >= 0), currency char(3) NOT NULL DEFAULT 'PEN', updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX shop_products_catalog_idx ON shop_products (published, category_id);


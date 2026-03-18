-- Dual pricing: web price vs yard/POS price
-- price_per_unit_cents = yard/POS price (existing, the "real" price)
-- web_price_per_unit_cents = online store price (higher, null = use yard price)
ALTER TABLE products ADD COLUMN IF NOT EXISTS web_price_per_unit_cents integer;

-- Saved carts for "save for later" / abandoned cart follow-up
CREATE TABLE IF NOT EXISTS saved_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  items jsonb NOT NULL DEFAULT '[]',
  delivery_method text DEFAULT 'delivery',
  delivery_address text,
  customer_name text,
  customer_email text,
  customer_phone text,
  source text DEFAULT 'web',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restored', 'converted', 'expired')),
  followup_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_saved_carts_token ON saved_carts(token);
CREATE INDEX IF NOT EXISTS idx_saved_carts_status ON saved_carts(status);

-- POS: license photo for fraud prevention
ALTER TABLE orders ADD COLUMN IF NOT EXISTS license_photo_url text;

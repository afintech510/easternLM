-- Half-yard pricing: per-product adder when POS order qty includes .5

-- Products: configurable per product
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS half_yard_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS half_yard_adder_cents integer DEFAULT 0;

-- Order items: record the adder that was charged
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS half_yard_adder_cents integer DEFAULT 0;

-- Enable for all bulk products with a default $5.00 adder
UPDATE products
SET half_yard_enabled = true,
    half_yard_adder_cents = 500
WHERE delivery_type = 'bulk';

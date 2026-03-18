-- Inventory tracking for products
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty numeric(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold numeric(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_unit text DEFAULT 'yard';

-- Inventory adjustment log
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  adjustment_qty numeric(10,2) NOT NULL,
  new_qty numeric(10,2) NOT NULL,
  reason text NOT NULL CHECK (reason IN ('received', 'sold', 'manual', 'damaged', 'count')),
  reference_id text,
  notes text,
  staff_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_adj_product ON inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adj_created ON inventory_adjustments(created_at DESC);

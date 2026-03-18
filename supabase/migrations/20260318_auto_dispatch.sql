-- Phase 8 AI Dispatch integration columns
ALTER TABLE delivery_assignments
  ADD COLUMN IF NOT EXISTS suggested_route_order integer,
  ADD COLUMN IF NOT EXISTS backhaul_supplier_id uuid REFERENCES suppliers(id),
  ADD COLUMN IF NOT EXISTS backhaul_material text,
  ADD COLUMN IF NOT EXISTS backhaul_yards numeric(10,2),
  ADD COLUMN IF NOT EXISTS auto_scheduled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS optimization_notes text;

-- Expand order status to support full lifecycle
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'paid', 'confirmed', 'processing',
    'scheduled', 'ready', 'picked_up',
    'delivered', 'completed', 'cancelled', 'refunded'
  ));

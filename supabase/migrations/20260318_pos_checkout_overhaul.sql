-- POS checkout overhaul: payments, refunds, split, quote types

-- Payment method constraint (add paylink, keep split/pending)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN (
    'card_online', 'card_terminal', 'cash', 'check',
    'account', 'cod', 'split', 'paylink', 'pending'
  ));

-- Refunds column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunds jsonb DEFAULT '[]'::jsonb;

-- Order status (add refunded, partially_refunded, pending_payment)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'pending_payment', 'confirmed', 'paid',
    'processing', 'scheduled', 'ready', 'picked_up',
    'delivered', 'completed', 'cancelled',
    'refunded', 'partially_refunded'
  ));

-- Quotes: add type, cc_surcharge, delivery fields, source
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS type text DEFAULT 'service';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cc_surcharge_cents integer DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_fee_cents integer DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_loads jsonb;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS source text DEFAULT 'admin';

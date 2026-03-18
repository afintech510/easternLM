-- Split payment support
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payments jsonb;

-- Expand payment_method for split + pending
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('card_online', 'card_terminal', 'cash', 'check', 'account', 'cod', 'split', 'pending'));

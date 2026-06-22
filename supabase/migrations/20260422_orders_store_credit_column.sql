-- Allow store_credit payment methods in orders CHECK constraint
-- The POS checkout sends payment_method = 'store_credit' or 'split_store_credit_cash' / 'split_store_credit_card_terminal'
-- but the constraint only allowed the original set of methods.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method = ANY(ARRAY[
    'card_online'::text,
    'card_terminal'::text,
    'cash'::text,
    'check'::text,
    'account'::text,
    'cod'::text,
    'split'::text,
    'paylink'::text,
    'pending'::text,
    'store_credit'::text,
    'split_store_credit_cash'::text,
    'split_store_credit_card_terminal'::text
  ]));

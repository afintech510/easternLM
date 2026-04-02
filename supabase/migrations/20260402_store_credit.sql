-- Store Credit System: credit balance on customers + audit ledger + atomic RPC

-- 1. Add credit balance to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS credit_balance_cents INTEGER NOT NULL DEFAULT 0;

-- 2. Create credit ledger for full audit trail
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('prepayment', 'return_credit', 'redemption', 'manual_adjustment', 'refund_to_credit')),
  amount_cents INTEGER NOT NULL, -- positive = credit added, negative = credit used
  balance_after_cents INTEGER NOT NULL,
  note TEXT,
  stripe_payment_intent_id TEXT,
  created_by TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index for fast lookup
CREATE INDEX IF NOT EXISTS credit_ledger_customer_id_idx ON credit_ledger(customer_id);
CREATE INDEX IF NOT EXISTS credit_ledger_created_at_idx ON credit_ledger(created_at DESC);

-- 4. RLS: service role bypasses
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_ledger_service_role" ON credit_ledger
  USING (true) WITH CHECK (true);

-- 5. Atomic RPC for posting credit (add or deduct)
CREATE OR REPLACE FUNCTION post_credit(
  p_customer_id UUID,
  p_amount_cents INTEGER,
  p_type TEXT,
  p_note TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT 'staff',
  p_order_id UUID DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
) RETURNS credit_ledger AS $$
DECLARE
  new_balance INTEGER;
  ledger_row credit_ledger;
BEGIN
  -- Lock row to prevent race conditions
  SELECT credit_balance_cents INTO new_balance
    FROM customers WHERE id = p_customer_id FOR UPDATE;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  new_balance := new_balance + p_amount_cents;

  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient credit balance';
  END IF;

  UPDATE customers SET credit_balance_cents = new_balance WHERE id = p_customer_id;

  INSERT INTO credit_ledger (customer_id, order_id, type, amount_cents, balance_after_cents, note, stripe_payment_intent_id, created_by)
  VALUES (p_customer_id, p_order_id, p_type, p_amount_cents, new_balance, p_note, p_stripe_payment_intent_id, p_created_by)
  RETURNING * INTO ledger_row;

  RETURN ledger_row;
END;
$$ LANGUAGE plpgsql;

-- 6. Helper: sum all positive credit balances
CREATE OR REPLACE FUNCTION sum_credit_balances()
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(credit_balance_cents), 0)::INTEGER
    FROM customers
   WHERE credit_balance_cents > 0;
$$ LANGUAGE sql STABLE;

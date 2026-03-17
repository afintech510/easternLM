-- Extend customers table for charge accounts
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_charge_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS charge_account_name text,
  ADD COLUMN IF NOT EXISTS credit_limit_cents integer,
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS current_balance_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_statement_date date;

CREATE INDEX IF NOT EXISTS idx_customers_charge_account ON public.customers(is_charge_account) WHERE is_charge_account = true;

-- Statements table
CREATE TABLE IF NOT EXISTS public.statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  statement_number text NOT NULL UNIQUE,

  customer_id uuid NOT NULL REFERENCES public.customers(id),

  -- Period
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Summary
  previous_balance_cents integer NOT NULL DEFAULT 0,
  charges_cents integer NOT NULL DEFAULT 0,
  payments_cents integer NOT NULL DEFAULT 0,
  adjustments_cents integer NOT NULL DEFAULT 0,
  balance_due_cents integer NOT NULL DEFAULT 0,
  due_date date NOT NULL,

  -- Orders included
  order_ids uuid[] NOT NULL DEFAULT '{}',

  -- Delivery
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'partial_paid', 'paid', 'overdue', 'disputed')),
  sent_at timestamptz,
  sent_via text[],
  viewed_at timestamptz,

  -- Payment
  payment_stripe_id text,
  paid_at timestamptz,
  payment_method text,
  payment_reference text,
  amount_paid_cents integer NOT NULL DEFAULT 0,

  -- Meta
  created_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_statements_customer ON public.statements(customer_id);
CREATE INDEX IF NOT EXISTS idx_statements_period ON public.statements(period_end);
CREATE INDEX IF NOT EXISTS idx_statements_status ON public.statements(status);
CREATE INDEX IF NOT EXISTS idx_statements_token ON public.statements(public_token);

ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON public.statements FOR ALL USING (true);

-- Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  quote_number text NOT NULL UNIQUE,

  -- Customer
  customer_id uuid REFERENCES public.customers(id),
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  customer_address text,

  -- Quote content
  title text NOT NULL,
  description text,
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,

  -- Terms
  deposit_required_cents integer NOT NULL DEFAULT 0,
  deposit_paid_cents integer NOT NULL DEFAULT 0,
  valid_until date,
  estimated_timeline text,
  terms text,
  internal_notes text,

  -- Status
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted')),
  sent_at timestamptz,
  sent_via text[],
  viewed_at timestamptz,
  accepted_at timestamptz,
  customer_signature_url text,
  declined_at timestamptz,
  decline_reason text,

  -- Deposit payment
  deposit_stripe_payment_id text,
  deposit_paid_at timestamptz,

  -- Conversion
  converted_order_id uuid REFERENCES public.orders(id),

  -- AI generation
  ai_prompt text,
  ai_generated boolean NOT NULL DEFAULT false,

  -- Meta
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_token ON public.quotes(public_token);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON public.quotes(created_at DESC);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON public.quotes FOR ALL USING (true);

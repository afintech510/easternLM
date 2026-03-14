-- Customers table: consolidated from WooCommerce order data
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,  -- normalized 10-digit, e.g. '6318481174'
  first_name text,
  last_name text,
  company_name text,
  address text,
  city text,
  state text DEFAULT 'NY',
  zip text,
  source text NOT NULL DEFAULT 'wc_import',
  tags text[] NOT NULL DEFAULT '{}',
  total_orders integer NOT NULL DEFAULT 0,
  total_spent_cents integer NOT NULL DEFAULT 0,
  first_order_at timestamptz,
  last_order_at timestamptz,
  notes text,
  opted_in_email boolean NOT NULL DEFAULT false,
  opted_in_sms boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Phone is the primary lookup key for yard staff
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone
  ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email
  ON public.customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_address
  ON public.customers USING gin(to_tsvector('english', COALESCE(address, '') || ' ' || COALESCE(city, '')));
CREATE INDEX IF NOT EXISTS idx_customers_name
  ON public.customers USING gin(to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')));

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Order history: one row per WooCommerce order
CREATE TABLE IF NOT EXISTS public.order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_order_id integer UNIQUE NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  order_date timestamptz NOT NULL,
  status text,
  payment_method text,
  order_total_cents integer,
  delivery_address text,
  delivery_city text,
  delivery_zip text,
  delivery_notes text,
  items jsonb NOT NULL DEFAULT '[]',
  raw_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_history_customer
  ON public.order_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_history_date
  ON public.order_history(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_history_address
  ON public.order_history USING gin(to_tsvector('english', COALESCE(delivery_address, '')));

-- RLS: admin-only access
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_admin_all ON public.customers
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY order_history_admin_all ON public.order_history
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
  );

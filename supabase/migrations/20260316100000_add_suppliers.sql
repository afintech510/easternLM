-- Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  contact_name text,
  phone text,
  email text,
  website text,
  address text NOT NULL,
  city text,
  state text DEFAULT 'NY',
  zip text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  fulfillment_type text NOT NULL DEFAULT 'both'
    CHECK (fulfillment_type IN ('pickup', 'delivery', 'both')),
  delivery_fee_notes text,
  minimum_order_notes text,
  hours jsonb NOT NULL DEFAULT '{}',
  days_closed text[] NOT NULL DEFAULT '{}',
  payment_terms text,
  account_number text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Supplier products table
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_product_name text NOT NULL,
  supplier_sku text,
  cost_per_unit_cents integer NOT NULL,
  unit text NOT NULL,
  our_price_per_unit_cents integer,
  is_available boolean NOT NULL DEFAULT true,
  lead_time_days integer,
  minimum_order_qty numeric(10,2),
  last_price_update timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_supplier ON public.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sp_product ON public.supplier_products(product_id);

-- Price history table
CREATE TABLE IF NOT EXISTS public.supplier_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id uuid NOT NULL
    REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  old_cost_cents integer NOT NULL,
  new_cost_cents integer NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'manual'
    CHECK (source IN ('manual', 'invoice_ocr', 'import'))
);

-- Triggers
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_supplier_products_updated_at BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_admin ON public.suppliers FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY supplier_products_admin ON public.supplier_products FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY supplier_price_history_admin ON public.supplier_price_history FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);

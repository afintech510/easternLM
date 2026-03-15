-- POS columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'card_online',
  ADD COLUMN IF NOT EXISTS pos_staff_id uuid REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS pos_register_id text;

-- Held orders table
CREATE TABLE IF NOT EXISTS public.held_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.accounts(id),
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]',
  delivery_method text NOT NULL DEFAULT 'pickup',
  delivery_address text,
  delivery_fee_cents integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_held_orders_staff ON public.held_orders(staff_id);

ALTER TABLE public.held_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY held_orders_staff ON public.held_orders FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

-- Quick products config (stored in site_settings as JSON)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS pos_quick_product_slugs text[] NOT NULL DEFAULT '{}'::text[];

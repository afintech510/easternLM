-- Bulk App schema additions
-- Adds variable pricing + bulk-app fields to products, size variants table, order tracking

-- ── Products: variable pricing + bulk-app fields ─────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ceiling_price_cents integer,
  ADD COLUMN IF NOT EXISTS floor_price_cents integer,
  ADD COLUMN IF NOT EXISTS floor_qty integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS is_bulk_app_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_level text DEFAULT 'in_stock'
    CHECK (stock_level IN ('in_stock', 'low_stock', 'out_of_stock')),
  ADD COLUMN IF NOT EXISTS default_depth_inches integer DEFAULT 3;

-- ── Product size variants (3/8" vs 3/4" gravel) ─────────────────
CREATE TABLE IF NOT EXISTS public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL,
  slug text NOT NULL,
  price_delta_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON public.product_sizes(product_id);

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on product_sizes"
  ON public.product_sizes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Public read product_sizes"
  ON public.product_sizes FOR SELECT USING (true);

-- ── Orders: linked orders + source tracking ──────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS linked_order_id uuid REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS order_source text DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;

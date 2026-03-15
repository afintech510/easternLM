CREATE TABLE IF NOT EXISTS public.upsells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  short_description text NOT NULL,
  pricing_type text NOT NULL CHECK (pricing_type IN ('flat', 'per_yard', 'tiered_per_yard')),
  flat_price_cents integer,
  per_yard_price_cents integer,
  tiered_pricing jsonb,
  trigger_product_types text[] NOT NULL DEFAULT '{}',
  trigger_material_classes text[] NOT NULL DEFAULT '{}',
  trigger_categories text[] NOT NULL DEFAULT '{}',
  trigger_calculator_types text[] NOT NULL DEFAULT '{}',
  trigger_contexts text[] NOT NULL DEFAULT '{}',
  upsell_type text NOT NULL DEFAULT 'service' CHECK (upsell_type IN ('service', 'product', 'add-on')),
  linked_product_slugs text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 100,
  is_taxable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upsells_active ON public.upsells(is_active, sort_order);

CREATE TRIGGER set_upsells_updated_at BEFORE UPDATE ON public.upsells FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.upsells ENABLE ROW LEVEL SECURITY;
CREATE POLICY upsells_public_read ON public.upsells FOR SELECT USING (true);
CREATE POLICY upsells_admin_write ON public.upsells FOR ALL USING (
  auth.role() = 'service_role'
  OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);

-- Seed initial upsells
INSERT INTO upsells (slug, name, description, short_description, pricing_type, tiered_pricing, flat_price_cents, trigger_product_types, trigger_categories, trigger_calculator_types, trigger_contexts, upsell_type, linked_product_slugs, sort_order, icon)
VALUES
(
  'spreading-service',
  'Spreading / Installation',
  'Our crew spreads the material evenly across your project area. No wheelbarrows, no back pain.',
  'We''ll spread it for you',
  'tiered_per_yard',
  '[{"max_yards":4,"rate_cents_per_yard":7500},{"max_yards":5,"flat_cents":35000},{"max_yards":10,"base_cents":35000,"rate_cents_per_yard":3000},{"max_yards":20,"base_cents":50000,"rate_cents_per_yard":2500},{"max_yards":null,"base_cents":75000,"rate_cents_per_yard":3750}]'::jsonb,
  NULL,
  '{bulk}',
  '{}',
  '{mulch,topsoil,gravel,rca,fill,sand,driveway}',
  '{calculator,product_detail,cart,quote_tool}',
  'service',
  '{}',
  1,
  'shovel'
),
(
  'weed-barrier-fabric',
  'Weed Barrier Fabric',
  'Lay under mulch or gravel to block weeds for years. Covers ~900 sq ft per roll.',
  'Block weeds under your material',
  'flat',
  NULL,
  7500,
  '{bulk}',
  '{mulch,topsoil-fill,gravel-stone}',
  '{mulch,topsoil,gravel}',
  '{calculator,product_detail,cart}',
  'product',
  '{}',
  2,
  'layers'
),
(
  'tarp-placement',
  'Tarp Placement',
  'Driver lays a protective tarp before dumping. Keeps your driveway clean and stain-free.',
  'Protect your driveway from staining',
  'flat',
  NULL,
  2500,
  '{bulk}',
  '{}',
  '{}',
  '{cart}',
  'add-on',
  '{}',
  3,
  'shield'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tiered_pricing = EXCLUDED.tiered_pricing,
  flat_price_cents = EXCLUDED.flat_price_cents;

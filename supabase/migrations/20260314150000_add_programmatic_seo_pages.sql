-- Product × Town programmatic SEO pages
CREATE TABLE IF NOT EXISTS public.product_town_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  product_group text NOT NULL,
  town_slug text NOT NULL REFERENCES public.town_pages(slug) ON DELETE CASCADE,
  title text NOT NULL,
  meta_description text NOT NULL,
  h1 text NOT NULL,
  intro_paragraph text NOT NULL,
  local_context text,
  project_tips text,
  common_uses text[] NOT NULL DEFAULT '{}',
  featured_product_slugs text[] NOT NULL DEFAULT '{}',
  calculator_type text CHECK (calculator_type IN (
    'mulch', 'topsoil', 'gravel', 'sand', 'rca', 'driveway', 'fill'
  )),
  related_service_slug text,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  schema_type text NOT NULL DEFAULT 'Product',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_pages_product_group ON public.product_town_pages(product_group);
CREATE INDEX IF NOT EXISTS idx_pt_pages_town ON public.product_town_pages(town_slug);
CREATE INDEX IF NOT EXISTS idx_pt_pages_active ON public.product_town_pages(is_active) WHERE is_active = true;

CREATE TRIGGER set_product_town_pages_updated_at
  BEFORE UPDATE ON public.product_town_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Service × Town programmatic SEO pages
CREATE TABLE IF NOT EXISTS public.service_town_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  service_type text NOT NULL,
  town_slug text NOT NULL REFERENCES public.town_pages(slug) ON DELETE CASCADE,
  title text NOT NULL,
  meta_description text NOT NULL,
  h1 text NOT NULL,
  intro_paragraph text NOT NULL,
  local_context text,
  services_included text[] NOT NULL DEFAULT '{}',
  related_product_slugs text[] NOT NULL DEFAULT '{}',
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  schema_type text NOT NULL DEFAULT 'Service',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_pages_service_type ON public.service_town_pages(service_type);
CREATE INDEX IF NOT EXISTS idx_st_pages_town ON public.service_town_pages(town_slug);
CREATE INDEX IF NOT EXISTS idx_st_pages_active ON public.service_town_pages(is_active) WHERE is_active = true;

CREATE TRIGGER set_service_town_pages_updated_at
  BEFORE UPDATE ON public.service_town_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.product_town_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_town_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_town_pages_public_read ON public.product_town_pages
  FOR SELECT USING (true);

CREATE POLICY product_town_pages_admin_write ON public.product_town_pages
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY service_town_pages_public_read ON public.service_town_pages
  FOR SELECT USING (true);

CREATE POLICY service_town_pages_admin_write ON public.service_town_pages
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
  );

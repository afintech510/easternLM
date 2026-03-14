-- Service leads table for quote requests
CREATE TABLE IF NOT EXISTS public.service_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  town text,
  zip text,
  service_type text NOT NULL,
  description text,
  timeline text,
  referral_source text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'quoted', 'scheduled',
                      'completed', 'lost', 'spam')),
  assigned_to text,
  internal_notes text,
  quoted_amount_cents integer,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_leads_status ON public.service_leads(status);
CREATE INDEX IF NOT EXISTS idx_service_leads_phone ON public.service_leads(phone);
CREATE INDEX IF NOT EXISTS idx_service_leads_created ON public.service_leads(created_at DESC);

CREATE TRIGGER set_service_leads_updated_at
  BEFORE UPDATE ON public.service_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: admin-only
ALTER TABLE public.service_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_leads_admin_all ON public.service_leads
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
  );

-- Storage bucket for lead photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lead-photos', 'lead-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read lead photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'lead-photos');

CREATE POLICY "Service role upload lead photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lead-photos');

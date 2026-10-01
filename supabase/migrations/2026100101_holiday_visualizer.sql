-- Tinsel Time Long Island (holiday lights) — AI Visualizer.
-- Only the visualizer columns for now; designer + payment columns come in later migrations.

CREATE TABLE IF NOT EXISTS public.holiday_light_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'visualizer'
    CHECK (kind IN ('visualizer', 'design', 'quick_reserve')),

  -- Contact
  name text,
  phone text,
  email text,
  sms_consent boolean NOT NULL DEFAULT false,

  -- Photo + generation
  image_path text,
  image_width integer,
  image_height integer,
  photo_check jsonb,
  visualizer_style text,
  replicate_prediction_id text,
  visualizer_status text NOT NULL DEFAULT 'uploaded'
    CHECK (visualizer_status IN ('uploaded', 'generating', 'finalizing', 'ready', 'failed')),
  visualizer_error text,
  generation_count integer NOT NULL DEFAULT 0,
  visualizer_image_path text,
  visualizer_blur_path text,
  unlocked_at timestamptz,
  sms_sent_at timestamptz,
  notify_staff boolean NOT NULL DEFAULT false,

  -- Links + attribution
  lead_id uuid REFERENCES public.service_leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  gclid text,
  ip_hash text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holiday_designs_phone ON public.holiday_light_designs(phone);
CREATE INDEX IF NOT EXISTS idx_holiday_designs_lead ON public.holiday_light_designs(lead_id);
CREATE INDEX IF NOT EXISTS idx_holiday_designs_created ON public.holiday_light_designs(created_at DESC);

DROP TRIGGER IF EXISTS set_holiday_light_designs_updated_at ON public.holiday_light_designs;
CREATE TRIGGER set_holiday_light_designs_updated_at
  BEFORE UPDATE ON public.holiday_light_designs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: service role only. The public reaches rows by token through API routes.
ALTER TABLE public.holiday_light_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS holiday_light_designs_service_role ON public.holiday_light_designs;
CREATE POLICY holiday_light_designs_service_role ON public.holiday_light_designs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- One row per paid image generation. Drives the restart-proof daily spend cap
-- (HOLIDAY_VISUALIZER_DAILY_CAP) and cost auditing.
CREATE TABLE IF NOT EXISTS public.holiday_visualizer_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id uuid NOT NULL REFERENCES public.holiday_light_designs(id) ON DELETE CASCADE,
  style text NOT NULL,
  model text NOT NULL,
  prediction_id text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holiday_generations_created ON public.holiday_visualizer_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_holiday_generations_design ON public.holiday_visualizer_generations(design_id);

ALTER TABLE public.holiday_visualizer_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS holiday_visualizer_generations_service_role ON public.holiday_visualizer_generations;
CREATE POLICY holiday_visualizer_generations_service_role ON public.holiday_visualizer_generations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Private bucket for photos + renders (the API also creates it on first use).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('holiday-designs', 'holiday-designs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

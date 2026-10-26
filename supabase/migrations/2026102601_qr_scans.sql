-- QR scan log for printed codes (shirts, etc.). One row per scan of a tracked
-- redirect like /shirt. GA gets the UTMs too; this is the hard count.

CREATE TABLE IF NOT EXISTS public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,          -- which printed code, e.g. 'shirt'
  variant text,                  -- optional ?s= id (print run, crew member, event)
  ip_hash text,                  -- salted hash, for unique-scanner counts
  user_agent text,
  referer text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_scans_source_scanned_at_idx
  ON public.qr_scans (source, scanned_at DESC);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qr_scans_service_role ON public.qr_scans;
CREATE POLICY qr_scans_service_role ON public.qr_scans
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

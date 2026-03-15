CREATE TABLE IF NOT EXISTS public.calculator_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  session_id text,
  source_page text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculator_events_type ON public.calculator_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calculator_events_created ON public.calculator_events(created_at DESC);

ALTER TABLE public.calculator_events ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone can log events), admin read
CREATE POLICY calculator_events_insert ON public.calculator_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY calculator_events_admin_read ON public.calculator_events
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
  );

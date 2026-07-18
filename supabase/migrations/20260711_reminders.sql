-- SMS reminder queue for Adam & Ronnie.
-- Both people text reminders to the business line and get a twice-daily digest
-- of all open items. See src/lib/reminders/.

-- Stable short number shown in the digest and used by `DONE <#>`.
CREATE SEQUENCE IF NOT EXISTS public.reminders_ref_seq;

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_num bigint NOT NULL DEFAULT nextval('public.reminders_ref_seq'),
  body text NOT NULL,
  created_by text,
  created_by_phone text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completed_by text
);

CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_ref_num ON public.reminders(ref_num);

-- RLS: service_role full access (mirrors follow_ups). No anon access needed.
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminders_admin ON public.reminders FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);

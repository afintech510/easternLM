-- RingCentral call management tables
-- Phase 1: call_records, call_order_links, counter_checkins

-- ── Core call records ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.call_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- RingCentral identifiers
  rc_session_id text UNIQUE,
  rc_call_id text,
  rc_recording_id text,

  -- Call details
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  from_name text,

  -- Extension that handled the call
  extension_id text,
  extension_name text,
  answered_by text,

  -- Call status and timing
  status text NOT NULL DEFAULT 'ringing'
    CHECK (status IN ('ringing', 'answered', 'missed', 'voicemail', 'completed', 'abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,

  -- Customer linking
  customer_id uuid REFERENCES public.customers(id),
  customer_match_type text CHECK (customer_match_type IN ('auto_phone', 'manual', 'new_created')),

  -- AI Summary (RingSense)
  ai_summary text,
  ai_action_items text[],
  ai_transcript text,
  ai_sentiment text,
  ai_fetched_at timestamptz,

  -- Follow-up
  requires_follow_up boolean DEFAULT false,
  follow_up_resolved boolean DEFAULT false,
  follow_up_resolved_at timestamptz,
  follow_up_resolved_by text,

  -- Notes
  staff_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_records_from ON public.call_records(from_number);
CREATE INDEX IF NOT EXISTS idx_call_records_customer ON public.call_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_records_started ON public.call_records(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_records_status ON public.call_records(status);
CREATE INDEX IF NOT EXISTS idx_call_records_rc_session ON public.call_records(rc_session_id);
CREATE INDEX IF NOT EXISTS idx_call_records_follow_up ON public.call_records(requires_follow_up)
  WHERE requires_follow_up = true AND follow_up_resolved = false;

-- ── Call ↔ Order linking (many-to-many) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.call_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.call_records(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  linked_by text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(call_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_call_order_links_call ON public.call_order_links(call_id);
CREATE INDEX IF NOT EXISTS idx_call_order_links_order ON public.call_order_links(order_id);

-- ── Counter check-in log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.counter_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id text NOT NULL,
  staff_name text,
  checked_in boolean NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_counter_checkins_latest ON public.counter_checkins(extension_id, checked_in_at DESC);

-- ── Enable Realtime on call_records ──────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_records;

-- ── RLS policies ─────────────────────────────────────────────────
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_checkins ENABLE ROW LEVEL SECURITY;

-- Service role (admin) has full access
CREATE POLICY "Service role full access on call_records"
  ON public.call_records FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on call_order_links"
  ON public.call_order_links FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on counter_checkins"
  ON public.counter_checkins FOR ALL
  USING (auth.role() = 'service_role');

-- Anon can read call_records (for POS realtime subscriptions)
CREATE POLICY "Anon read call_records"
  ON public.call_records FOR SELECT
  USING (true);

CREATE POLICY "Anon read counter_checkins"
  ON public.counter_checkins FOR SELECT
  USING (true);

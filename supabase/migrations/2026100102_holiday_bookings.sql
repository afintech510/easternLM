-- Tinsel Time Long Island — Build & Book: install weeks with capacity + deposit bookings.

CREATE TABLE IF NOT EXISTS public.holiday_install_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  label text NOT NULL,
  capacity integer NOT NULL CHECK (capacity >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_holiday_install_weeks_updated_at ON public.holiday_install_weeks;
CREATE TRIGGER set_holiday_install_weeks_updated_at
  BEFORE UPDATE ON public.holiday_install_weeks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.holiday_install_weeks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS holiday_install_weeks_service_role ON public.holiday_install_weeks;
CREATE POLICY holiday_install_weeks_service_role ON public.holiday_install_weeks
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 2026 season: Nov 1 – Dec 12, 75 installs (13+13+13+12+12+12).
INSERT INTO public.holiday_install_weeks (week_start, label, capacity) VALUES
  ('2026-11-01', 'Nov 1 – Nov 7', 13),
  ('2026-11-08', 'Nov 8 – Nov 14', 13),
  ('2026-11-15', 'Nov 15 – Nov 21', 13),
  ('2026-11-22', 'Nov 22 – Nov 28', 12),
  ('2026-11-29', 'Nov 29 – Dec 5', 12),
  ('2026-12-06', 'Dec 6 – Dec 12', 12)
ON CONFLICT (week_start) DO NOTHING;

-- Atomic seat count when a deposit is paid (called from the Stripe webhook).
CREATE OR REPLACE FUNCTION public.holiday_reserve_week(p_week uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.holiday_install_weeks SET reserved = reserved + 1 WHERE id = p_week RETURNING reserved;
$$;
REVOKE ALL ON FUNCTION public.holiday_reserve_week(uuid) FROM PUBLIC, anon, authenticated;

-- Bookings live on holiday_light_designs (kind 'build' = Build & Book, 'quick_reserve' = week only).
ALTER TABLE public.holiday_light_designs DROP CONSTRAINT IF EXISTS holiday_light_designs_kind_check;
ALTER TABLE public.holiday_light_designs ADD CONSTRAINT holiday_light_designs_kind_check
  CHECK (kind IN ('visualizer', 'design', 'quick_reserve', 'build'));

ALTER TABLE public.holiday_light_designs
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS town text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS service_area jsonb,
  ADD COLUMN IF NOT EXISTS build jsonb,
  ADD COLUMN IF NOT EXISTS price_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS estimate_cents integer,
  ADD COLUMN IF NOT EXISTS early_bird_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS install_week_id uuid REFERENCES public.holiday_install_weeks(id),
  ADD COLUMN IF NOT EXISTS booking_status text
    CHECK (booking_status IN ('pending_deposit', 'reserved', 'canceled', 'expired')),
  ADD COLUMN IF NOT EXISTS deposit_cents integer,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS deposit_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_holiday_designs_week_status
  ON public.holiday_light_designs(install_week_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_holiday_designs_checkout
  ON public.holiday_light_designs(stripe_checkout_session_id);

-- POS daily reconciliation reports
CREATE TABLE IF NOT EXISTS public.pos_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  register_id text,
  total_sales_cents integer NOT NULL DEFAULT 0,
  total_transactions integer NOT NULL DEFAULT 0,
  card_total_cents integer NOT NULL DEFAULT 0,
  card_count integer NOT NULL DEFAULT 0,
  cash_total_cents integer NOT NULL DEFAULT 0,
  cash_count integer NOT NULL DEFAULT 0,
  expected_cash_cents integer NOT NULL DEFAULT 0,
  counted_cash_cents integer,
  variance_cents integer,
  delivery_count integer NOT NULL DEFAULT 0,
  pickup_count integer NOT NULL DEFAULT 0,
  refund_total_cents integer NOT NULL DEFAULT 0,
  refund_count integer NOT NULL DEFAULT 0,
  void_count integer NOT NULL DEFAULT 0,
  closed_by uuid REFERENCES public.accounts(id),
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY pos_daily_reports_staff ON public.pos_daily_reports FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

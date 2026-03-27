-- Order notes for staff communication
CREATE TABLE IF NOT EXISTS public.order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_notes_order ON public.order_notes(order_id, created_at DESC);

-- RLS
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to order_notes"
  ON public.order_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

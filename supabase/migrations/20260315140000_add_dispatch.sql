-- Delivery assignments for dispatch board
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  delivery_date date NOT NULL,
  time_slot text,
  estimated_departure timestamptz,
  estimated_arrival timestamptz,
  truck_type text NOT NULL CHECK (truck_type IN ('small', 'medium', 'tri-axle')),
  truck_id text,
  driver_name text,
  driver_phone text,
  load_number integer NOT NULL DEFAULT 1,
  material_summary text NOT NULL,
  total_yards numeric(10,2),
  destination_address text NOT NULL,
  destination_town text,
  distance_miles numeric(10,2),
  drive_minutes integer,
  access_constraints jsonb NOT NULL DEFAULT '{}',
  access_notes text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'loading', 'departed', 'arrived', 'delivered', 'issue', 'rescheduled', 'cancelled')),
  actual_departure timestamptz,
  actual_arrival timestamptz,
  actual_completion timestamptz,
  has_spreading boolean NOT NULL DEFAULT false,
  spreading_yards numeric(10,2),
  dispatch_notes text,
  driver_notes text,
  assigned_by uuid REFERENCES public.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_da_date ON public.delivery_assignments(delivery_date);
CREATE INDEX IF NOT EXISTS idx_da_truck ON public.delivery_assignments(truck_type, delivery_date);
CREATE INDEX IF NOT EXISTS idx_da_order ON public.delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_da_status ON public.delivery_assignments(status, delivery_date);

CREATE TRIGGER set_da_updated_at BEFORE UPDATE ON public.delivery_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY da_admin ON public.delivery_assignments FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

-- Physical truck fleet (separate from truck_types which is pricing)
CREATE TABLE IF NOT EXISTS public.trucks (
  id text PRIMARY KEY,
  name text NOT NULL,
  truck_type text NOT NULL CHECK (truck_type IN ('small', 'medium', 'tri-axle')),
  license_plate text,
  default_driver_name text,
  default_driver_phone text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
CREATE POLICY trucks_admin ON public.trucks FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

INSERT INTO trucks (id, name, truck_type) VALUES
  ('small-1', 'Small Dump', 'small'),
  ('medium-1', 'Medium Dump', 'medium'),
  ('triaxle-1', 'Tri-Axle', 'tri-axle')
ON CONFLICT (id) DO NOTHING;

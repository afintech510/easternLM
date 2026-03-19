-- Lead management system: extended service_leads + activity log + contractors

-- Extend service_leads
ALTER TABLE service_leads
  ADD COLUMN IF NOT EXISTS lead_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS assigned_contractors uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS estimated_value_cents integer,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS site_visit_date timestamptz,
  ADD COLUMN IF NOT EXISTS site_visit_notes text,
  ADD COLUMN IF NOT EXISTS site_photos text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES quotes(id),
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS conversion_date timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_competitor text,
  ADD COLUMN IF NOT EXISTS next_follow_up timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- Lead activity timeline
CREATE TABLE IF NOT EXISTS lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES service_leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_la_lead ON lead_activity(lead_id, created_at DESC);

-- Contractor roster
CREATE TABLE IF NOT EXISTS contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  name text NOT NULL,
  company_name text,
  phone text NOT NULL,
  email text,
  service_types text[] NOT NULL DEFAULT '{}'::text[],
  max_active_leads integer DEFAULT 5,
  current_active_leads integer DEFAULT 0,
  total_leads_assigned integer DEFAULT 0,
  total_leads_won integer DEFAULT 0,
  win_rate numeric(5,2),
  avg_response_minutes integer,
  preferred_contact text DEFAULT 'sms',
  sms_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

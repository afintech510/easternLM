-- Enhanced project schema for project hub
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'service'
    CHECK (project_type IN ('service', 'install', 'delivery_only')),
  ADD COLUMN IF NOT EXISTS service_type text
    CHECK (service_type IN ('driveways', 'landscaping', 'masonry', 'property-maintenance', 'other')),
  ADD COLUMN IF NOT EXISTS quote_total_cents integer,
  ADD COLUMN IF NOT EXISTS deposit_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoiced_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS estimated_days integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS assigned_crew text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS crew_notes text,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_assignment_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS invoice_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'high', 'normal', 'low'));

-- Project activity timeline
CREATE TABLE IF NOT EXISTS project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'created', 'status_changed', 'note_added', 'photo_added',
    'document_added', 'quote_linked', 'order_created',
    'delivery_scheduled', 'delivery_completed',
    'invoice_sent', 'payment_received',
    'crew_assigned', 'schedule_changed', 'customer_contacted'
  )),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_project ON project_activity(project_id, created_at DESC);

-- Campaign management system
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  channel text NOT NULL CHECK (channel IN ('sms', 'email', 'both')),
  sms_body text,
  email_subject text,
  email_body_html text,
  audience_filter jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  total_sent integer NOT NULL DEFAULT 0,
  total_delivered integer NOT NULL DEFAULT 0,
  total_failed integer NOT NULL DEFAULT 0,
  total_clicked integer NOT NULL DEFAULT 0,
  total_opted_out integer NOT NULL DEFAULT 0,
  requires_approval boolean NOT NULL DEFAULT true,
  approved_by text,
  approved_at timestamptz,
  target_url text, -- redirect URL for link tracking
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Individual sends per recipient
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  phone text,
  email text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opted_out', 'skipped')),
  sent_at timestamptz,
  sms_sid text,
  email_id text,
  link_clicked boolean NOT NULL DEFAULT false,
  clicked_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON public.campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON public.campaign_sends(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_customer ON public.campaign_sends(customer_id);

-- Saved audience segments
CREATE TABLE IF NOT EXISTS public.audience_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  filter jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_audience_segments_updated_at BEFORE UPDATE ON public.audience_segments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Marketing settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS marketing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_sms_per_day integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS max_emails_per_day integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS max_campaigns_per_month integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS sms_quiet_hours_start integer NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS sms_quiet_hours_end integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS marketing_approval_required boolean NOT NULL DEFAULT true;

-- RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_admin ON public.campaigns FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY campaign_sends_admin ON public.campaign_sends FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY audience_segments_admin ON public.audience_segments FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);

-- Seed audience segments
INSERT INTO audience_segments (slug, name, description, filter) VALUES
('all-with-phone', 'All customers (phone)', 'Every customer with a phone number', '{"has_phone": true}'),
('all-with-email', 'All customers (email)', 'Every customer with an email address', '{"has_email": true}'),
('mulch-buyers', 'Mulch buyers', 'Customers who have ordered mulch products', '{"tags_include": ["mulch-buyer"], "has_phone": true}'),
('gravel-buyers', 'Gravel & driveway buyers', 'Customers who ordered gravel, RCA, or stone', '{"tags_include": ["gravel-buyer"], "has_phone": true}'),
('topsoil-buyers', 'Topsoil buyers', 'Customers who ordered topsoil or compost', '{"tags_include": ["topsoil-buyer"], "has_phone": true}'),
('mason-buyers', 'Masonry customers', 'Customers who ordered cement, blocks, or stone', '{"tags_include": ["mason-buyer"], "has_phone": true}'),
('repeat-customers', 'Repeat customers (3+ orders)', 'Loyal customers with 3 or more orders', '{"tags_include": ["repeat"], "has_phone": true}'),
('high-value', 'High-value customers ($1000+)', 'Customers who have spent over $1000 lifetime', '{"tags_include": ["high-value"], "has_phone": true}'),
('contractors', 'Contractors', 'Identified contractors and account customers', '{"tags_include": ["contractor"], "has_phone": true}'),
('inactive-6mo', 'Inactive 6+ months', 'Customers with no order in the last 6 months', '{"last_order_before": "RELATIVE:-6months", "min_orders": 1, "has_phone": true}'),
('local-5mi', 'Local (within 5 miles)', 'Customers in Center Moriches, Moriches, East Moriches, Eastport', '{"towns": ["center-moriches", "moriches", "east-moriches", "eastport"], "has_phone": true}'),
('hamptons', 'Hamptons customers', 'Customers in Westhampton, WHB, Quogue, East Quogue, Southampton, Hampton Bays', '{"towns": ["westhampton", "westhampton-beach", "quogue", "east-quogue", "southampton", "hampton-bays"], "has_phone": true}')
ON CONFLICT (slug) DO NOTHING;

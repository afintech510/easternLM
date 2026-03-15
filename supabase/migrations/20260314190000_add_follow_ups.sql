-- Follow-up templates
CREATE TABLE IF NOT EXISTS public.follow_up_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  trigger_event text NOT NULL DEFAULT 'order_delivered'
    CHECK (trigger_event IN ('order_delivered', 'order_completed', 'service_completed', 'days_after_delivery')),
  delay_minutes integer NOT NULL DEFAULT 120,
  sms_body text,
  email_subject text,
  email_body_html text,
  send_window_start integer NOT NULL DEFAULT 9,
  send_window_end integer NOT NULL DEFAULT 20,
  max_sends_per_customer integer NOT NULL DEFAULT 1,
  cooldown_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Follow-up records
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone text,
  email text,
  customer_name text,
  template_slug text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'email', 'both')),
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled', 'opted_out')),
  error_message text,
  sms_sid text,
  email_id text,
  link_clicked boolean NOT NULL DEFAULT false,
  review_submitted boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON public.follow_ups(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_follow_ups_order ON public.follow_ups(order_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON public.follow_ups(customer_id);

CREATE TRIGGER set_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_follow_up_templates_updated_at BEFORE UPDATE ON public.follow_up_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Site settings additions
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS google_review_url text,
  ADD COLUMN IF NOT EXISTS twilio_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS follow_up_timezone text NOT NULL DEFAULT 'America/New_York';

-- RLS
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY follow_ups_admin ON public.follow_ups FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY follow_up_templates_admin ON public.follow_up_templates FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);

-- Seed templates
INSERT INTO follow_up_templates (slug, name, channel, trigger_event, delay_minutes, sms_body, email_subject, email_body_html, send_window_start, send_window_end, max_sends_per_customer, cooldown_days, sort_order) VALUES
(
  'review-request-sms', 'Post-Delivery Review Request (SMS)', 'sms', 'order_delivered', 120,
  E'Hi {{customer_name}}! Thanks for your order from Eastern LM. We hope you\'re happy with your {{product_summary}}. Would you mind leaving us a quick Google review? It really helps our family business. {{review_url}} - The Eastern LM Team',
  NULL, NULL, 9, 20, 1, 60, 1
),
(
  'review-request-email', 'Post-Delivery Review Request (Email)', 'email', 'order_delivered', 120,
  NULL,
  'How was your delivery, {{customer_name}}?',
  E'<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;"><h2 style="color:#1a3a5c;">Thanks for your order!</h2><p>Hi {{customer_name}},</p><p>We hope your <strong>{{product_summary}}</strong> arrived just right. Our family has been serving Suffolk County for over 30 years, and we\'d love to hear how we did.</p><p>Would you take 30 seconds to leave us a Google review?</p><a href="{{review_url}}" style="display:inline-block;background:#1a3a5c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Leave a Review</a><p style="color:#666;font-size:13px;margin-top:24px;">Eastern Landscape & Mason Supply<br>110 Frowein Road, Center Moriches, NY 11934<br>(631) 874-6244</p><p style="color:#999;font-size:11px;"><a href="{{unsubscribe_url}}" style="color:#999;">Unsubscribe</a></p></div>',
  9, 20, 1, 60, 2
),
(
  'review-reminder-sms', 'Review Reminder (7 days, SMS)', 'sms', 'days_after_delivery', 10080,
  'Hi {{customer_name}}, just a friendly reminder from Eastern LM. If you have a moment, a Google review would mean a lot to us: {{review_url}} Thanks! Reply STOP to opt out.',
  NULL, NULL, 9, 20, 1, 90, 3
)
ON CONFLICT (slug) DO NOTHING;

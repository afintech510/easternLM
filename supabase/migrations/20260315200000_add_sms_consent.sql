-- Consent audit log
CREATE TABLE IF NOT EXISTS public.sms_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  email text,
  name text,
  consent_given boolean NOT NULL,
  consent_source text NOT NULL, -- 'checkout', 'contact_form', 'quote_form', 'newsletter', 'pro_signup'
  consent_text text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_consent_phone ON public.sms_consent_log(phone);

-- Add consent fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sms_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

-- Add consent fields to accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS sms_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

-- RLS
ALTER TABLE public.sms_consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_consent_admin ON public.sms_consent_log FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin')
);

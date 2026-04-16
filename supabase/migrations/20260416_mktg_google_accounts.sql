-- Phase 01: Google Ads — per-brand credential + account linkage
CREATE TABLE IF NOT EXISTS mktg_google_accounts (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                 text NOT NULL,
  google_customer_id       text NOT NULL,
  merchant_id              text NOT NULL,
  store_code               text,
  refresh_token_encrypted  text NOT NULL,
  connected_by_email       text,
  publish_mode             text NOT NULL DEFAULT 'suggest'
                           CHECK (publish_mode IN ('read_only','suggest','auto')),
  monthly_budget_cap_cents integer NOT NULL,
  conversion_action_purchase text,
  conversion_action_lead     text,
  connected_at             timestamptz NOT NULL DEFAULT now(),
  revoked_at               timestamptz,
  UNIQUE (brand_id)
);

ALTER TABLE mktg_google_accounts ENABLE ROW LEVEL SECURITY;

-- Phase 01: Google Ads — offline conversion upload dedup tracking
CREATE TABLE IF NOT EXISTS mktg_google_conversions_uploaded (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           text NOT NULL,
  order_id           uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gclid              text,
  conversion_action_resource text,
  uploaded_at        timestamptz NOT NULL DEFAULT now(),
  upload_status      text NOT NULL,
  error_message      text,
  UNIQUE (order_id)
);

ALTER TABLE mktg_google_conversions_uploaded ENABLE ROW LEVEL SECURITY;

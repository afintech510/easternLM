-- Phase 01: Google Ads — daily performance snapshot (append-only)
CREATE TABLE IF NOT EXISTS mktg_google_performance (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           text NOT NULL,
  google_campaign_id text NOT NULL,
  date               date NOT NULL,
  impressions        bigint NOT NULL DEFAULT 0,
  clicks             bigint NOT NULL DEFAULT 0,
  cost_micros        bigint NOT NULL DEFAULT 0,
  conversions        numeric(10,2) NOT NULL DEFAULT 0,
  conversion_value_micros bigint NOT NULL DEFAULT 0,
  ctr                numeric(6,4),
  avg_cpc_micros     bigint,
  roas               numeric(8,2),
  pulled_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, google_campaign_id, date)
);

CREATE INDEX ON mktg_google_performance (brand_id, date DESC);

ALTER TABLE mktg_google_performance ENABLE ROW LEVEL SECURITY;

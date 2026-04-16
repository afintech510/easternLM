-- Phase 01: Google Ads — campaign state mirror
CREATE TABLE IF NOT EXISTS mktg_google_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            text NOT NULL,
  google_campaign_id  text NOT NULL,
  name                text NOT NULL,
  type                text NOT NULL,
  status              text NOT NULL,
  budget_cents_daily  integer,
  bidding_strategy    text,
  target_cpa_cents    integer,
  created_by_agent    boolean DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  last_synced_at      timestamptz,
  UNIQUE (brand_id, google_campaign_id)
);

ALTER TABLE mktg_google_campaigns ENABLE ROW LEVEL SECURITY;

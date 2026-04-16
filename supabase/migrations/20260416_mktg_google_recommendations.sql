-- Phase 01: Google Ads — optimizer recommendations queue
CREATE TABLE IF NOT EXISTS mktg_google_recommendations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           text NOT NULL,
  google_campaign_id text,
  type               text NOT NULL,
  reason             text NOT NULL,
  proposed_change    jsonb NOT NULL,
  estimated_impact   jsonb,
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected','auto_applied','expired')),
  created_by_agent   text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  decided_at         timestamptz,
  decided_by         text,
  applied_at         timestamptz,
  apply_result       jsonb
);

CREATE INDEX ON mktg_google_recommendations (brand_id, status, created_at DESC);

ALTER TABLE mktg_google_recommendations ENABLE ROW LEVEL SECURITY;

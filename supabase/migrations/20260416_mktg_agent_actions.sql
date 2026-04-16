-- Phase 01: Google Ads — shared agent audit table
CREATE TABLE IF NOT EXISTS mktg_agent_actions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           text NOT NULL,
  agent_name         text NOT NULL,
  action             text NOT NULL,
  target_resource    text,
  payload            jsonb NOT NULL,
  result             jsonb,
  status             text NOT NULL CHECK (status IN ('pending','success','error','rejected_by_guardrail')),
  triggered_by       text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON mktg_agent_actions (brand_id, created_at DESC);

ALTER TABLE mktg_agent_actions ENABLE ROW LEVEL SECURITY;

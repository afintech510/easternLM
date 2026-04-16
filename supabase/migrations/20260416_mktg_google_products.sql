-- Phase 01: Google Ads — Supabase product → GMC offer mapping
CREATE TABLE IF NOT EXISTS mktg_google_products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           text NOT NULL,
  product_id         uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  gmc_offer_id       text NOT NULL,
  channel            text NOT NULL CHECK (channel IN ('online','local')),
  content_language   text NOT NULL DEFAULT 'en',
  feed_label         text NOT NULL DEFAULT 'US',
  last_synced_at     timestamptz,
  last_sync_status   text,
  disapproval_reason text,
  UNIQUE (brand_id, gmc_offer_id, channel)
);

ALTER TABLE mktg_google_products ENABLE ROW LEVEL SECURITY;

-- Phase 01: Google Ads — GCLID column for offline conversion tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gclid text;

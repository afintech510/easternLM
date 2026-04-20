-- Book-a-Crew Phase 2: Providers table, confirmation tokens, platform fee config
-- Apply via Supabase SQL Editor

-- ── Providers table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text,
  email       text,
  categories  text[] DEFAULT '{}',
  insurance_expiration date,
  is_active   boolean DEFAULT true,
  notes       text,
  internal_rate_percent numeric(5,2) DEFAULT 70.00,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on providers"
  ON providers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM accounts WHERE accounts.id = auth.uid() AND accounts.role = 'admin')
  );

-- ── Add book-now Phase 2 columns to orders ───────────────────
DO $$ BEGIN
  -- Provider assignment
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES providers(id);
  -- Confirmation token (HMAC-signed, short-lived)
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_token text;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_token_expires_at timestamptz;
  -- Platform fee tracking
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_cents integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_orders_confirmation_token ON orders(confirmation_token) WHERE confirmation_token IS NOT NULL;

-- ── Platform fee rate in site_settings ───────────────────────
-- Add column if missing (single-row table)
DO $$ BEGIN
  ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS book_now_platform_fee_rate numeric(5,4) DEFAULT 0.2000;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update existing row
UPDATE site_settings SET book_now_platform_fee_rate = 0.2000 WHERE book_now_platform_fee_rate IS NULL;

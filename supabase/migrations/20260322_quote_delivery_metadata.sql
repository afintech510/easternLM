-- Quote delivery metadata: date, time window, notes, constraints, route info
-- These enable the redesigned customer-facing quote page to show rich delivery details

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS short_code text,
  ADD COLUMN IF NOT EXISTS service_interest text,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES service_leads(id),
  ADD COLUMN IF NOT EXISTS delivery_date text,              -- e.g. "2026-04-01"
  ADD COLUMN IF NOT EXISTS delivery_time_window text,       -- e.g. "morning", "afternoon", "flexible"
  ADD COLUMN IF NOT EXISTS delivery_notes text,             -- driver / access notes
  ADD COLUMN IF NOT EXISTS access_constraints jsonb DEFAULT '{}'::jsonb,   -- {low_wires: true, gated: true, …}
  ADD COLUMN IF NOT EXISTS route_info jsonb,                -- {roundTripMiles, roundTripMinutes}
  ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}'::text[];

-- Unique index on short_code (skip if null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_short_code
  ON quotes(short_code) WHERE short_code IS NOT NULL;

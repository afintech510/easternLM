-- Quote Disable & Scammer Flag system

-- 1. Update quotes status CHECK constraint to include 'disabled' and 'scammer'
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('pending', 'saved', 'draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted', 'disabled', 'scammer'));

-- 2. Add audit columns for disabled quotes
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_by TEXT,
  ADD COLUMN IF NOT EXISTS disable_reason TEXT;

-- 3. Add scammer flag to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_scammer BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scammer_note TEXT;

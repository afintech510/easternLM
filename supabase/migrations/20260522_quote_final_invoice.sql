-- Quote → Final Invoice flow
-- Adds tracking for the balance payment that closes a quote after deposit + post-job items.
-- The existing 'accepted' status is reused — finalized_at acts as the invoice-mode toggle.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS balance_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_paid_cents >= 0),
  ADD COLUMN IF NOT EXISTS balance_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS balance_stripe_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_sent_via TEXT[];

CREATE INDEX IF NOT EXISTS idx_quotes_finalized_unpaid
  ON quotes (finalized_at)
  WHERE finalized_at IS NOT NULL AND balance_paid_cents = 0;

COMMENT ON COLUMN quotes.finalized_at IS
  'Set when admin finalizes the quote into an invoice (locks items, customer can pay balance). Toggle for invoice mode.';
COMMENT ON COLUMN quotes.balance_paid_cents IS
  'Amount paid against the balance (post-deposit, after finalization). When deposit_paid + balance_paid >= total, the quote is fully paid.';
COMMENT ON COLUMN quotes.invoice_sent_at IS
  'Last time the final invoice was sent to the customer (email and/or SMS).';

-- Add 'saved' status for manually saved POS carts
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('saved', 'draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted'));

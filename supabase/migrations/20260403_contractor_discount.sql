-- Per-customer auto-discount flag for contractor pickup discount
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS contractor_discount BOOLEAN NOT NULL DEFAULT FALSE;

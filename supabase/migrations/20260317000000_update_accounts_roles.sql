-- Expand role options to include staff and pos
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_role_check;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_role_check
  CHECK (role IN ('customer', 'pro', 'admin', 'staff', 'pos'));

-- Add PIN and account-active fields
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS pos_pin_hash text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

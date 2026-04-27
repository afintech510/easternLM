-- Online order convenience fee (adjustable in admin settings)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS online_order_fee_cents integer NOT NULL DEFAULT 1500;

-- Track the fee on each order
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS online_order_fee_cents integer NOT NULL DEFAULT 0;

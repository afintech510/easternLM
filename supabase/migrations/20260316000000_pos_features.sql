-- COD payment method
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('card_online', 'card_terminal', 'cash', 'check', 'account', 'cod'));

-- Tax exempt
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_exempt boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_exempt_certificate text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_exempt boolean NOT NULL DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_exempt_certificate text;

-- Discount
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_type text CHECK (discount_type IN ('percentage', 'amount', 'pro_pickup'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_value numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount_cents integer NOT NULL DEFAULT 0;

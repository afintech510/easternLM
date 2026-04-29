-- Change sms_opt_in default from false to true so all orders
-- (POS, web, quote-converted, etc.) are opted in by default.
ALTER TABLE public.orders ALTER COLUMN sms_opt_in SET DEFAULT true;

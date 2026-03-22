-- Add delivery detail columns to orders table (matching quotes table)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_time_window text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address text;

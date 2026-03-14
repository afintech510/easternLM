-- Add WooCommerce cross-reference and variant pricing fields
alter table public.products
  add column if not exists wc_id integer,
  add column if not exists price_note text not null default '';

-- Index for WC ID lookups during migration
create index if not exists idx_products_wc_id on public.products (wc_id) where wc_id is not null;

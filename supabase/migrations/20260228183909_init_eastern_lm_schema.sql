create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.truck_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity_mulch numeric(10,2) not null check (capacity_mulch > 0),
  capacity_default numeric(10,2) not null check (capacity_default > 0),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 100,
  image text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid not null references public.categories(id) on delete restrict,
  delivery_type text not null check (delivery_type in ('bulk', 'non-bulk')),
  material_class text not null check (material_class in ('mulch', 'default')),
  price_per_unit_cents integer not null check (price_per_unit_cents >= 0),
  unit text not null,
  unit_display text not null,
  min_qty numeric(10,2) not null check (min_qty >= 0),
  max_qty numeric(10,2) not null check (max_qty >= min_qty),
  step_qty numeric(10,2) not null check (step_qty > 0),
  description text not null default '',
  images text[] not null default '{}',
  recommended_uses text[] not null default '{}',
  pairs_well_with text[] not null default '{}',
  is_taxable boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_fee_cache (
  id bigint generated always as identity primary key,
  address_hash text not null unique,
  address text not null,
  distance_meters integer not null check (distance_meters >= 0),
  duration_seconds integer not null check (duration_seconds >= 0),
  one_way_miles numeric(10,2) not null check (one_way_miles >= 0),
  first_load_fee_cents integer not null check (first_load_fee_cents >= 0),
  additional_load_fee_cents integer not null check (additional_load_fee_cents >= 0),
  is_local boolean not null default false,
  is_out_of_range boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_delivery_fee_cache_expires_at
  on public.delivery_fee_cache (expires_at);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  origin_address text not null,
  miles_per_gallon numeric(10,2) not null default 6.00,
  fuel_price_per_gallon numeric(10,2) not null default 4.00,
  hourly_labor_rate numeric(10,2) not null default 30.00,
  dump_time_buffer_minutes integer not null default 5,
  profit_multiplier numeric(10,2) not null default 2.00,
  round_to_nearest integer not null default 5,
  minimum_delivery_fee_cents integer not null default 2500,
  additional_load_discount numeric(10,4) not null default 0.2500,
  minimum_order_cents integer not null default 12500,
  local_radius_miles numeric(10,2) not null default 5.00,
  max_service_radius_miles numeric(10,2) not null default 50.00,
  tax_rate numeric(10,4) not null default 0.0875,
  cc_surcharge_rate numeric(10,4) not null default 0.0300,
  same_day_cutoff_hour integer not null default 11 check (same_day_cutoff_hour between 0 and 23),
  timezone text not null default 'America/New_York',
  operating_days text[] not null default '{"Mon","Tue","Wed","Thu","Fri","Sat"}',
  blackout_dates date[] not null default '{}',
  max_loads_per_day_per_address integer not null default 1,
  pro_discount_rate numeric(10,4) not null default 0.0500,
  pro_discount_pickup_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  images text[] not null default '{}',
  town_tags text[] not null default '{}',
  service_type text not null,
  before_after boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'pro', 'admin')),
  is_pro_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text unique,
  account_id uuid references public.accounts(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'processing', 'scheduled', 'delivered', 'cancelled')),
  delivery_method text not null check (delivery_method in ('pickup', 'delivery')),
  delivery_address text,
  delivery_zip text,
  combine_loads boolean not null default false,
  materials_subtotal_cents integer not null check (materials_subtotal_cents >= 0),
  delivery_total_cents integer not null check (delivery_total_cents >= 0),
  tax_cents integer not null check (tax_cents >= 0),
  cc_surcharge_cents integer not null check (cc_surcharge_cents >= 0),
  grand_total_cents integer not null check (grand_total_cents >= 0),
  distance_meters integer,
  duration_seconds integer,
  first_load_fee_cents integer,
  additional_load_fee_cents integer,
  total_loads integer not null default 0,
  total_delivery_days integer not null default 0,
  access_constraints jsonb not null default '{}'::jsonb,
  delivery_schedule jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_account_id on public.orders(account_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_placed_at on public.orders(placed_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text,
  quantity numeric(10,2) not null check (quantity > 0),
  unit text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_subtotal_cents integer not null check (line_subtotal_cents >= 0),
  delivery_type text check (delivery_type in ('bulk', 'non-bulk')),
  material_class text check (material_class in ('mulch', 'default')),
  load_number integer,
  delivery_day integer,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

drop trigger if exists set_truck_types_updated_at on public.truck_types;
create trigger set_truck_types_updated_at
before update on public.truck_types
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_gallery_projects_updated_at on public.gallery_projects;
create trigger set_gallery_projects_updated_at
before update on public.gallery_projects
for each row execute function public.set_updated_at();

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.truck_types enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.delivery_fee_cache enable row level security;
alter table public.site_settings enable row level security;
alter table public.gallery_projects enable row level security;
alter table public.accounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'Public read active categories'
  ) then
    create policy "Public read active categories"
    on public.categories
    for select
    to anon, authenticated
    using (is_active = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Public read active products'
  ) then
    create policy "Public read active products"
    on public.products
    for select
    to anon, authenticated
    using (is_active = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'Public read site settings'
  ) then
    create policy "Public read site settings"
    on public.site_settings
    for select
    to anon, authenticated
    using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'truck_types'
      and policyname = 'Public read truck types'
  ) then
    create policy "Public read truck types"
    on public.truck_types
    for select
    to anon, authenticated
    using (is_active = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'gallery_projects'
      and policyname = 'Public read gallery projects'
  ) then
    create policy "Public read gallery projects"
    on public.gallery_projects
    for select
    to anon, authenticated
    using (true);
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('gallery-projects', 'gallery-projects', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

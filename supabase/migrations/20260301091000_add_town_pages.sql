create table if not exists public.town_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  state text not null default 'NY',
  zip_codes text[] not null default '{}',
  tier text not null check (tier in ('A', 'B')),
  delivery_fee_cents integer not null check (delivery_fee_cents >= 0),
  distance_miles numeric(10,2) not null check (distance_miles >= 0),
  drive_minutes integer not null check (drive_minutes >= 0),
  estimated_delivery_minutes integer not null check (estimated_delivery_minutes >= 0),
  local_description text not null,
  local_description_extended text,
  featured_project_ids text[] not null default '{}',
  featured_product_slugs text[] not null default '{}',
  testimonial_quote text,
  testimonial_author text,
  faqs jsonb not null default '[]'::jsonb,
  route_origin text not null default '110 Frowein Road, Center Moriches, NY 11934',
  route_destination text not null,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_town_pages_sort_order
  on public.town_pages (sort_order asc);

create index if not exists idx_town_pages_active
  on public.town_pages (is_active, sort_order asc);

drop trigger if exists set_town_pages_updated_at on public.town_pages;
create trigger set_town_pages_updated_at
before update on public.town_pages
for each row execute function public.set_updated_at();

alter table public.town_pages enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'town_pages'
      and policyname = 'Public read active town pages'
  ) then
    create policy "Public read active town pages"
    on public.town_pages
    for select
    to anon, authenticated
    using (is_active = true);
  end if;
end
$$;

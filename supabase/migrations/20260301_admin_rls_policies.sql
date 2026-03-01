-- Helper function: check if the current user is an admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.accounts
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- Products: admin write access
create policy "Admin can insert products" on products for insert to authenticated using (public.is_admin());
create policy "Admin can update products" on products for update to authenticated using (public.is_admin());
create policy "Admin can delete products" on products for delete to authenticated using (public.is_admin());
create policy "Admin can read all products" on products for select to authenticated using (public.is_admin());

-- Categories: admin write access
create policy "Admin can insert categories" on categories for insert to authenticated using (public.is_admin());
create policy "Admin can update categories" on categories for update to authenticated using (public.is_admin());
create policy "Admin can delete categories" on categories for delete to authenticated using (public.is_admin());
create policy "Admin can read all categories" on categories for select to authenticated using (public.is_admin());

-- Site settings: admin update access
create policy "Admin can update site_settings" on site_settings for update to authenticated using (public.is_admin());
create policy "Admin can read site_settings" on site_settings for select to authenticated using (public.is_admin());

-- Truck types: admin write access
create policy "Admin can insert truck_types" on truck_types for insert to authenticated using (public.is_admin());
create policy "Admin can update truck_types" on truck_types for update to authenticated using (public.is_admin());
create policy "Admin can delete truck_types" on truck_types for delete to authenticated using (public.is_admin());
create policy "Admin can read all truck_types" on truck_types for select to authenticated using (public.is_admin());

-- Gallery projects: admin write access
create policy "Admin can insert gallery_projects" on gallery_projects for insert to authenticated using (public.is_admin());
create policy "Admin can update gallery_projects" on gallery_projects for update to authenticated using (public.is_admin());
create policy "Admin can delete gallery_projects" on gallery_projects for delete to authenticated using (public.is_admin());
create policy "Admin can read all gallery_projects" on gallery_projects for select to authenticated using (public.is_admin());

-- Orders: admin can read all and update status
create policy "Admin can read all orders" on orders for select to authenticated using (public.is_admin());
create policy "Admin can update orders" on orders for update to authenticated using (public.is_admin());

-- Order items: admin can read all
create policy "Admin can read all order_items" on order_items for select to authenticated using (public.is_admin());

-- Delivery fee cache: admin can read and delete
create policy "Admin can read delivery_fee_cache" on delivery_fee_cache for select to authenticated using (public.is_admin());
create policy "Admin can delete delivery_fee_cache" on delivery_fee_cache for delete to authenticated using (public.is_admin());

-- Accounts: admin can read all and update roles
create policy "Admin can read all accounts" on accounts for select to authenticated using (public.is_admin());
create policy "Admin can update accounts" on accounts for update to authenticated using (public.is_admin());

-- Town pages: admin write access
create policy "Admin can insert town_pages" on town_pages for insert to authenticated using (public.is_admin());
create policy "Admin can update town_pages" on town_pages for update to authenticated using (public.is_admin());
create policy "Admin can delete town_pages" on town_pages for delete to authenticated using (public.is_admin());

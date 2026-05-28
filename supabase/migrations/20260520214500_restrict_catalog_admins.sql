-- Restrict catalog management to the approved Mega Equipamentos admin emails.

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'soutoedsonf@gmail.com',
    'joaoaraujoynwa@gmail.com',
    'megaequipamentospe@gmail.com',
    'thiagoprazeres@gmail.com'
  ]);
$$;

drop policy if exists "Authenticated can read all categories" on public.categories;
create policy "Authenticated can read all categories"
on public.categories for select
to authenticated
using (public.is_catalog_admin());

drop policy if exists "Authenticated can read all products" on public.products;
create policy "Authenticated can read all products"
on public.products for select
to authenticated
using (public.is_catalog_admin());

drop policy if exists "Authenticated can create products" on public.products;
create policy "Authenticated can create products"
on public.products for insert
to authenticated
with check (public.is_catalog_admin());

drop policy if exists "Authenticated can update products" on public.products;
create policy "Authenticated can update products"
on public.products for update
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

drop policy if exists "Authenticated can read all prices" on public.product_prices;
create policy "Authenticated can read all prices"
on public.product_prices for select
to authenticated
using (public.is_catalog_admin());

drop policy if exists "Authenticated can create prices" on public.product_prices;
create policy "Authenticated can create prices"
on public.product_prices for insert
to authenticated
with check (public.is_catalog_admin());

drop policy if exists "Authenticated can update prices" on public.product_prices;
create policy "Authenticated can update prices"
on public.product_prices for update
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

-- Rename the catalog domain from products to equipments.

do $$
begin
  if to_regclass('public.equipments') is null and to_regclass('public.products') is not null then
    alter table public.products rename to equipments;
  end if;

  if to_regclass('public.equipment_prices') is null and to_regclass('public.product_prices') is not null then
    alter table public.product_prices rename to equipment_prices;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'equipment_prices'
      and column_name = 'product_id'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'equipment_prices'
      and column_name = 'equipment_id'
  ) then
    alter table public.equipment_prices rename column product_id to equipment_id;
  end if;
end $$;

do $$
begin
  if to_regclass('public.products_category_id_idx') is not null then
    alter index public.products_category_id_idx rename to equipments_category_id_idx;
  end if;

  if to_regclass('public.products_status_idx') is not null then
    alter index public.products_status_idx rename to equipments_status_idx;
  end if;

  if to_regclass('public.product_prices_pkey') is not null then
    alter index public.product_prices_pkey rename to equipment_prices_pkey;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'products_set_updated_at'
      and tgrelid = 'public.equipments'::regclass
  ) then
    alter trigger products_set_updated_at on public.equipments rename to equipments_set_updated_at;
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgname = 'product_prices_set_updated_at'
      and tgrelid = 'public.equipment_prices'::regclass
  ) then
    alter trigger product_prices_set_updated_at on public.equipment_prices rename to equipment_prices_set_updated_at;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'equipment_prices'
      and constraint_name = 'product_prices_product_id_fkey'
  ) then
    alter table public.equipment_prices
      rename constraint product_prices_product_id_fkey to equipment_prices_equipment_id_fkey;
  end if;
end $$;

drop policy if exists "Public can read active products" on public.equipments;
drop policy if exists "Authenticated can read all products" on public.equipments;
drop policy if exists "Authenticated can create products" on public.equipments;
drop policy if exists "Authenticated can update products" on public.equipments;

drop policy if exists "Public can read prices for active products" on public.equipment_prices;
drop policy if exists "Authenticated can read all prices" on public.equipment_prices;
drop policy if exists "Authenticated can create prices" on public.equipment_prices;
drop policy if exists "Authenticated can update prices" on public.equipment_prices;

create policy "Public can read active equipments"
on public.equipments for select
to anon, authenticated
using (status = 'active');

create policy "Authenticated can read all equipments"
on public.equipments for select
to authenticated
using (public.is_catalog_admin());

create policy "Authenticated can create equipments"
on public.equipments for insert
to authenticated
with check (public.is_catalog_admin());

create policy "Authenticated can update equipments"
on public.equipments for update
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

create policy "Public can read prices for active equipments"
on public.equipment_prices for select
to anon, authenticated
using (
  exists (
    select 1
    from public.equipments equipment
    where equipment.id = equipment_prices.equipment_id
      and equipment.status = 'active'
  )
);

create policy "Authenticated can read all equipment prices"
on public.equipment_prices for select
to authenticated
using (public.is_catalog_admin());

create policy "Authenticated can create equipment prices"
on public.equipment_prices for insert
to authenticated
with check (public.is_catalog_admin());

create policy "Authenticated can update equipment prices"
on public.equipment_prices for update
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

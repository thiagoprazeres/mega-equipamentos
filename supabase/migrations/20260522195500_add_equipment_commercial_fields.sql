-- Preserve the commercial columns that came from the consolidated price sheet.
alter table public.equipments
  add column if not exists catalog_item text not null default '',
  add column if not exists asset_value_cents integer not null default 0,
  add column if not exists total_invested_cents integer not null default 0,
  add column if not exists monthly_profitability_percent numeric(7, 2) not null default 0,
  add column if not exists notes text not null default '';

update public.equipments
set
  catalog_item = coalesce(catalog_item, ''),
  asset_value_cents = coalesce(asset_value_cents, 0),
  total_invested_cents = coalesce(total_invested_cents, 0),
  monthly_profitability_percent = coalesce(monthly_profitability_percent, 0),
  notes = coalesce(notes, '');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'equipments_asset_value_cents_check'
      and conrelid = 'public.equipments'::regclass
  ) then
    alter table public.equipments
      add constraint equipments_asset_value_cents_check check (asset_value_cents >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'equipments_total_invested_cents_check'
      and conrelid = 'public.equipments'::regclass
  ) then
    alter table public.equipments
      add constraint equipments_total_invested_cents_check check (total_invested_cents >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'equipments_monthly_profitability_percent_check'
      and conrelid = 'public.equipments'::regclass
  ) then
    alter table public.equipments
      add constraint equipments_monthly_profitability_percent_check
      check (monthly_profitability_percent >= 0);
  end if;
end $$;

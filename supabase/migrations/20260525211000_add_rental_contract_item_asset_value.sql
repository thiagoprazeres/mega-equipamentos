alter table public.rental_contract_items
  add column if not exists asset_value_cents integer not null default 0;

update public.rental_contract_items as item
set asset_value_cents = coalesce(equipment.asset_value_cents, 0)
from public.equipments as equipment
where item.equipment_id = equipment.id
  and item.asset_value_cents = 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_contract_items_asset_value_cents_check'
      and conrelid = 'public.rental_contract_items'::regclass
  ) then
    alter table public.rental_contract_items
      add constraint rental_contract_items_asset_value_cents_check check (asset_value_cents >= 0);
  end if;
end $$;

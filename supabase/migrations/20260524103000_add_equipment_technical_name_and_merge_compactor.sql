alter table public.equipments
add column if not exists technical_name text not null default '';

update public.equipments
set technical_name = ''
where technical_name is null;

do $$
declare
  commercial_id integer;
  technical_id integer;
begin
  select id into commercial_id
  from public.equipments
  where slug = 'compactador-de-solo-sapo'
  limit 1;

  select id into technical_id
  from public.equipments
  where slug = 'compactador-de-percussao-ram75m-com-motor-menegotti-165-cb'
  limit 1;

  if commercial_id is not null then
    update public.equipments
    set technical_name = 'Compactador de percussão RAM75M com motor Menegotti 165 CB'
    where id = commercial_id;
  end if;

  if commercial_id is not null and technical_id is not null then
    update public.equipments commercial
    set
      catalog_item = technical.catalog_item,
      asset_value_cents = technical.asset_value_cents,
      total_invested_cents = technical.total_invested_cents,
      monthly_profitability_percent = technical.monthly_profitability_percent,
      stock_quantity = technical.stock_quantity
    from public.equipments technical
    where commercial.id = commercial_id
      and technical.id = technical_id;

    insert into public.equipment_prices (
      equipment_id,
      daily_price_cents,
      weekly_price_cents,
      fortnightly_price_cents,
      monthly_price_cents,
      currency
    )
    select
      commercial_id,
      daily_price_cents,
      weekly_price_cents,
      fortnightly_price_cents,
      monthly_price_cents,
      currency
    from public.equipment_prices
    where equipment_id = technical_id
    on conflict (equipment_id) do update set
      daily_price_cents = excluded.daily_price_cents,
      weekly_price_cents = excluded.weekly_price_cents,
      fortnightly_price_cents = excluded.fortnightly_price_cents,
      monthly_price_cents = excluded.monthly_price_cents,
      currency = excluded.currency;

    update public.rental_contract_items
    set equipment_id = commercial_id
    where equipment_id = technical_id;

    update public.equipments
    set status = 'archived'
    where id = technical_id;
  end if;
end $$;

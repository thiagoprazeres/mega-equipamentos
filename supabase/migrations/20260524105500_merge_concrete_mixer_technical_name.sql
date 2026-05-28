do $$
declare
  commercial_id integer;
  technical_id integer;
  duplicate_id integer;
begin
  select id into commercial_id
  from public.equipments
  where slug = 'betoneira-200-400-l'
  limit 1;

  select id into technical_id
  from public.equipments
  where slug = 'betoneira-400-l-rental-2cv-220-v'
  limit 1;

  select id into duplicate_id
  from public.equipments
  where slug = 'betoneira-400-l-rental-max-2cv-220-v'
  limit 1;

  if commercial_id is not null then
    update public.equipments
    set technical_name = 'Betoneira 400 L Rental - 2CV - 220 V'
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
    set
      equipment_id = commercial_id,
      equipment_name = 'Betoneira (200–400 L)'
    where equipment_id in (technical_id, duplicate_id);

    update public.equipments
    set status = 'archived'
    where id = technical_id;
  end if;

  if duplicate_id is not null then
    delete from public.equipment_prices
    where equipment_id = duplicate_id;

    delete from public.equipments
    where id = duplicate_id;
  end if;
end $$;

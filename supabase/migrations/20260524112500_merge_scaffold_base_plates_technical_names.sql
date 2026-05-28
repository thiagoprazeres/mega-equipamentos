do $$
declare
  fixed_commercial_id integer;
  fixed_technical_id integer;
  adjustable_commercial_id integer;
  adjustable_technical_id integer;
begin
  select id into fixed_commercial_id
  from public.equipments
  where slug = 'sapata-fixa'
  limit 1;

  select id into fixed_technical_id
  from public.equipments
  where slug = 'sapatas-fixas-p-andaime'
  limit 1;

  select id into adjustable_commercial_id
  from public.equipments
  where slug = 'sapata-ajustavel'
  limit 1;

  select id into adjustable_technical_id
  from public.equipments
  where slug = 'sapatas-ajustaveis-p-andaime'
  limit 1;

  if fixed_commercial_id is not null then
    update public.equipments
    set technical_name = 'Sapatas fixas p/ andaime'
    where id = fixed_commercial_id;
  end if;

  if fixed_commercial_id is not null and fixed_technical_id is not null then
    update public.equipments commercial
    set
      catalog_item = technical.catalog_item,
      asset_value_cents = technical.asset_value_cents,
      total_invested_cents = technical.total_invested_cents,
      monthly_profitability_percent = technical.monthly_profitability_percent,
      stock_quantity = technical.stock_quantity
    from public.equipments technical
    where commercial.id = fixed_commercial_id
      and technical.id = fixed_technical_id;

    insert into public.equipment_prices (
      equipment_id,
      daily_price_cents,
      weekly_price_cents,
      fortnightly_price_cents,
      monthly_price_cents,
      currency
    )
    select
      fixed_commercial_id,
      daily_price_cents,
      weekly_price_cents,
      fortnightly_price_cents,
      monthly_price_cents,
      currency
    from public.equipment_prices
    where equipment_id = fixed_technical_id
    on conflict (equipment_id) do update set
      daily_price_cents = excluded.daily_price_cents,
      weekly_price_cents = excluded.weekly_price_cents,
      fortnightly_price_cents = excluded.fortnightly_price_cents,
      monthly_price_cents = excluded.monthly_price_cents,
      currency = excluded.currency;

    update public.rental_contract_items
    set
      equipment_id = fixed_commercial_id,
      equipment_name = 'Sapata Fixa'
    where equipment_id = fixed_technical_id;

    update public.equipments
    set status = 'archived'
    where id = fixed_technical_id;
  end if;

  if adjustable_commercial_id is not null then
    update public.equipments
    set technical_name = 'Sapatas ajustáveis p/ andaime'
    where id = adjustable_commercial_id;
  end if;

  if adjustable_commercial_id is not null and adjustable_technical_id is not null then
    update public.equipments commercial
    set
      catalog_item = technical.catalog_item,
      asset_value_cents = technical.asset_value_cents,
      total_invested_cents = technical.total_invested_cents,
      monthly_profitability_percent = technical.monthly_profitability_percent,
      stock_quantity = technical.stock_quantity
    from public.equipments technical
    where commercial.id = adjustable_commercial_id
      and technical.id = adjustable_technical_id;

    insert into public.equipment_prices (
      equipment_id,
      daily_price_cents,
      weekly_price_cents,
      fortnightly_price_cents,
      monthly_price_cents,
      currency
    )
    select
      adjustable_commercial_id,
      daily_price_cents,
      weekly_price_cents,
      fortnightly_price_cents,
      monthly_price_cents,
      currency
    from public.equipment_prices
    where equipment_id = adjustable_technical_id
    on conflict (equipment_id) do update set
      daily_price_cents = excluded.daily_price_cents,
      weekly_price_cents = excluded.weekly_price_cents,
      fortnightly_price_cents = excluded.fortnightly_price_cents,
      monthly_price_cents = excluded.monthly_price_cents,
      currency = excluded.currency;

    update public.rental_contract_items
    set
      equipment_id = adjustable_commercial_id,
      equipment_name = 'Sapata Ajustável'
    where equipment_id = adjustable_technical_id;

    update public.equipments
    set status = 'archived'
    where id = adjustable_technical_id;
  end if;
end $$;

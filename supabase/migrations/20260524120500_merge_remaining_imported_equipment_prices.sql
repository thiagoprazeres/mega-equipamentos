create or replace function pg_temp.merge_imported_equipment(
  commercial_slug text,
  imported_ids integer[],
  new_technical_name text
) returns void
language plpgsql
as $$
declare
  commercial_id integer;
  selected_ids integer[];
begin
  select id into commercial_id
  from public.equipments
  where slug = commercial_slug
    and coalesce(avatar, '') <> ''
  order by id
  limit 1;

  select coalesce(array_agg(id order by id), '{}')
  into selected_ids
  from public.equipments
  where id = any(imported_ids)
    and coalesce(avatar, '') = '';

  if commercial_id is null or cardinality(selected_ids) = 0 then
    return;
  end if;

  with stats as (
    select
      string_agg(distinct e.catalog_item, ' / ' order by e.catalog_item)
        filter (where coalesce(e.catalog_item, '') <> '') as catalog_item,
      max(coalesce(e.asset_value_cents, 0)) as asset_value_cents,
      sum(coalesce(e.total_invested_cents, 0)) as total_invested_cents,
      sum(coalesce(e.stock_quantity, 0)) as stock_quantity,
      round(
        (
          sum(coalesce(p.monthly_price_cents, 0) * coalesce(e.stock_quantity, 0))::numeric
          / nullif(sum(coalesce(e.total_invested_cents, 0)), 0)
        ) * 100,
        2
      ) as monthly_profitability_percent
    from public.equipments e
    left join public.equipment_prices p on p.equipment_id = e.id
    where e.id = any(selected_ids)
  )
  update public.equipments commercial
  set
    technical_name = new_technical_name,
    catalog_item = coalesce(stats.catalog_item, commercial.catalog_item),
    asset_value_cents = coalesce(stats.asset_value_cents, commercial.asset_value_cents),
    total_invested_cents = coalesce(stats.total_invested_cents, commercial.total_invested_cents),
    monthly_profitability_percent = coalesce(
      stats.monthly_profitability_percent,
      commercial.monthly_profitability_percent
    ),
    stock_quantity = coalesce(stats.stock_quantity, commercial.stock_quantity)
  from stats
  where commercial.id = commercial_id;

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
    coalesce(max(daily_price_cents), 0),
    coalesce(max(weekly_price_cents), 0),
    coalesce(max(fortnightly_price_cents), 0),
    coalesce(max(monthly_price_cents), 0),
    coalesce(max(currency), 'BRL')
  from public.equipment_prices
  where equipment_id = any(selected_ids)
  on conflict (equipment_id) do update set
    daily_price_cents = excluded.daily_price_cents,
    weekly_price_cents = excluded.weekly_price_cents,
    fortnightly_price_cents = excluded.fortnightly_price_cents,
    monthly_price_cents = excluded.monthly_price_cents,
    currency = excluded.currency;

  update public.rental_contract_items
  set
    equipment_id = commercial_id,
    equipment_name = (
      select nome
      from public.equipments
      where id = commercial_id
    )
  where equipment_id = any(selected_ids);

  delete from public.equipment_prices
  where equipment_id = any(selected_ids);

  delete from public.equipments
  where id = any(selected_ids);
end;
$$;

select pg_temp.merge_imported_equipment(
  'guarda-corpo-com-sem-porta',
  array[67, 68],
  'Guarda corpo c/ porta / Guarda corpo s/ porta'
);

select pg_temp.merge_imported_equipment(
  'plataforma-metalica',
  array[69],
  'Piso para andaime 1,5 m'
);

select pg_temp.merge_imported_equipment(
  'rodizio-para-andaime',
  array[76],
  'Rodízio de borracha para andaime'
);

select pg_temp.merge_imported_equipment(
  'vibrador-de-concreto',
  array[86],
  'Vibrador de concreto com mangote'
);

select pg_temp.merge_imported_equipment(
  'maquina-de-cortar-piso',
  array[87, 88],
  'Riscadeira de piso - 1,20 m / Riscadeira de piso - 0,9 m'
);

select pg_temp.merge_imported_equipment(
  'martelete-demolidor-30-kg',
  array[85],
  'Martelete 30 kg'
);

select pg_temp.merge_imported_equipment(
  'martelete-2-5-kg',
  array[81],
  'Martelete 900W - 2,5 kg'
);

select pg_temp.merge_imported_equipment(
  'serra-marme',
  array[71, 72, 73],
  'Serra mármore Bosch / Serra mármore Makita / Serra mármore Skil'
);

select pg_temp.merge_imported_equipment(
  'esmerilhadeira',
  array[74],
  'Esmerilhadeira 4"'
);

select pg_temp.merge_imported_equipment(
  'pistola-fincapinos',
  array[77],
  'Pistola finca-pinos - Artengo'
);

select pg_temp.merge_imported_equipment(
  'serra-circular',
  array[70],
  'Serra circular Skil - 1200 W'
);

select pg_temp.merge_imported_equipment(
  'politriz',
  array[75],
  'Politriz 7'''' - verificar especificação'
);

select pg_temp.merge_imported_equipment(
  'nivel-a-laser',
  array[89],
  'Nível à laser - Bosch'
);

select pg_temp.merge_imported_equipment(
  'lixadeira-de-parede',
  array[90],
  'Lixadeira de parede e teto - Menegotti'
);

select pg_temp.merge_imported_equipment(
  'furadeira-e-parafusadeira',
  array[79, 80],
  'Parafusadeira / Furadeira 400W'
);

select pg_temp.merge_imported_equipment(
  'soprador-thermal',
  array[96],
  'Soprador térmico'
);

select pg_temp.merge_imported_equipment(
  'compressor-de-ar-25-l',
  array[102],
  'Compressor de ar - 20 L - 220V'
);

select pg_temp.merge_imported_equipment(
  'bomba-submersa-de-agua-suja-com-mangotes',
  array[93],
  'Bomba submersa com mangueira - água suja/limpa'
);

select pg_temp.merge_imported_equipment(
  'reboque-1-20-x-1-80-m-1-eixo',
  array[98],
  'Reboque médio - 1,80 x 1,20 m'
);

select pg_temp.merge_imported_equipment(
  'reboque-1-60-x-3-00-m-1-eixo',
  array[99],
  'Reboque grande - 3,10 x 1,65 m'
);

select pg_temp.merge_imported_equipment(
  'banheiro-de-obra-modulo-sanitario',
  array[101],
  'Banheiro provisório'
);

select pg_temp.merge_imported_equipment(
  'container-almoxarifado-1-50-x-3-00-x-2-00-m',
  array[100],
  'Container almoxarife 3,0 x 1,5 m'
);

delete from public.equipment_prices
where equipment_id in (
  select id
  from public.equipments
  where id >= 56
    and coalesce(avatar, '') = ''
);

delete from public.equipments
where id >= 56
  and coalesce(avatar, '') = '';

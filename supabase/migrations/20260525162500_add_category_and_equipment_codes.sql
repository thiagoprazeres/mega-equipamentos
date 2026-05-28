alter table public.categories
add column if not exists category_code text not null default '';

update public.categories
set category_code = id::text
where category_code = '';

create unique index if not exists categories_category_code_idx
on public.categories(category_code);

alter table public.equipments
add column if not exists equipment_code text not null default '';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'equipments'
      and column_name = 'catalog_item'
  ) then
    update public.equipments
    set equipment_code = case
      when coalesce(catalog_item, '') = '' then ''
      else regexp_replace(catalog_item, '(^| / )[0-9]+\.', '\1', 'g')
    end
    where equipment_code = '';
  end if;
end $$;

create index if not exists equipments_equipment_code_idx
on public.equipments(equipment_code);

alter table public.equipments
drop column if exists catalog_item;

-- Add basic physical stock control for equipments.

alter table public.equipments
  add column if not exists stock_quantity integer not null default 0;

update public.equipments
set stock_quantity = 0
where stock_quantity is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'equipments_stock_quantity_check'
      and conrelid = 'public.equipments'::regclass
  ) then
    alter table public.equipments
      add constraint equipments_stock_quantity_check check (stock_quantity >= 0);
  end if;
end $$;

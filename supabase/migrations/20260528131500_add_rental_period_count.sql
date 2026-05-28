alter table public.rental_contracts
add column if not exists rental_period_count integer not null default 1;

alter table public.rental_quotes
add column if not exists rental_period_count integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_contracts_rental_period_count_check'
  ) then
    alter table public.rental_contracts
    add constraint rental_contracts_rental_period_count_check
    check (rental_period_count > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_quotes_rental_period_count_check'
  ) then
    alter table public.rental_quotes
    add constraint rental_quotes_rental_period_count_check
    check (rental_period_count > 0);
  end if;
end $$;

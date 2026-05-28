alter table public.rental_contracts
  add column if not exists discount_cents integer not null default 0,
  add column if not exists surcharge_cents integer not null default 0;

alter table public.rental_quotes
  add column if not exists discount_cents integer not null default 0,
  add column if not exists surcharge_cents integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_contracts_discount_cents_check'
      and conrelid = 'public.rental_contracts'::regclass
  ) then
    alter table public.rental_contracts
      add constraint rental_contracts_discount_cents_check check (discount_cents >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_contracts_surcharge_cents_check'
      and conrelid = 'public.rental_contracts'::regclass
  ) then
    alter table public.rental_contracts
      add constraint rental_contracts_surcharge_cents_check check (surcharge_cents >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_quotes_discount_cents_check'
      and conrelid = 'public.rental_quotes'::regclass
  ) then
    alter table public.rental_quotes
      add constraint rental_quotes_discount_cents_check check (discount_cents >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_quotes_surcharge_cents_check'
      and conrelid = 'public.rental_quotes'::regclass
  ) then
    alter table public.rental_quotes
      add constraint rental_quotes_surcharge_cents_check check (surcharge_cents >= 0);
  end if;
end $$;

update public.rental_contracts
set total_cents = greatest(0, subtotal_cents + shipping_cents - discount_cents + surcharge_cents);

update public.rental_quotes
set total_cents = greatest(0, subtotal_cents + shipping_cents - discount_cents + surcharge_cents);

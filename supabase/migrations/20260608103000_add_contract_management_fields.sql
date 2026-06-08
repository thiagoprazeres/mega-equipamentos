alter table public.rental_contracts
  add column if not exists due_date date,
  add column if not exists payment_date date,
  add column if not exists payment_method text not null default 'not_defined',
  add column if not exists financial_status text not null default 'pending',
  add column if not exists operational_code text not null default 'SR';

update public.rental_contracts
set due_date = coalesce(due_date, start_date)
where due_date is null;

update public.rental_contracts
set financial_status = 'cancelled'
where status = 'cancelled'
  and financial_status = 'pending';

update public.rental_contracts
set operational_code = 'SR/C'
where status in ('closed', 'returned')
  and operational_code = 'SR';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rental_contracts_payment_method_check'
  ) then
    alter table public.rental_contracts
      add constraint rental_contracts_payment_method_check
      check (payment_method in (
        'not_defined',
        'pix',
        'cash',
        'credit_card',
        'debit_card',
        'bank_transfer',
        'boleto',
        'courtesy',
        'other'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'rental_contracts_financial_status_check'
  ) then
    alter table public.rental_contracts
      add constraint rental_contracts_financial_status_check
      check (financial_status in ('pending', 'paid', 'overdue', 'partial', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'rental_contracts_operational_code_check'
  ) then
    alter table public.rental_contracts
      add constraint rental_contracts_operational_code_check
      check (operational_code in ('CR', 'SR', 'SR/C'));
  end if;
end $$;

create index if not exists rental_contracts_due_date_idx
  on public.rental_contracts(due_date);

create index if not exists rental_contracts_financial_status_idx
  on public.rental_contracts(financial_status);

create index if not exists rental_contracts_operational_code_idx
  on public.rental_contracts(operational_code);

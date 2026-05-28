alter table public.rental_contracts
add column if not exists billing_period text not null default 'daily';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_contracts_billing_period_check'
      and conrelid = 'public.rental_contracts'::regclass
  ) then
    alter table public.rental_contracts
    add constraint rental_contracts_billing_period_check
    check (billing_period in ('daily', 'weekly', 'fortnightly', 'monthly'));
  end if;
end $$;

with selected_periods as (
  select
    contract_id,
    case max(
      case billing_period
        when 'monthly' then 4
        when 'fortnightly' then 3
        when 'weekly' then 2
        else 1
      end
    )
      when 4 then 'monthly'
      when 3 then 'fortnightly'
      when 2 then 'weekly'
      else 'daily'
    end as billing_period
  from public.rental_contract_items
  group by contract_id
)
update public.rental_contracts as contract
set billing_period = selected_periods.billing_period
from selected_periods
where contract.id = selected_periods.contract_id;

update public.rental_contract_items as item
set billing_period = contract.billing_period
from public.rental_contracts as contract
where item.contract_id = contract.id
  and item.billing_period <> contract.billing_period;

update public.rental_contracts
set end_date = case billing_period
  when 'monthly' then (start_date + interval '1 month')::date
  when 'fortnightly' then start_date + 15
  when 'weekly' then start_date + 7
  else start_date + 1
end;

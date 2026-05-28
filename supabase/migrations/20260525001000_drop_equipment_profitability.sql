alter table public.equipments
drop constraint if exists equipments_monthly_profitability_percent_check;

alter table public.equipments
drop column if exists monthly_profitability_percent;

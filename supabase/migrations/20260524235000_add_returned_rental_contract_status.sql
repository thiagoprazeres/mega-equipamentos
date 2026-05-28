alter table public.rental_contracts
drop constraint if exists rental_contracts_status_check;

alter table public.rental_contracts
add constraint rental_contracts_status_check
check (status in ('draft', 'active', 'closed', 'returned', 'cancelled'));

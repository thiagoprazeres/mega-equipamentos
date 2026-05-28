alter table public.rental_contracts
add column if not exists worksite_address text not null default '';

update public.rental_contracts
set worksite_address = delivery_address
where worksite_address = ''
  and delivery_address <> '';

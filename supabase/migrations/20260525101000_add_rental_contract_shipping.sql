-- Add shipping_cents column to rental_contracts
alter table public.rental_contracts
add column shipping_cents integer not null default 6000 check (shipping_cents >= 0);

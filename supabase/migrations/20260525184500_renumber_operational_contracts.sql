alter table public.rental_contracts
  add column if not exists previous_contract_number text;

create or replace function public.format_rental_contract_number(value bigint)
returns text
language sql
immutable
as $$
  with digits as (
    select value::text as text_value
  ),
  chunks as (
    select
      reverse(substring(reverse(digits.text_value) from ((part_index - 1) * 3 + 1) for 3)) as chunk,
      part_index
    from digits
    cross join generate_series(1, ceil(length(digits.text_value) / 3.0)::integer) as part_index
  )
  select string_agg(chunk, '.' order by part_index desc)
  from chunks;
$$;

do $$
declare
  target_conflicts text;
  last_contract_number bigint;
begin
  with candidates as (
    select
      id,
      row_number() over (
        order by substring(contract_number from 'MEGA-[0-9]{4}-([0-9]+)')::integer, id
      ) as sequence_offset
    from public.rental_contracts
    where contract_number ~ '^MEGA-[0-9]{4}-[0-9]+$'
  ),
  target_numbers as (
    select public.format_rental_contract_number(1999 + sequence_offset) as contract_number
    from candidates
  )
  select string_agg(target_numbers.contract_number, ', ' order by target_numbers.contract_number)
  into target_conflicts
  from target_numbers
  join public.rental_contracts existing
    on existing.contract_number = target_numbers.contract_number;

  if target_conflicts is not null then
    raise exception 'Cannot renumber rental contracts because target contract numbers already exist: %', target_conflicts;
  end if;

  with candidates as (
    select
      id,
      contract_number,
      row_number() over (
        order by substring(contract_number from 'MEGA-[0-9]{4}-([0-9]+)')::integer, id
      ) as sequence_offset
    from public.rental_contracts
    where contract_number ~ '^MEGA-[0-9]{4}-[0-9]+$'
  )
  update public.rental_contracts contracts
  set
    previous_contract_number = coalesce(contracts.previous_contract_number, candidates.contract_number),
    contract_number = public.format_rental_contract_number(1999 + candidates.sequence_offset)
  from candidates
  where contracts.id = candidates.id;

  select max(replace(contract_number, '.', '')::bigint)
  into last_contract_number
  from public.rental_contracts
  where previous_contract_number ~ '^MEGA-[0-9]{4}-[0-9]+$'
    and contract_number ~ '^[0-9]{1,3}(\.[0-9]{3})*$';

  last_contract_number := greatest(2003, coalesce(last_contract_number, 1999));

  perform setval('public.rental_contract_number_seq', last_contract_number, true);
end $$;

alter table public.rental_contracts
  alter column contract_number set default public.format_rental_contract_number(
    nextval('public.rental_contract_number_seq')
  );

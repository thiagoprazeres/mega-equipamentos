-- Single company profile used by management PDFs and operational documents.

create table if not exists public.company_profile (
  id integer primary key default 1 check (id = 1),
  legal_name text not null,
  trade_name text not null default '',
  document text not null default '',
  pix_key text not null default '',
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  zip_code text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.company_profile (
  id,
  legal_name,
  trade_name,
  document,
  pix_key,
  email,
  phone,
  whatsapp,
  address,
  city,
  state,
  zip_code
)
values (
  1,
  'MEGA EQUIPAMENTOS LTDA',
  'Mega Equipamentos',
  '58.471.366/0001-29',
  '58.471.366/0001-29',
  'megaequipamentospe@gmail.com',
  '(81) 98555-5943',
  '(81) 98555-5943',
  'Av. Zé Tatú, 11B - Jardim Boa Vista',
  'Caruaru',
  'PE',
  '55038-220'
)
on conflict (id) do nothing;

drop trigger if exists company_profile_set_updated_at on public.company_profile;
create trigger company_profile_set_updated_at
before update on public.company_profile
for each row execute function public.set_updated_at();

alter table public.company_profile enable row level security;

drop policy if exists "Authenticated catalog admins can read company profile" on public.company_profile;
create policy "Authenticated catalog admins can read company profile"
on public.company_profile for select
to authenticated
using (public.is_catalog_admin());

drop policy if exists "Authenticated catalog admins can update company profile" on public.company_profile;
create policy "Authenticated catalog admins can update company profile"
on public.company_profile for update
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

drop policy if exists "Authenticated catalog admins can create company profile" on public.company_profile;
create policy "Authenticated catalog admins can create company profile"
on public.company_profile for insert
to authenticated
with check (public.is_catalog_admin());

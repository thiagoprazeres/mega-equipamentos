do $$
begin
  if to_regclass('public.staff_users') is null and to_regclass('public.sellers') is not null then
    alter table public.sellers rename to staff_users;
  end if;
end $$;

alter table public.staff_users
  add column if not exists auth_user_id uuid,
  add column if not exists role text not null default 'vendedor';

update public.staff_users
set role = 'vendedor'
where role = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_users_role_check'
      and conrelid = 'public.staff_users'::regclass
  ) then
    alter table public.staff_users
      add constraint staff_users_role_check check (role in ('admin', 'vendedor', 'operador', 'financeiro'));
  end if;
end $$;

create index if not exists staff_users_status_idx on public.staff_users(status);
create index if not exists staff_users_nome_idx on public.staff_users(nome);
create index if not exists staff_users_role_idx on public.staff_users(role);
create index if not exists staff_users_auth_user_id_idx on public.staff_users(auth_user_id);

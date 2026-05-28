-- Keep bootstrap owner accounts authorized while active staff users remain the main access model.

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with bootstrap_admins(email) as (
    values
      ('soutoedsonf@gmail.com'),
      ('joaoaraujoynwa@gmail.com'),
      ('megaequipamentospe@gmail.com'),
      ('thiagoprazeres@gmail.com')
  ),
  session_claims as (
    select
      auth.uid() as user_id,
      lower(coalesce(
        nullif(auth.jwt() ->> 'email', ''),
        nullif(auth.jwt() #>> '{user_metadata,email}', ''),
        nullif(auth.jwt() #>> '{app_metadata,email}', ''),
        ''
      )) as email
  )
  select exists (
    select 1
    from bootstrap_admins admin
    where admin.email = (select email from session_claims)
  )
  or exists (
    select 1
    from auth.users auth_user
    join bootstrap_admins admin on admin.email = lower(auth_user.email)
    where auth_user.id = (select user_id from session_claims)
  )
  or exists (
    select 1
    from public.staff_users staff
    where staff.status = 'active'
      and (
        staff.auth_user_id = (select user_id from session_claims)
        or lower(staff.email) = (select email from session_claims)
      )
  )
  or exists (
    select 1
    from auth.users auth_user
    join public.staff_users staff
      on staff.status = 'active'
      and (
        staff.auth_user_id = auth_user.id
        or lower(staff.email) = lower(auth_user.email)
      )
    where auth_user.id = (select user_id from session_claims)
  );
$$;

revoke all on function public.is_catalog_admin() from public;
grant execute on function public.is_catalog_admin() to anon, authenticated;

-- Make catalog admin checks robust for Google OAuth sessions.

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with allowed_admins(email) as (
    values
      ('soutoedsonf@gmail.com'),
      ('joaoaraujoynwa@gmail.com'),
      ('megaequipamentospe@gmail.com'),
      ('thiagoprazeres@gmail.com')
  ),
  session_claims as (
    select lower(coalesce(
      nullif(auth.jwt() ->> 'email', ''),
      nullif(auth.jwt() #>> '{user_metadata,email}', ''),
      nullif(auth.jwt() #>> '{app_metadata,email}', ''),
      ''
    )) as email
  )
  select exists (
    select 1
    from allowed_admins admin
    where admin.email = (select email from session_claims)
  )
  or exists (
    select 1
    from auth.users auth_user
    join allowed_admins admin on admin.email = lower(auth_user.email)
    where auth_user.id = auth.uid()
  );
$$;

revoke all on function public.is_catalog_admin() from public;
grant execute on function public.is_catalog_admin() to anon, authenticated;

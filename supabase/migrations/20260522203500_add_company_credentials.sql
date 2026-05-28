alter table public.company_profile
add column if not exists gmail_password text not null default '',
add column if not exists instagram_login text not null default '',
add column if not exists instagram_password text not null default '';

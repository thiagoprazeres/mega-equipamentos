insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipment-images',
  'equipment-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read equipment images" on storage.objects;
create policy "Public can read equipment images"
on storage.objects
for select
to public
using (bucket_id = 'equipment-images');

drop policy if exists "Catalog admins can upload equipment images" on storage.objects;
create policy "Catalog admins can upload equipment images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'equipment-images'
  and public.is_catalog_admin()
);

drop policy if exists "Catalog admins can update equipment images" on storage.objects;
create policy "Catalog admins can update equipment images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'equipment-images'
  and public.is_catalog_admin()
)
with check (
  bucket_id = 'equipment-images'
  and public.is_catalog_admin()
);

drop policy if exists "Catalog admins can delete equipment images" on storage.objects;
create policy "Catalog admins can delete equipment images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'equipment-images'
  and public.is_catalog_admin()
);

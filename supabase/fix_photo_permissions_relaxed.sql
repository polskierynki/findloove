-- Relax photo permissions for authenticated users
-- Use this if strict owner-based policies still block uploads/deletes.

begin;

-- TABLE: public.profile_photos
alter table public.profile_photos enable row level security;

-- Drop old policies (strict and legacy)
drop policy if exists "Public read photos" on public.profile_photos;
drop policy if exists "Users can insert own photos" on public.profile_photos;
drop policy if exists "Users can update own photos" on public.profile_photos;
drop policy if exists "Users can delete own photos" on public.profile_photos;
drop policy if exists "Users can manage own photos" on public.profile_photos;
drop policy if exists "Public insert photos" on public.profile_photos;
drop policy if exists "Public update photos" on public.profile_photos;
drop policy if exists "Public delete photos" on public.profile_photos;

-- Public can read photos
create policy "Public read photos"
  on public.profile_photos
  for select
  using (true);

-- Any authenticated user can manage rows in this table
-- (application UI still operates on current user's profile)
create policy "Authenticated insert photos"
  on public.profile_photos
  for insert
  to authenticated
  with check (true);

create policy "Authenticated update photos"
  on public.profile_photos
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated delete photos"
  on public.profile_photos
  for delete
  to authenticated
  using (true);

-- STORAGE BUCKET: profile-photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Drop old storage policies
drop policy if exists "Profile photos public read" on storage.objects;
drop policy if exists "Profile photos upload own folder" on storage.objects;
drop policy if exists "Profile photos update own folder" on storage.objects;
drop policy if exists "Profile photos delete own folder" on storage.objects;

-- Public read, authenticated write/update/delete in profile-photos bucket
create policy "Profile photos public read"
  on storage.objects
  for select
  using (bucket_id = 'profile-photos');

create policy "Profile photos authenticated upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'profiles'
  );

create policy "Profile photos authenticated update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'profiles'
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'profiles'
  );

create policy "Profile photos authenticated delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'profiles'
  );

commit;

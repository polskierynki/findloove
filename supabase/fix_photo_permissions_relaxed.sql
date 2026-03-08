-- Relax photo permissions for authenticated users
-- Use this if strict owner-based policies still block uploads/deletes.
-- Idempotent: safe to run multiple times.

begin;

create extension if not exists pgcrypto;

-- Ensure table shape is compatible with app code
create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  is_main boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profile_photos add column if not exists id uuid;
alter table public.profile_photos add column if not exists profile_id uuid;
alter table public.profile_photos add column if not exists url text;
alter table public.profile_photos add column if not exists is_main boolean default false;
alter table public.profile_photos add column if not exists sort_order integer default 0;
alter table public.profile_photos add column if not exists created_at timestamptz default now();

update public.profile_photos set id = gen_random_uuid() where id is null;
update public.profile_photos set is_main = false where is_main is null;
update public.profile_photos set sort_order = 0 where sort_order is null;
update public.profile_photos set created_at = now() where created_at is null;
update public.profile_photos
set url = 'https://ui-avatars.com/api/?name=User&background=e2e8f0&color=475569&size=256'
where url is null or trim(url) = '';

alter table public.profile_photos alter column id set default gen_random_uuid();
alter table public.profile_photos alter column profile_id set not null;
alter table public.profile_photos alter column url set not null;
alter table public.profile_photos alter column is_main set default false;
alter table public.profile_photos alter column is_main set not null;
alter table public.profile_photos alter column sort_order set default 0;
alter table public.profile_photos alter column sort_order set not null;
alter table public.profile_photos alter column created_at set default now();
alter table public.profile_photos alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profile_photos'::regclass
      and contype = 'p'
  ) then
    alter table public.profile_photos add constraint profile_photos_pkey primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_photos_profile_id_fkey'
      and conrelid = 'public.profile_photos'::regclass
  ) then
    alter table public.profile_photos
      add constraint profile_photos_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

create index if not exists profile_photos_profile_sort_idx
  on public.profile_photos (profile_id, sort_order, created_at desc);

-- Grants for PostgREST roles
grant usage on schema public to anon, authenticated;
grant select on public.profile_photos to anon;
grant select, insert, update, delete on public.profile_photos to authenticated;
grant select on public.profiles to anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant usage on schema storage to anon, authenticated;
grant select on storage.objects to anon;
grant select, insert, update, delete on storage.objects to authenticated;

-- TABLE: public.profiles (ensure users can create and update their profiles)
alter table public.profiles enable row level security;

drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Authenticated insert profiles" on public.profiles;
drop policy if exists "Authenticated update profiles" on public.profiles;
drop policy if exists "Public insert profiles" on public.profiles;
drop policy if exists "Public update profiles" on public.profiles;

-- Anyone can read profiles
create policy "Public read profiles"
  on public.profiles
  for select
  using (true);

-- Authenticated users can insert their own profile
create policy "Authenticated insert profiles"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- Authenticated users can update their own profile
create policy "Authenticated update profiles"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

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
drop policy if exists "Authenticated insert photos" on public.profile_photos;
drop policy if exists "Authenticated update photos" on public.profile_photos;
drop policy if exists "Authenticated delete photos" on public.profile_photos;

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
drop policy if exists "Profile photos authenticated upload" on storage.objects;
drop policy if exists "Profile photos authenticated update" on storage.objects;
drop policy if exists "Profile photos authenticated delete" on storage.objects;

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

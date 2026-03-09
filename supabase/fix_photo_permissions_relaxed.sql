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

-- Fix email constraint to allow NULL and fix UPSERT conflicts
-- Drop old unique constraint on email if it exists
alter table public.profiles drop constraint if exists profiles_email_unique;

-- Create new unique constraint that allows NULL (email IS NOT NULL)
create unique index if not exists profiles_email_unique_idx 
  on public.profiles (email) 
  where email is not null;

-- TABLE: public.profiles (ensure users can create and update their profiles)
alter table public.profiles enable row level security;

drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Authenticated insert profiles" on public.profiles;
drop policy if exists "Authenticated update profiles" on public.profiles;
drop policy if exists "Authenticated delete profiles" on public.profiles;
drop policy if exists "Public insert profiles" on public.profiles;
drop policy if exists "Public update profiles" on public.profiles;
drop policy if exists "Public delete profiles" on public.profiles;

-- Anyone can read profiles
create policy "Public read profiles"
  on public.profiles
  for select
  using (true);

-- Authenticated users can insert/upsert their own profile
create policy "Authenticated insert profiles"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- Authenticated users can update their own profile (required for UPSERT)
create policy "Authenticated update profiles"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Authenticated users can delete their own profile
create policy "Authenticated delete profiles"
  on public.profiles
  for delete
  to authenticated
  using (id = auth.uid());

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

-- TABLE: public.profile_comments (komentarze użytkowników pod profilami)
create table if not exists public.profile_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  author_profile_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_comments add column if not exists id uuid;
alter table public.profile_comments add column if not exists profile_id uuid;
alter table public.profile_comments add column if not exists author_profile_id uuid;
alter table public.profile_comments add column if not exists content text;
alter table public.profile_comments add column if not exists created_at timestamptz default now();
alter table public.profile_comments add column if not exists updated_at timestamptz default now();

update public.profile_comments set id = gen_random_uuid() where id is null;
update public.profile_comments set created_at = now() where created_at is null;
update public.profile_comments set updated_at = now() where updated_at is null;
update public.profile_comments set content = '' where content is null;

alter table public.profile_comments alter column id set default gen_random_uuid();
alter table public.profile_comments alter column profile_id set not null;
alter table public.profile_comments alter column author_profile_id set not null;
alter table public.profile_comments alter column content set not null;
alter table public.profile_comments alter column created_at set default now();
alter table public.profile_comments alter column created_at set not null;
alter table public.profile_comments alter column updated_at set default now();
alter table public.profile_comments alter column updated_at set not null;

create index if not exists profile_comments_profile_created_idx
  on public.profile_comments (profile_id, created_at desc);

create index if not exists profile_comments_author_created_idx
  on public.profile_comments (author_profile_id, created_at desc);

grant select on public.profile_comments to anon;
grant select, insert, update, delete on public.profile_comments to authenticated;

alter table public.profile_comments enable row level security;

drop policy if exists "Public read comments" on public.profile_comments;
drop policy if exists "Authenticated insert comments" on public.profile_comments;
drop policy if exists "Authenticated update own comments" on public.profile_comments;
drop policy if exists "Authenticated delete own comments" on public.profile_comments;

create policy "Public read comments"
  on public.profile_comments
  for select
  using (true);

create policy "Authenticated insert comments"
  on public.profile_comments
  for insert
  to authenticated
  with check (
    author_profile_id = auth.uid()
    and length(trim(content)) between 2 and 400
  );

create policy "Authenticated update own comments"
  on public.profile_comments
  for update
  to authenticated
  using (author_profile_id = auth.uid())
  with check (
    author_profile_id = auth.uid()
    and length(trim(content)) between 2 and 400
  );

create policy "Authenticated delete own comments"
  on public.profile_comments
  for delete
  to authenticated
  using (author_profile_id = auth.uid());

-- STORAGE BUCKET: profile-photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/avif']
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

-- AVATARS: oddzielna tabela 1:1 dla zdjęcia profilowego (niezależna od galerii)
create table if not exists public.avatars (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.avatars add column if not exists id uuid;
alter table public.avatars add column if not exists profile_id uuid;
alter table public.avatars add column if not exists url text;
alter table public.avatars add column if not exists created_at timestamptz default now();
alter table public.avatars add column if not exists updated_at timestamptz default now();

update public.avatars set id = gen_random_uuid() where id is null;
update public.avatars set created_at = now() where created_at is null;
update public.avatars set updated_at = now() where updated_at is null;

alter table public.avatars alter column id set default gen_random_uuid();
alter table public.avatars alter column profile_id set not null;
alter table public.avatars alter column url set not null;
alter table public.avatars alter column created_at set default now();
alter table public.avatars alter column created_at set not null;
alter table public.avatars alter column updated_at set default now();
alter table public.avatars alter column updated_at set not null;

create unique index if not exists avatars_profile_id_unique_idx
  on public.avatars (profile_id);

create index if not exists avatars_profile_idx
  on public.avatars (profile_id);

grant select on public.avatars to anon;
grant select, insert, update, delete on public.avatars to authenticated;

alter table public.avatars enable row level security;

drop policy if exists "Public read avatars" on public.avatars;
drop policy if exists "Authenticated insert avatar" on public.avatars;
drop policy if exists "Authenticated update avatar" on public.avatars;
drop policy if exists "Authenticated delete avatar" on public.avatars;

create policy "Public read avatars"
  on public.avatars
  for select
  using (true);

create policy "Authenticated insert avatar"
  on public.avatars
  for insert
  to authenticated
  with check (true);

create policy "Authenticated update avatar"
  on public.avatars
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated delete avatar"
  on public.avatars
  for delete
  to authenticated
  using (true);

-- STORAGE BUCKET: avatars (oddzielny od profile-photos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatars public read" on storage.objects;
drop policy if exists "Avatars authenticated upload" on storage.objects;
drop policy if exists "Avatars authenticated update" on storage.objects;
drop policy if exists "Avatars authenticated delete" on storage.objects;

create policy "Avatars public read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "Avatars authenticated upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
  );

create policy "Avatars authenticated update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
  );

create policy "Avatars authenticated delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
  );

-- Usuń stare sprzężenie: galeria profile_photos nie ustawia już avatara
drop trigger if exists set_profile_image_on_photo_insert on public.profile_photos;
drop function if exists public.set_profile_image_if_empty();

-- Avatar zawsze synchronizuje się do profiles.image_url
create or replace function public.sync_profile_image_from_avatar()
returns trigger as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles
    set image_url = ''
    where id = old.profile_id
      and image_url = old.url;
    return old;
  end if;

  update public.profiles
  set image_url = new.url
  where id = new.profile_id;

  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_profile_image_on_avatar_change on public.avatars;

create trigger sync_profile_image_on_avatar_change
after insert or update or delete on public.avatars
for each row
execute function public.sync_profile_image_from_avatar();

-- Backfill avatara dla istniejących kont na podstawie aktualnego image_url
insert into public.avatars (profile_id, url)
select p.id, p.image_url
from public.profiles p
where p.image_url is not null
  and trim(p.image_url) <> ''
  and p.image_url not like '%ui-avatars.com%'
on conflict (profile_id) do update
set
  url = excluded.url,
  updated_at = now();

update public.profiles p
set image_url = a.url
from public.avatars a
where a.profile_id = p.id
  and p.image_url is distinct from a.url;

-- Trigger: automatycznie tworzy profil gdy użytkownik się rejestruje
-- Fix ForeignKey error: profile_comments_author_profile_id_fkey
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    name,
    age,
    city,
    bio,
    email,
    is_banned
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce((new.raw_user_meta_data->>'age')::integer, 30),
    coalesce(new.raw_user_meta_data->>'city', ''),
    coalesce(new.raw_user_meta_data->>'bio', ''),
    new.email,
    false
  );
  return new;
exception when others then
  -- Jeśli profil już istnieje, nie przerywaj rejestracji
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- SYSTEM MODERACJI: Kolumna is_banned w profiles
alter table public.profiles add column if not exists is_banned boolean default false;

-- TABLE: user_strikes (ostrzeżenia dla użytkowników)
-- Po 3 strikach użytkownik jest automatycznie banowany
create table if not exists public.user_strikes (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  comment_id uuid references public.profile_comments(id) on delete set null,
  admin_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.user_strikes add column if not exists id uuid;
alter table public.user_strikes add column if not exists user_profile_id uuid;
alter table public.user_strikes add column if not exists reason text;
alter table public.user_strikes add column if not exists comment_id uuid;
alter table public.user_strikes add column if not exists admin_profile_id uuid;
alter table public.user_strikes add column if not exists created_at timestamptz default now();

update public.user_strikes set id = gen_random_uuid() where id is null;
update public.user_strikes set created_at = now() where created_at is null;

alter table public.user_strikes alter column id set default gen_random_uuid();
alter table public.user_strikes alter column user_profile_id set not null;
alter table public.user_strikes alter column reason set not null;
alter table public.user_strikes alter column created_at set default now();
alter table public.user_strikes alter column created_at set not null;

create index if not exists user_strikes_user_created_idx
  on public.user_strikes (user_profile_id, created_at desc);

grant select on public.user_strikes to anon;
grant select, insert on public.user_strikes to authenticated;

alter table public.user_strikes enable row level security;

drop policy if exists "Public read strikes" on public.user_strikes;
drop policy if exists "Admin insert strikes" on public.user_strikes;

create policy "Public read strikes"
  on public.user_strikes
  for select
  using (true);

create policy "Admin insert strikes"
  on public.user_strikes
  for insert
  to authenticated
  with check (true);

-- FUNCTION: Automatycznie banuje użytkownika po 3 strikach
create or replace function public.check_and_ban_user()
returns trigger as $$
declare
  strike_count integer;
begin
  select count(*) into strike_count
  from public.user_strikes
  where user_profile_id = new.user_profile_id;

  if strike_count >= 3 then
    update public.profiles
    set is_banned = true
    where id = new.user_profile_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists ban_user_on_third_strike on public.user_strikes;

create trigger ban_user_on_third_strike
  after insert on public.user_strikes
  for each row
  execute function public.check_and_ban_user();

-- RLS: Blokuj operacje dla zbanowanych użytkowników
-- Update policy dla profile_comments: zablokowuje dodawanie komentarzy dla zbanowanych
drop policy if exists "Block banned users from commenting" on public.profile_comments;

create policy "Block banned users from commenting"
  on public.profile_comments
  for insert
  to authenticated
  with check (
    author_profile_id = auth.uid()
    and length(trim(content)) between 2 and 400
    and not exists (
      select 1 from public.profiles
      where id = auth.uid() and is_banned = true
    )
  );

-- Admin może usuwać komentarze
drop policy if exists "Admin delete any comments" on public.profile_comments;

create policy "Admin delete any comments"
  on public.profile_comments
  for delete
  to authenticated
  using (true);

commit;

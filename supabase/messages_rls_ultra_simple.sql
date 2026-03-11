-- =============================================================
-- 🔥 SIMPLE + LEGACY-COMPATIBLE RLS FOR MESSAGES
-- Supports:
-- - profiles.id = auth.uid()
-- - profiles.auth_user_id = auth.uid()
-- - profiles.email = auth.jwt()->>'email'
-- =============================================================

-- Step 1: Enable RLS
alter table public.messages enable row level security;

-- Step 1b: Add durable auth -> profile mapping for legacy accounts.
alter table public.profiles
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_auth_user_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_profiles_auth_user_id
  on public.profiles(auth_user_id);

create or replace function public.sync_profile_auth_user_id()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.auth_user_id is not null then
    return new;
  end if;

  if exists (select 1 from auth.users u where u.id = new.id) then
    new.auth_user_id := new.id;
    return new;
  end if;

  if nullif(trim(coalesce(new.email, '')), '') is not null then
    select u.id
      into new.auth_user_id
    from auth.users u
    where lower(coalesce(u.email, '')) = lower(coalesce(new.email, ''))
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_auth_user_id on public.profiles;

create trigger trg_sync_profile_auth_user_id
before insert or update of id, email, auth_user_id
on public.profiles
for each row
execute function public.sync_profile_auth_user_id();

update public.profiles p
set auth_user_id = p.id
where p.auth_user_id is null
  and exists (
    select 1
    from auth.users u
    where u.id = p.id
  );

update public.profiles p
set auth_user_id = u.id
from auth.users u
where p.auth_user_id is null
  and nullif(trim(coalesce(p.email, '')), '') is not null
  and nullif(trim(coalesce(u.email, '')), '') is not null
  and lower(p.email) = lower(u.email);

-- Step 2: Drop ALL existing policies
drop policy if exists "messages_select_policy" on public.messages;
drop policy if exists "messages_insert_policy" on public.messages;
drop policy if exists "messages_delete_policy" on public.messages;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;
drop policy if exists "messages_delete" on public.messages;

-- Step 3: Create MINIMAL indexes
create index if not exists idx_messages_from_profile 
  on public.messages(from_profile_id);
create index if not exists idx_messages_to_profile 
  on public.messages(to_profile_id);
create index if not exists idx_messages_created 
  on public.messages(created_at desc);

-- Step 4: SIMPLE POLICIES WITH LEGACY PROFILE OWNERSHIP SUPPORT

-- SELECT: Show message if it was sent BY me or TO me
create policy "messages_select"
  on public.messages
  for select
  to authenticated
  using (
    from_profile_id in (
      select p.id
      from public.profiles p
      where p.id = auth.uid()
         or p.auth_user_id = auth.uid()
         or (
           nullif(auth.jwt() ->> 'email', '') is not null
           and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
         )
    )
    or to_profile_id in (
      select p.id
      from public.profiles p
      where p.id = auth.uid()
         or p.auth_user_id = auth.uid()
         or (
           nullif(auth.jwt() ->> 'email', '') is not null
           and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
         )
    )
  );

-- INSERT: Allow sending from any profile that belongs to current account.
create policy "messages_insert"
  on public.messages
  for insert
  to authenticated
  with check (
    from_profile_id in (
      select p.id
      from public.profiles p
      where p.id = auth.uid()
         or p.auth_user_id = auth.uid()
         or (
           nullif(auth.jwt() ->> 'email', '') is not null
           and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
         )
    )
  );

-- DELETE: Allow deleting if I was sender or receiver
create policy "messages_delete"
  on public.messages
  for delete
  to authenticated
  using (
    from_profile_id in (
      select p.id
      from public.profiles p
      where p.id = auth.uid()
         or p.auth_user_id = auth.uid()
         or (
           nullif(auth.jwt() ->> 'email', '') is not null
           and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
         )
    )
    or to_profile_id in (
      select p.id
      from public.profiles p
      where p.id = auth.uid()
         or p.auth_user_id = auth.uid()
         or (
           nullif(auth.jwt() ->> 'email', '') is not null
           and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
         )
    )
  );

-- Step 5: Grant permissions
grant select, insert, delete on public.messages to authenticated;

-- ============================================================
-- Notes
-- - This file backfills `profiles.auth_user_id` when possible.
-- - It also works for old accounts linked only by matching email.
-- ============================================================
/*

select id, auth_user_id, email
from public.profiles
where id = auth.uid()
   or auth_user_id = auth.uid()
   or (
     nullif(auth.jwt() ->> 'email', '') is not null
     and lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
   );

*/

-- ============================================================
-- 📝 TEST: Run this to verify setup works
-- ============================================================
/*

-- 1. Check what sender profile will be used:
select id, auth_user_id, email
from public.profiles
where id = auth.uid()
   or auth_user_id = auth.uid()
   or (
     nullif(auth.jwt() ->> 'email', '') is not null
     and lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
   );

-- 2. Try to read messages (basic SELECT test):
select count(*) from public.messages;

-- 3. Try to insert a test message:
insert into public.messages (from_profile_id, to_profile_id, content)
values (
  (
    select p.id
    from public.profiles p
    where p.id = auth.uid()
       or p.auth_user_id = auth.uid()
       or (
         nullif(auth.jwt() ->> 'email', '') is not null
         and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
       )
    order by case when p.id = auth.uid() then 0 when p.auth_user_id = auth.uid() then 1 else 2 end
    limit 1
  ),
  'put-real-recipient-id-here',
  'Test message'
)
returning *;

*/

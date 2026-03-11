-- =============================================================
-- ULTRA-SIMPLIFIED RLS FOR MESSAGES - v2
-- Start from scratch with testable, minimal policies
-- =============================================================

-- Enable RLS on messages table
alter table public.messages enable row level security;

-- Drop all existing policies (fresh start)
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
  loop
    execute format('drop policy if exists %I on public.messages', p.policyname);
  end loop;
end $$;

-- Create indexes for performance
drop index if exists messages_from_profile_created_idx;
drop index if exists messages_to_profile_created_idx;

create index messages_from_profile_created_idx
  on public.messages(from_profile_id, created_at desc);

create index messages_to_profile_created_idx
  on public.messages(to_profile_id, created_at desc);

-- =============================================================
-- CORE RLS POLICIES - Minimal but working
-- =============================================================

-- POLICY 1: SELECT - User can read messages where they are sender OR receiver
create policy "messages_select_policy"
  on public.messages
  for select
  to authenticated
  using (
    -- Case 1: Direct mapping - my auth.uid() IS the profile ID
    from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
    or
    -- Case 2: My profile exists and I'm sender or receiver
    (
      from_profile_id in (select p.id from public.profiles p where p.id = auth.uid())
      or to_profile_id in (select p.id from public.profiles p where p.id = auth.uid())
    )
    or
    -- Case 3: Match by email (legacy accounts)
    (
      from_profile_id in (
        select p.id 
        from public.profiles p
        where p.email is not null
          and lower(p.email) = lower(
            coalesce(
              (select au.email from auth.users au where au.id = auth.uid()),
              ''
            )
          )
      )
      or to_profile_id in (
        select p.id 
        from public.profiles p
        where p.email is not null
          and lower(p.email) = lower(
            coalesce(
              (select au.email from auth.users au where au.id = auth.uid()),
              ''
            )
          )
      )
    )
  );

-- POLICY 2: INSERT - User can only send FROM a profile that belongs to them
create policy "messages_insert_policy"
  on public.messages
  for insert
  to authenticated
  with check (
    -- Direct match: my auth.uid() matches the sender profile ID
    from_profile_id = auth.uid()
    or
    -- Legacy: There exists a profile with this ID that belongs to my auth.uid()
    from_profile_id in (
      select p.id from public.profiles p where p.id = auth.uid()
    )
    or
    -- More legacy: sender profile email matches my auth email
    from_profile_id in (
      select p.id 
      from public.profiles p
      inner join auth.users au on au.id = auth.uid()
      where au.email is not null
        and p.email is not null
        and lower(au.email) = lower(p.email)
    )
  );

-- POLICY 3: DELETE - User can delete messages they participated in
create policy "messages_delete_policy"
  on public.messages
  for delete
  to authenticated
  using (
    from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
    or
    from_profile_id in (
      select p.id from public.profiles p where p.id = auth.uid()
    )
    or
    to_profile_id in (
      select p.id from public.profiles p where p.id = auth.uid()
    )
    or
    exists (
      select 1 
      from public.profiles p
      inner join auth.users au on au.id = auth.uid()
      where au.email is not null
        and p.email is not null
        and lower(au.email) = lower(p.email)
        and (from_profile_id = p.id or to_profile_id = p.id)
    )
  );

-- =============================================================
-- GRANTS - Allow authenticated users to interact with messages
-- =============================================================
grant select, insert, delete on public.messages to authenticated;

-- =============================================================
-- DIAGNOSTICS - Run these queries in Supabase to verify setup
-- =============================================================
/*

-- 1. Check if RLS is enabled
select relname, relrowsecurity from pg_class where relname = 'messages';

-- 2. Check policies
select policyname, cmd, qual from pg_policies where tablename = 'messages';

-- 3. Check if user has a profile with their auth.uid()
select 
  au.id as auth_user_id,
  au.email,
  p.id as profile_id,
  p.email as profile_email
from auth.users au
left join public.profiles p on p.id = au.id
where au.id = auth.uid();

-- 4. Check messages sent by current user
select id, from_profile_id, to_profile_id, content, created_at
from public.messages
where auth.uid() is not null
limit 10;

-- 5. Try a simple insert (will fail if RLS is blocking)
insert into public.messages (from_profile_id, to_profile_id, content)
values (auth.uid(), '00000000-0000-0000-0000-000000000002', 'Test message')
returning *;

*/

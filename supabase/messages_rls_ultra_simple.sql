-- =============================================================
-- 🔥 ULTRA-SIMPLE RLS - Maximum compatibility, zero complexity
-- This should work for 95% of cases
-- =============================================================

-- Step 1: Enable RLS
alter table public.messages enable row level security;

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

-- Step 4: SIMPLEST POSSIBLE POLICIES
-- No helpers, no subqueries, just direct matching

-- SELECT: Show message if it was sent BY me or TO me
create policy "messages_select"
  on public.messages
  for select
  to authenticated
  using (
    from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
  );

-- INSERT: Allow sending FROM a profile ID that matches my auth.uid()
create policy "messages_insert"
  on public.messages
  for insert
  to authenticated
  with check (
    from_profile_id = auth.uid()
  );

-- DELETE: Allow deleting if I was sender or receiver
create policy "messages_delete"
  on public.messages
  for delete
  to authenticated
  using (
    from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
  );

-- Step 5: Grant permissions
grant select, insert, delete on public.messages to authenticated;

-- ============================================================
-- ⚠️ IMPORTANT: This assumes profiles.id = auth.uid()
-- If your profiles use different ID mapping, fix it first:
-- ============================================================
/*

-- Fix #1: If profiles.id is NOT auth.uid(), make them match:
update public.profiles
set id = user_id
where id != user_id;

-- Fix #2: Or - if you need legacy support, add a mapping column:
alter table public.profiles
add column if not exists user_id uuid unique references auth.users(id);

-- Fix #3: Backfill the mapping:
update public.profiles p
set user_id = (select u.id from auth.users u where u.email = p.email)
where user_id is null and p.email is not null;

*/

-- ============================================================
-- 📝 TEST: Run this to verify setup works
-- ============================================================
/*

-- 1. Check your profile exists:
select * from public.profiles where id = auth.uid();

-- 2. Try to read messages (basic SELECT test):
select count(*) from public.messages;

-- 3. Try to insert a test message:
insert into public.messages (from_profile_id, to_profile_id, content)
values (
  auth.uid(),
  'put-real-recipient-id-here',
  'Test message'
)
returning *;

*/

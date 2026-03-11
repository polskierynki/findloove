-- ============================================================
-- 🔍 DIAGNOSTICS: RUN THESE ONE BY ONE IN SUPABASE SQL EDITOR
-- To understand why messages aren't sending/receiving
-- ============================================================

-- 1️⃣ CHECK: Is current user authenticated?
select auth.uid() as current_auth_uid;
-- Expected: Will show your UUID if logged in, NULL if not

-- ============================================================

-- 2️⃣ CHECK: What profiles exist for your auth account?
select 
  p.id,
  p.email,
  p.name,
  p.created_at,
  case 
    when p.id = auth.uid() then '✅ DIRECT MATCH (profiles.id = auth.uid())'
    when p.email = (select au.email from auth.users au where au.id = auth.uid()) then '⚠️ EMAIL MATCH (legacy)'
    else '❌ NO MATCH'
  end as mapping_status
from public.profiles p
where p.id = auth.uid()
   or p.email = (select au.email from auth.users au where au.id = auth.uid());

-- Expected: Should return at least 1 row with a profile linked to your auth account

-- ============================================================

-- 3️⃣ CHECK: List all messages in the system (ignore RLS)
-- Use this query AS POSTGRES (admin mode) if RLS is blocking

select id, from_profile_id, to_profile_id, content, created_at 
from public.messages
order by created_at desc
limit 20;

-- Expected: Should show recent messages (or empty if no messages yet)

-- ============================================================

-- 4️⃣ CHECK: Try to SELECT messages - will this work with RLS?
select id, from_profile_id, to_profile_id, content, created_at 
from public.messages
where from_profile_id = auth.uid() 
   or to_profile_id = auth.uid()
order by created_at desc;

-- Expected: Messages you sent FROM or TO your profile
-- If error: RLS SELECT policy is blocking

-- ============================================================

-- 5️⃣ TEST: Try to INSERT a test message (will this work?)
-- Change the UUIDs to real profile IDs from check #2 and #3
-- For example if your profile is '123-456' and recipient is '789-abc':

insert into public.messages (from_profile_id, to_profile_id, content)
values (
  auth.uid(),  -- Your auth ID - change to real profile ID if different
  '00000000-0000-0000-0000-000000000002',  -- Change to real recipient profile ID
  'Test message from diagnostics'
)
returning id, from_profile_id, to_profile_id, content, created_at;

-- Expected: Message successfully inserted
-- Error "42501": RLS INSERT policy is blocking
-- Error "42703": Column doesn't exist (schema issue)
-- Error "23503": Foreign key violation (profile doesn't exist)

-- ============================================================

-- 6️⃣ BONUS: Check RLS Status and Policies
select relname, relrowsecurity 
from pg_class 
where relname = 'messages';
-- Expected: relrowsecurity should be 't' (true)

-- ============================================================

-- 7️⃣ BONUS: List all RLS policies on messages table
select 
  policyname,
  cmd,
  permissive,
  qual
from pg_policies 
where tablename = 'messages'
order by policyname;

-- Expected: Should show SELECT, INSERT, DELETE policies we created


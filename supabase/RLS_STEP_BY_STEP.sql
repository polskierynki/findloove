-- ============================================================
-- 🔥 STEP-BY-STEP MESSAGES RLS FIX - COPY & PASTE THIS
-- Follow instructions carefully - run each step in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ⚠️ DO NOT RUN THIS FILE AS A WHOLE
-- Copy each section ONE BY ONE
-- Wait for results before moving to next step
-- ============================================================

-- ============================================================
-- STEP 0: CHECK - What is YOUR auth.uid()?
-- ============================================================
-- Copy & run just this line:
select auth.uid() as "YOUR AUTH UID - COPY THIS VALUE";

-- Expected output: Something like: 550e8400-e29b-41d4-a716-446655440000
-- → Copy this UUID for later use


-- ============================================================
-- STEP 1: CHECK - What profiles exist?
-- ============================================================
-- Copy & run this:
select id, email, name, created_at 
from public.profiles 
order by created_at desc 
limit 10;

-- Expected output: Table of profiles
-- → Take NOTE of:
--   - Your profile ID (should match YOUR AUTH UID from STEP 0)
--   - At least 2 profile IDs for testing


-- ============================================================
-- STEP 2: CHECK - Does YOUR profile match YOUR auth.uid()?
-- ============================================================
-- Copy & run this:
select 
  (select auth.uid()) as auth_uid,
  p.id as profile_id,
  p.auth_user_id,
  p.email,
  case 
    when p.id = (select auth.uid()) then '✅ PERFECT MATCH'
    when p.auth_user_id = (select auth.uid()) then '✅ AUTH_USER_ID MATCH'
    when p.email = (select au.email from auth.users au where au.id = auth.uid()) then '⚠️ EMAIL MATCH (legacy)'
    else '❌ NO MATCH'
  end as status
from public.profiles p
where p.id = (select auth.uid())
   or p.auth_user_id = (select auth.uid())
   or p.email = (select au.email from auth.users au where au.id = auth.uid());

-- Expected output: 1 row with ✅ PERFECT MATCH or ⚠️ EMAIL MATCH
-- Problem?: If 0 rows → your profile is not linked to auth account


-- ============================================================
-- STEP 3: FIX - Apply ultra-simple RLS policies
-- ============================================================
-- Run the full file instead:
-- supabase/messages_rls_ultra_simple.sql

-- Expected: All statements complete without error
-- If error 42501: Permission denied (need admin)


-- ============================================================
-- STEP 4: TEST - Can you READ messages?
-- ============================================================
-- Copy & run this:
select count(*) as total_messages
from public.messages;

-- Expected: Either 0 or some number ≥ 0 (no error)
-- Error 42501? → SELECT policy not working


-- ============================================================
-- STEP 5: TEST - Can you INSERT a message?
-- ============================================================
-- ⚠️ IMPORTANT: Change these UUIDs first!
-- Replace:
--   'YOUR-AUTH-UID-HERE' with value from STEP 0
--   'RECIPIENT-ID-HERE' with a different profile ID from STEP 1

-- Copy & run:
insert into public.messages (from_profile_id, to_profile_id, content)
values (
  (
    select p.id
    from public.profiles p
    where p.id = auth.uid()
       or p.auth_user_id = auth.uid()
       or p.email = (select au.email from auth.users au where au.id = auth.uid())
    order by case when p.id = auth.uid() then 0 when p.auth_user_id = auth.uid() then 1 else 2 end
    limit 1
  ),
  'RECIPIENT-ID-HERE',  -- ← Change to real recipient ID from STEP 1
  'Test message from RLS fix'
)
returning id, from_profile_id, to_profile_id, content, created_at;

-- Expected: 1 row inserted with your message
-- Error 42501? → INSERT policy not working
-- Error 23503? → Recipient profile doesn't exist (use STEP 1 profiles)


-- ============================================================
-- STEP 6: TEST - Frontend test
-- ============================================================
-- Now try in the app:
-- 1. Build: npm run build
-- 2. Dev: npm run dev
-- 3. Log in
-- 4. Go to /messages
-- 5. Send a message
-- 6. Check browser console (F12) for logs

-- Expected console logs:
-- 📤 Sending message...
-- 📤 Sender candidates: [...]
-- ✅ Message sent successfully!

-- If error in console: note the error code and message


-- ============================================================
-- STEP 7: BONUS - Check RLS setup
-- ============================================================
-- Verify everything is correct:
select relname, relrowsecurity 
from pg_class 
where relname = 'messages';
-- Expected: relrowsecurity = true

-- Check policies exist:
select policyname, cmd 
from pg_policies 
where tablename = 'messages'
order by policyname;
-- Expected: 3 rows (select, insert, delete)


-- ============================================================
-- ERROR REFERENCE
-- ============================================================
/*
42501 = Permission denied (RLS blocking)
        → Check policies with STEP 7
        → Check role has grant(s)

23503 = Foreign key violation
        → Profile doesn't exist
        → Use profile ID from STEP 1

42703 = Column doesn't exist
        → Schema mismatch or typo

Success = No error, 1 row inserted

*/

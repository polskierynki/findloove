-- ============================================================
-- 🚀 AUTO-EVERYTHING VERSION - No manual UUID copying needed
-- ============================================================

-- This will show you exactly what to do

-- STEP 1: Show me what profiles exist and your auth ID
select 
  auth.uid() as "YOUR_AUTH_ID",
  (select count(*) from public.profiles) as "TOTAL_PROFILES",
  'Run STEP 2 next' as "NEXT";

-- ============================================================

-- STEP 2: List all profiles (pick a RECIPIENT from this list)
-- Run this to see all profiles:
select 
  p.id as "PROFILE_ID_TO_USE",
  p.email,
  p.name,
  case 
    when p.id = auth.uid() then '← THIS IS YOU (sender)'
    else '← Can be recipient'
  end as "NOTE"
from public.profiles p
order by p.created_at desc;

-- Pick one profile ID that is NOT you (copy the ID value)

-- ============================================================

-- STEP 3: Test INSERT with real IDs
-- But I'll do it for you - just run this:
do $$
declare
  v_my_id uuid;
  v_recipient_id uuid;
  v_result record;
begin
  -- Get your actual sender profile ID.
  select p.id
    into v_my_id
  from public.profiles p
  where p.id = auth.uid()
     or p.auth_user_id = auth.uid()
     or (
       nullif(auth.jwt() ->> 'email', '') is not null
       and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
     )
  order by
    case
      when p.id = auth.uid() then 0
      when p.auth_user_id = auth.uid() then 1
      else 2
    end,
    p.created_at asc
  limit 1;

  if v_my_id is null then
    raise notice 'ERROR: No sender profile mapped to current auth user';
    return;
  end if;
  
  -- Find a different profile to send to
  select id into v_recipient_id
  from public.profiles
  where id != auth.uid()
  limit 1;
  
  -- If no other profile exists, show error
  if v_recipient_id is null then
    raise notice 'ERROR: No other profiles exist! Need at least 2 profiles to test messages';
    return;
  end if;
  
  -- Try to insert message
  insert into public.messages (from_profile_id, to_profile_id, content)
  values (v_my_id, v_recipient_id, 'Test message from auto-fix')
  returning * into v_result;
  
  -- Show result
  raise notice 'SUCCESS! Message inserted:';
  raise notice 'From: %', v_my_id;
  raise notice 'To: %', v_recipient_id;
  raise notice 'ID: %', v_result.id;
  
exception when others then
  raise notice 'ERROR: %', sqlerrm;
  raise notice 'Code: %', sqlstate;
end $$;

-- ============================================================

-- STEP 4: Verify message was created
select id, from_profile_id, to_profile_id, content, created_at
from public.messages
where from_profile_id = auth.uid()
   or to_profile_id = auth.uid()
order by created_at desc
limit 5;

-- Expected: Your test message should appear here


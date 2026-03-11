-- =============================================================
-- MESSAGES / RLS DIAGNOSTICS (run in Supabase SQL Editor)
-- =============================================================
-- This script is read-only. It helps verify whether chat auth mapping is valid.

-- 1) Active policies on messages
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'messages'
order by policyname;

-- 2) Messages table shape
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'messages'
order by ordinal_position;

-- 3) Profiles table auth mapping coverage
select
  count(*) as total_profiles,
  count(*) filter (where auth_user_id is not null) as with_auth_user_id,
  count(*) filter (where auth_user_id is null) as without_auth_user_id,
  count(*) filter (where email is null or btrim(email) = '') as without_email
from public.profiles;

-- 4) Duplicate emails in profiles (should be 0 rows)
select
  lower(email) as normalized_email,
  count(*) as duplicate_count
from public.profiles
where email is not null
  and btrim(email) <> ''
group by lower(email)
having count(*) > 1
order by duplicate_count desc;

-- 5) Profiles that cannot be mapped to any auth user by id or email
select
  p.id as profile_id,
  p.email,
  p.auth_user_id,
  case when u_by_id.id is not null then true else false end as id_matches_auth_user,
  case when u_by_email.id is not null then true else false end as email_matches_auth_user
from public.profiles p
left join auth.users u_by_id
  on u_by_id.id = p.id
left join auth.users u_by_email
  on p.email is not null
 and u_by_email.email is not null
 and lower(p.email) = lower(u_by_email.email)
where p.auth_user_id is null
order by p.created_at desc nulls last
limit 200;

-- 6) Messages rows with broken foreign keys (should be 0 rows)
select
  m.id,
  m.from_profile_id,
  m.to_profile_id,
  m.created_at
from public.messages m
left join public.profiles p_from on p_from.id = m.from_profile_id
left join public.profiles p_to on p_to.id = m.to_profile_id
where p_from.id is null
   or p_to.id is null
order by m.created_at desc
limit 200;

-- 7) Quick health sample: latest 20 messages with sender/receiver emails
select
  m.id,
  m.created_at,
  m.content,
  m.from_profile_id,
  p_from.email as from_email,
  m.to_profile_id,
  p_to.email as to_email
from public.messages m
left join public.profiles p_from on p_from.id = m.from_profile_id
left join public.profiles p_to on p_to.id = m.to_profile_id
order by m.created_at desc
limit 20;

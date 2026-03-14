-- Account lifecycle support: suspension timestamp and delayed permanent deletion.
alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_scheduled_at timestamptz;

create index if not exists profiles_deletion_scheduled_idx
  on public.profiles (deletion_scheduled_at)
  where deletion_scheduled_at is not null;

-- Run this function from a cron/scheduled task (for example once per day).
create or replace function public.process_due_account_deletions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  with due_profiles as (
    select id
    from public.profiles
    where deletion_scheduled_at is not null
      and deletion_scheduled_at <= now()
  ),
  deleted as (
    delete from public.profiles
    where id in (select id from due_profiles)
    returning id
  )
  select count(*) into deleted_count from deleted;

  return deleted_count;
end;
$$;

comment on function public.process_due_account_deletions() is
  'Deletes profiles whose deletion_scheduled_at has passed; call from cron job.';

-- =============================================================
-- LEKKA + KOMPATYBILNA POLITYKA RLS DLA TABELI MESSAGES
-- =============================================================
-- Cel:
-- - Zachowac prosta polityke, ale obsluzyc konta legacy,
--   gdzie profiles.id != auth.uid().
-- - Uniknac duplikowania rozbudowanych EXISTS w kazdej policy.
--
-- Podejscie:
-- - Dodajemy `profiles.auth_user_id` (powiazanie do auth.users.id)
--   + trigger do utrzymania mapowania.
-- - Tworzymy 1 helper function sprawdzajacy, czy podane profile_id
--   nalezy do aktualnie zalogowanego usera:
--   1) bezposrednio po auth.uid()
--   2) po profiles.auth_user_id = auth.uid()
--   3) fallback po email (JWT/auth.users) dla starych danych

alter table public.messages enable row level security;

-- Trwale mapowanie profilu na auth.users.
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

-- Backfill dla juz istniejacych profili.
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
  and p.email is not null
  and u.email is not null
  and lower(p.email) = lower(u.email);

-- Usun wszystkie istniejace polityki na messages
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

-- Helper: sprawdza, czy profile_id nalezy do aktualnego usera.
drop function if exists public.is_current_user_profile(uuid);

create function public.is_current_user_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    target_profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles me
      where me.id = target_profile_id
        and me.auth_user_id = auth.uid()
    )
    or (
      nullif(auth.jwt() ->> 'email', '') is not null
      and exists (
        select 1
        from public.profiles me
        where me.id = target_profile_id
          and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
      )
    )
    or exists (
      select 1
      from public.profiles me
      join auth.users au
        on lower(coalesce(me.email, '')) = lower(coalesce(au.email, ''))
      where me.id = target_profile_id
        and au.id = auth.uid()
        and me.email is not null
        and au.email is not null
    );
$$;

grant execute on function public.is_current_user_profile(uuid) to authenticated;

-- SELECT: uzytkownik widzi wiadomosci, w ktorych jest nadawca lub odbiorcom
create policy "messages_select"
  on public.messages
  for select
  to authenticated
  using (
    public.is_current_user_profile(from_profile_id)
    or public.is_current_user_profile(to_profile_id)
  );

-- INSERT: uzytkownik moze wysylac tylko z wlasnego profilu
create policy "messages_insert"
  on public.messages
  for insert
  to authenticated
  with check (
    public.is_current_user_profile(from_profile_id)
  );

-- DELETE: uzytkownik moze usuwac wiadomosci ze swoich rozmow
create policy "messages_delete"
  on public.messages
  for delete
  to authenticated
  using (
    public.is_current_user_profile(from_profile_id)
    or public.is_current_user_profile(to_profile_id)
  );

grant select, insert, delete on public.messages to authenticated;

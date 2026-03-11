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

create index if not exists messages_from_profile_created_idx
  on public.messages(from_profile_id, created_at desc);

create index if not exists messages_to_profile_created_idx
  on public.messages(to_profile_id, created_at desc);

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

-- Helper #1: zwraca wszystkie profile_id przypiete do biezacego auth.uid().
create or replace function public.current_user_profile_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(distinct matched.id), '{}'::uuid[])
  from (
    select p.id
    from public.profiles p
    where p.id = auth.uid()
      or p.auth_user_id = auth.uid()
      or (
        nullif(auth.jwt() ->> 'email', '') is not null
        and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
      )
      or exists (
        select 1
        from auth.users au
        where au.id = auth.uid()
          and au.email is not null
          and lower(coalesce(p.email, '')) = lower(coalesce(au.email, ''))
      )
  ) as matched;
$$;

grant execute on function public.current_user_profile_ids() to authenticated;

-- Helper #2: sprawdza, czy profile_id nalezy do aktualnego usera.
drop function if exists public.is_current_user_profile(uuid);

create function public.is_current_user_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select target_profile_id = any(public.current_user_profile_ids());
$$;

grant execute on function public.is_current_user_profile(uuid) to authenticated;

-- SELECT: uzytkownik widzi wiadomosci, w ktorych jest nadawca lub odbiorca
create policy "messages_select"
  on public.messages
  for select
  to authenticated
  using (
    from_profile_id = any(public.current_user_profile_ids())
    or to_profile_id = any(public.current_user_profile_ids())
  );

-- INSERT: user wysyla tylko z profilu, ktory nalezy do niego.
create policy "messages_insert"
  on public.messages
  for insert
  to authenticated
  with check (
    from_profile_id = any(public.current_user_profile_ids())
  );

-- DELETE: user usuwa wiadomosci, w ktorych uczestniczy.
create policy "messages_delete"
  on public.messages
  for delete
  to authenticated
  using (
    from_profile_id = any(public.current_user_profile_ids())
    or to_profile_id = any(public.current_user_profile_ids())
  );

-- Bezpieczna wysylka przez RPC: stabilniejsza od bezposredniego insertu,
-- bo server-side wybiera sender profile zgodny z auth.uid().
create or replace function public.send_message_safe(
  p_to_profile_id uuid,
  p_content text
)
returns public.messages
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_ids uuid[];
  v_sender_profile_id uuid;
  v_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'Brak autoryzacji.' using errcode = '42501';
  end if;

  if p_to_profile_id is null then
    raise exception 'Brak odbiorcy wiadomosci.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_content, '')), '') is null then
    raise exception 'Pusta wiadomosc.' using errcode = '22023';
  end if;

  select public.current_user_profile_ids() into v_profile_ids;

  if array_length(v_profile_ids, 1) is null then
    raise exception 'Brak profilu przypietego do konta.' using errcode = '42501';
  end if;

  select p.id
  into v_sender_profile_id
  from public.profiles p
  where p.id = any(v_profile_ids)
  order by
    case
      when p.auth_user_id = auth.uid() then 0
      when p.id = auth.uid() then 1
      else 2
    end,
    p.created_at asc
  limit 1;

  if v_sender_profile_id is null then
    raise exception 'Brak poprawnego profilu nadawcy.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_to_profile_id
  ) then
    raise exception 'Profil odbiorcy nie istnieje.' using errcode = '23503';
  end if;

  insert into public.messages (from_profile_id, to_profile_id, content)
  values (v_sender_profile_id, p_to_profile_id, trim(p_content))
  returning * into v_message;

  return v_message;
end;
$$;

grant execute on function public.send_message_safe(uuid, text) to authenticated;

grant select, insert, delete on public.messages to authenticated;

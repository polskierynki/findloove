-- =============================================================
-- LEKKA + KOMPATYBILNA POLITYKA RLS DLA TABELI MESSAGES
-- =============================================================
-- Cel:
-- - Zachowac prosta polityke, ale obsluzyc konta legacy,
--   gdzie profiles.id != auth.uid().
-- - Uniknac duplikowania rozbudowanych EXISTS w kazdej policy.
--
-- Podejscie:
-- - Tworzymy 1 helper function sprawdzajacy, czy podane profile_id
--   nalezy do aktualnie zalogowanego usera:
--   1) bezposrednio po auth.uid()
--   2) fallback po email z JWT -> profiles.email

alter table public.messages enable row level security;

-- Helper: sprawdza, czy profile_id nalezy do aktualnego usera.
drop function if exists public.is_current_user_profile(uuid);

create function public.is_current_user_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_profile_id = auth.uid()
    or (
      nullif(auth.jwt() ->> 'email', '') is not null
      and exists (
        select 1
        from public.profiles me
        where me.id = target_profile_id
          and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
      )
    );
$$;

grant execute on function public.is_current_user_profile(uuid) to authenticated;

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

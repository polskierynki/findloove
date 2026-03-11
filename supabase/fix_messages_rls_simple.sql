-- =============================================================
-- UPROSZCZONA POLITYKA RLS DLA TABELI MESSAGES
-- =============================================================
-- Poprzednia polityka uzywala zlozonych subzapytan (EXISTS z email),
-- co moglo powodowac bledy lub brak dostepu do wiadomosci.
--
-- Ta wersja uzywa prostego warunku: auth.uid() = from/to_profile_id
-- co dziala standardowo w Supabase (profiles.id = auth.uid()).

alter table public.messages enable row level security;

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
    from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
  );

-- INSERT: uzytkownik moze wysylac tylko z wlasnego profilu
create policy "messages_insert"
  on public.messages
  for insert
  to authenticated
  with check (
    from_profile_id = auth.uid()
  );

-- DELETE: uzytkownik moze usuwac wiadomosci ze swoich rozmow
create policy "messages_delete"
  on public.messages
  for delete
  to authenticated
  using (
    from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
  );

grant select, insert, delete on public.messages to authenticated;

-- =============================================================
-- OPCJONALNIE: jesli profiles.id rozni sie od auth.uid()
-- (legacy dane), zaktualizuj profile.id aby odpowiadalo auth.uid()
-- Uruchom to tylko jesli wiadomosci dalej nie dzialaja:
--
-- update public.profiles p
-- set id = u.id
-- from auth.users u
-- where lower(p.email) = lower(u.email)
--   and p.id != u.id;
-- =============================================================

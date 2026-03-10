-- =============================================================
-- FIX: messages RLS for auth<->profile id mapping
-- =============================================================
-- Problem:
-- - Czesciowo historyczne dane uzywaja profile_id, a sesja auth opiera sie o auth.uid().
-- - Przy restrykcyjnych policy odbiorca moze nie widziec wiadomosci, mimo ze je dostaje.
--
-- Efekt tej migracji:
-- - SELECT/DELETE: dostep gdy user jest uczestnikiem rozmowy
--   (po auth.uid() lub po email -> profiles.id).
-- - INSERT: mozna wysylac tylko z wlasnego profilu
--   (po auth.uid() lub po email -> profiles.id).

alter table public.messages enable row level security;

-- Usun wszystkie istniejace polityki na messages (bez wzgledu na nazwe)
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

-- Odczyt: user moze czytac rozmowy, gdzie wystepuje jako nadawca/odbiorca
-- po auth.uid() lub po mapowaniu email -> profiles.id.
create policy "messages_select_participant"
  on public.messages
  for select
  to authenticated
  using (
    from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles me
      where me.id = public.messages.from_profile_id
        and nullif(auth.jwt() ->> 'email', '') is not null
        and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
    )
    or exists (
      select 1
      from public.profiles me
      where me.id = public.messages.to_profile_id
        and nullif(auth.jwt() ->> 'email', '') is not null
        and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
    )
  );

-- Wstawianie: user moze wysylac tylko z wlasnego profilu (from_profile_id)
create policy "messages_insert_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    from_profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles me
      where me.id = public.messages.from_profile_id
        and nullif(auth.jwt() ->> 'email', '') is not null
        and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
    )
  );

-- Usuwanie: user moze usunac wiadomosci, w ktorych uczestniczy
create policy "messages_delete_participant"
  on public.messages
  for delete
  to authenticated
  using (
    from_profile_id = auth.uid()
    or to_profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles me
      where me.id = public.messages.from_profile_id
        and nullif(auth.jwt() ->> 'email', '') is not null
        and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
    )
    or exists (
      select 1
      from public.profiles me
      where me.id = public.messages.to_profile_id
        and nullif(auth.jwt() ->> 'email', '') is not null
        and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
    )
  );

grant select, insert, delete on public.messages to authenticated;

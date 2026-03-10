-- =============================================================
-- FIX: profile_comments RLS for auth<->profile id mapping
-- =============================================================
-- Problem:
-- - Czesc kont ma rozjazd miedzy auth.uid() i profiles.id.
-- - Dotychczasowe polityki insert/update/delete dla profile_comments
--   opieraly sie na author_profile_id = auth.uid(), przez co insert
--   konczyl sie bledem RLS mimo poprawnego author_profile_id.
--
-- Efekt tej migracji:
-- - INSERT/UPDATE/DELETE: autor komentarza jest rozpoznawany:
--   * po auth.uid() lub
--   * po mapowaniu email z JWT -> profiles.email.

alter table public.profile_comments enable row level security;

drop policy if exists "profile_comments_insert_author_mapping" on public.profile_comments;
create policy "profile_comments_insert_author_mapping"
  on public.profile_comments
  for insert
  to authenticated
  with check (
    char_length(btrim(content)) between 2 and 400
    and exists (
      select 1
      from public.profiles me
      where me.id = public.profile_comments.author_profile_id
        and (
          me.id = auth.uid()
          or (
            nullif(auth.jwt() ->> 'email', '') is not null
            and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

drop policy if exists "profile_comments_update_author_mapping" on public.profile_comments;
create policy "profile_comments_update_author_mapping"
  on public.profile_comments
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = public.profile_comments.author_profile_id
        and (
          me.id = auth.uid()
          or (
            nullif(auth.jwt() ->> 'email', '') is not null
            and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  )
  with check (
    char_length(btrim(content)) between 2 and 400
    and exists (
      select 1
      from public.profiles me
      where me.id = public.profile_comments.author_profile_id
        and (
          me.id = auth.uid()
          or (
            nullif(auth.jwt() ->> 'email', '') is not null
            and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

drop policy if exists "profile_comments_delete_author_mapping" on public.profile_comments;
create policy "profile_comments_delete_author_mapping"
  on public.profile_comments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = public.profile_comments.author_profile_id
        and (
          me.id = auth.uid()
          or (
            nullif(auth.jwt() ->> 'email', '') is not null
            and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

grant select, insert, update, delete on public.profile_comments to authenticated;

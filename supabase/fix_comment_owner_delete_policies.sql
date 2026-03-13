-- =============================================================
-- FIX: allow profile owners to remove received comments
-- =============================================================
-- Popular moderation pattern:
-- - author can remove own comment
-- - profile owner can remove comments on own profile
-- - admin can remove any comment

begin;

alter table public.profile_comments enable row level security;
alter table public.profile_photo_comments enable row level security;

-- WALL COMMENTS: profile owner can delete comments received on own profile.
drop policy if exists "profile_comments_delete_profile_owner_mapping" on public.profile_comments;
create policy "profile_comments_delete_profile_owner_mapping"
  on public.profile_comments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = public.profile_comments.profile_id
        and (
          me.id = auth.uid()
          or (
            nullif(auth.jwt() ->> 'email', '') is not null
            and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

-- PHOTO COMMENTS: author can delete own comment with auth/profile mapping.
drop policy if exists "profile_photo_comments_delete_author_mapping" on public.profile_photo_comments;
create policy "profile_photo_comments_delete_author_mapping"
  on public.profile_photo_comments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = public.profile_photo_comments.author_profile_id
        and (
          me.id = auth.uid()
          or (
            nullif(auth.jwt() ->> 'email', '') is not null
            and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

-- PHOTO COMMENTS: profile owner can delete comments received on own photos.
drop policy if exists "profile_photo_comments_delete_profile_owner_mapping" on public.profile_photo_comments;
create policy "profile_photo_comments_delete_profile_owner_mapping"
  on public.profile_photo_comments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = public.profile_photo_comments.profile_id
        and (
          me.id = auth.uid()
          or (
            nullif(auth.jwt() ->> 'email', '') is not null
            and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

-- PHOTO COMMENTS: admin can delete any photo comment.
drop policy if exists "profile_photo_comments_delete_admin_mapping" on public.profile_photo_comments;
create policy "profile_photo_comments_delete_admin_mapping"
  on public.profile_photo_comments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      where (
        me.id = auth.uid()
        or (
          nullif(auth.jwt() ->> 'email', '') is not null
          and lower(coalesce(me.email, '')) = lower(auth.jwt() ->> 'email')
        )
      )
      and coalesce(to_jsonb(me) ->> 'role', 'user') in ('admin', 'super_admin')
    )
  );

grant select, insert, delete on public.profile_photo_comments to authenticated;
grant select on public.profile_photo_comments to anon;

commit;

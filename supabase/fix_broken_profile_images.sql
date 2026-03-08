-- One-time cleanup of broken profile image URLs in Supabase.
-- Safe flow: preview -> backup -> update -> verify.

begin;

-- 1) Preview rows that will be fixed in public.profiles
select id, name, image_url
from public.profiles
where image_url is null
   or btrim(image_url) = ''
   or image_url ilike '%photo-1581579438747-104c53d2f93b%';

-- 2) Backup current image_url before update
alter table public.profiles
  add column if not exists image_url_backup text;

update public.profiles
set image_url_backup = image_url
where image_url is null
   or btrim(image_url) = ''
   or image_url ilike '%photo-1581579438747-104c53d2f93b%';

-- 3) Replace broken/missing URLs with deterministic avatar fallback based on profile name
update public.profiles
set image_url = concat(
  'https://ui-avatars.com/api/?name=',
  replace(coalesce(nullif(trim(name), ''), 'Uzytkownik'), ' ', '+'),
  '&background=C05868&color=fff&size=256'
)
where image_url is null
   or btrim(image_url) = ''
   or image_url ilike '%photo-1581579438747-104c53d2f93b%';

-- 4) Optional: also clean profile_photos.url if this column exists in your schema
-- (wrapped in dynamic SQL to stay compatible with different schema versions)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_photos'
      and column_name = 'url'
  ) then
    execute $sql$
      update public.profile_photos pp
      set url = concat(
        'https://ui-avatars.com/api/?name=',
        replace(coalesce(nullif(trim(p.name), ''), 'Uzytkownik'), ' ', '+'),
        '&background=C05868&color=fff&size=256'
      )
      from public.profiles p
      where pp.profile_id = p.id
        and (
          pp.url is null
          or btrim(pp.url) = ''
          or pp.url ilike '%photo-1581579438747-104c53d2f93b%'
        )
    $sql$;
  end if;
end $$;

-- 5) Verify effect in public.profiles
select id, name, image_url, image_url_backup
from public.profiles
where image_url_backup is not null
order by name;

commit;

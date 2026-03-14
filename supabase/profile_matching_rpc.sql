-- Unified matching RPC with cursor pagination for Home and Search views.

alter table public.profiles
  add column if not exists verification_pending boolean default false,
  add column if not exists is_premium boolean default false,
  add column if not exists premium_until timestamptz;

create index if not exists profiles_match_visible_created_idx
  on public.profiles (created_at desc, id desc)
  where coalesce(is_blocked, false) = false
    and suspended_at is null
    and deletion_scheduled_at is null
    and lower(coalesce(role, 'user')) not in ('admin', 'super_admin');

create index if not exists profiles_search_filters_idx
  on public.profiles (age, looking_for, sexual_orientation, pets, drinking);

create or replace function public.search_ranked_profiles(
  p_viewer_profile_id uuid default null,
  p_limit integer default 24,
  p_cursor_sort_value double precision default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_age_min integer default null,
  p_age_max integer default null,
  p_looking_for text[] default null,
  p_orientation text[] default null,
  p_pets text[] default null,
  p_drinking text[] default null,
  p_reference_city text default null,
  p_sort text default 'recommended'
)
returns table (
  id uuid,
  email text,
  name text,
  age integer,
  city text,
  bio text,
  interests text[],
  status text,
  image_url text,
  is_verified boolean,
  verification_pending boolean,
  occupation text,
  zodiac text,
  smoking text,
  children text,
  drinking text,
  pets text,
  sexual_orientation text,
  looking_for text,
  created_at timestamptz,
  gender text,
  seeking_gender text,
  seeking_age_min integer,
  seeking_age_max integer,
  is_blocked boolean,
  suspended_at timestamptz,
  deletion_requested_at timestamptz,
  deletion_scheduled_at timestamptz,
  last_active timestamptz,
  role text,
  is_premium boolean,
  premium_until timestamptz,
  match_score integer,
  recommended_score integer,
  shared_interests integer,
  is_nearby boolean,
  activity_ts timestamptz,
  sort_value double precision
)
language sql
stable
set search_path = public
as $$
with viewer as (
  select
    p.id,
    p.age as viewer_age,
    lower(coalesce(p.city, '')) as viewer_city,
    p.seeking_age_min as viewer_seeking_age_min,
    p.seeking_age_max as viewer_seeking_age_max,
    lower(coalesce(p.seeking_gender, '')) as viewer_seeking_gender,
    lower(coalesce(p.gender, '')) as viewer_gender,
    lower(coalesce(p.looking_for, '')) as viewer_looking_for,
    coalesce(
      (
        select array_agg(distinct lower(trim(v_interest)))
        from unnest(coalesce(p.interests, '{}'::text[])) as v_interest
        where trim(v_interest) <> ''
      ),
      '{}'::text[]
    ) as viewer_interests_norm
  from public.profiles p
  where p.id = p_viewer_profile_id
  limit 1
),
candidates as (
  select
    c.*,
    coalesce(c.last_active, c.created_at) as activity_ts
  from public.profiles c
  where coalesce(c.is_blocked, false) = false
    and c.suspended_at is null
    and c.deletion_scheduled_at is null
    and lower(coalesce(c.role, 'user')) not in ('admin', 'super_admin')
    and lower(coalesce(c.email, '')) <> 'lio1985lodz@gmail.com'
    and (p_viewer_profile_id is null or c.id <> p_viewer_profile_id)
    and (p_age_min is null or c.age >= p_age_min)
    and (p_age_max is null or c.age <= p_age_max)
    and (
      p_looking_for is null
      or cardinality(p_looking_for) = 0
      or c.looking_for = any(p_looking_for)
    )
    and (
      p_orientation is null
      or cardinality(p_orientation) = 0
      or c.sexual_orientation = any(p_orientation)
    )
    and (
      p_pets is null
      or cardinality(p_pets) = 0
      or c.pets = any(p_pets)
    )
    and (
      p_drinking is null
      or cardinality(p_drinking) = 0
      or c.drinking = any(p_drinking)
    )
),
scored as (
  select
    c.*,
    v.id as viewer_id,
    coalesce(
      nullif(lower(trim(p_reference_city)), ''),
      nullif(v.viewer_city, '')
    ) as reference_city,
    coalesce((
      select count(*)
      from unnest(coalesce(c.interests, '{}'::text[])) as c_interest
      where lower(trim(c_interest)) = any(coalesce(v.viewer_interests_norm, '{}'::text[]))
    ), 0) as shared_interests,
    (
      coalesce(lower(c.looking_for), '') <> ''
      and coalesce(v.viewer_looking_for, '') <> ''
      and lower(c.looking_for) = v.viewer_looking_for
    ) as looking_for_match,
    (
      coalesce(nullif(lower(trim(c.city)), ''), '__none__')
      =
      coalesce(nullif(coalesce(nullif(lower(trim(p_reference_city)), ''), nullif(v.viewer_city, '')), ''), '__null__')
      and coalesce(nullif(coalesce(nullif(lower(trim(p_reference_city)), ''), nullif(v.viewer_city, '')), ''), '') <> ''
    ) as is_nearby,
    (
      v.id is not null
      and c.age >= coalesce(v.viewer_seeking_age_min, 0)
      and c.age <= coalesce(v.viewer_seeking_age_max, 200)
      and v.viewer_age >= coalesce(c.seeking_age_min, 0)
      and v.viewer_age <= coalesce(c.seeking_age_max, 200)
    ) as age_compatibility,
    (
      v.id is not null
      and (
        coalesce(v.viewer_seeking_gender, '') = ''
        or coalesce(lower(c.gender), '') = ''
        or v.viewer_seeking_gender = lower(c.gender)
      )
      and (
        coalesce(lower(c.seeking_gender), '') = ''
        or coalesce(v.viewer_gender, '') = ''
        or lower(c.seeking_gender) = v.viewer_gender
      )
    ) as gender_compatibility,
    case
      when c.activity_ts is null then 0
      when extract(epoch from (now() - c.activity_ts)) / 3600.0 <= 2 then 12
      when extract(epoch from (now() - c.activity_ts)) / 3600.0 <= 24 then 8
      when extract(epoch from (now() - c.activity_ts)) / 3600.0 <= 72 then 5
      when extract(epoch from (now() - c.activity_ts)) / 3600.0 <= 168 then 2
      else 0
    end as activity_bonus
  from candidates c
  left join viewer v on true
),
ranked as (
  select
    s.*,
    case
      when s.viewer_id is null then
        greatest(
          55,
          least(90, 60 + s.activity_bonus + case when s.is_verified then 4 else 0 end)
        )
      else
        greatest(
          52,
          least(
            99,
            50
            + s.shared_interests * 11
            + case when s.is_nearby then 8 else 0 end
            + case when s.looking_for_match then 9 else 0 end
            + case when s.age_compatibility then 6 else 0 end
            + case when s.gender_compatibility then 4 else -6 end
            + least(10, s.activity_bonus)
          )
        )
    end::integer as match_score,
    case
      when s.viewer_id is null then
        (s.activity_bonus + case when s.is_verified then 4 else 0 end)
      else
        (
          s.shared_interests * 18
          + case when s.is_nearby then 14 else 0 end
          + case when s.looking_for_match then 16 else 0 end
          + case when s.age_compatibility then 10 else 0 end
          + case when s.gender_compatibility then 6 else -8 end
          + case when s.is_verified then 4 else 0 end
          + s.activity_bonus
        )
    end::integer as recommended_score
  from scored s
),
prepared as (
  select
    r.*,
    case
      when lower(coalesce(p_sort, 'recommended')) = 'match' then r.match_score::double precision
      when lower(coalesce(p_sort, 'recommended')) = 'closest' then
        (case when r.is_nearby then 100000.0 else 0.0 end) + r.recommended_score::double precision
      when lower(coalesce(p_sort, 'recommended')) = 'newest' then extract(epoch from r.created_at)
      when lower(coalesce(p_sort, 'recommended')) = 'active' then extract(epoch from r.activity_ts)
      when lower(coalesce(p_sort, 'recommended')) = 'ageasc' then r.age::double precision
      when lower(coalesce(p_sort, 'recommended')) = 'agedesc' then r.age::double precision
      else r.recommended_score::double precision
    end as sort_value
  from ranked r
),
cursor_filtered as (
  select *
  from prepared p
  where
    p_cursor_id is null
    or p_cursor_created_at is null
    or p_cursor_sort_value is null
    or (
      lower(coalesce(p_sort, 'recommended')) = 'ageasc'
      and (
        p.sort_value > p_cursor_sort_value
        or (
          p.sort_value = p_cursor_sort_value
          and (
            p.created_at < p_cursor_created_at
            or (p.created_at = p_cursor_created_at and p.id < p_cursor_id)
          )
        )
      )
    )
    or (
      lower(coalesce(p_sort, 'recommended')) <> 'ageasc'
      and (
        p.sort_value < p_cursor_sort_value
        or (
          p.sort_value = p_cursor_sort_value
          and (
            p.created_at < p_cursor_created_at
            or (p.created_at = p_cursor_created_at and p.id < p_cursor_id)
          )
        )
      )
    )
)
select
  p.id,
  p.email,
  p.name,
  p.age,
  p.city,
  coalesce(p.bio, '') as bio,
  coalesce(p.interests, '{}'::text[]) as interests,
  coalesce(p.status, '') as status,
  p.image_url,
  coalesce(p.is_verified, false) as is_verified,
  coalesce(p.verification_pending, false) as verification_pending,
  coalesce(p.occupation, '') as occupation,
  coalesce(p.zodiac, '') as zodiac,
  coalesce(p.smoking, '') as smoking,
  coalesce(p.children, '') as children,
  p.drinking,
  p.pets,
  p.sexual_orientation,
  p.looking_for,
  p.created_at,
  p.gender,
  p.seeking_gender,
  p.seeking_age_min,
  p.seeking_age_max,
  p.is_blocked,
  p.suspended_at,
  p.deletion_requested_at,
  p.deletion_scheduled_at,
  p.last_active,
  p.role,
  coalesce(p.is_premium, false) as is_premium,
  p.premium_until,
  p.match_score,
  p.recommended_score,
  p.shared_interests,
  p.is_nearby,
  p.activity_ts,
  p.sort_value
from cursor_filtered p
order by
  case when lower(coalesce(p_sort, 'recommended')) = 'ageasc' then p.sort_value end asc,
  case when lower(coalesce(p_sort, 'recommended')) <> 'ageasc' then p.sort_value end desc,
  p.created_at desc,
  p.id desc
limit greatest(1, least(coalesce(p_limit, 24), 100));
$$;

grant execute on function public.search_ranked_profiles(
  uuid,
  integer,
  double precision,
  timestamptz,
  uuid,
  integer,
  integer,
  text[],
  text[],
  text[],
  text[],
  text,
  text
) to anon, authenticated;

comment on function public.search_ranked_profiles(
  uuid,
  integer,
  double precision,
  timestamptz,
  uuid,
  integer,
  integer,
  text[],
  text[],
  text[],
  text[],
  text,
  text
) is 'Returns ranked profile matches with one shared algorithm and cursor pagination.';

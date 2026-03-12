-- =============================================================
-- Gift system + virtual token balance
-- =============================================================
-- Adds:
-- - profiles.token_balance
-- - profile_interactions.is_anonymous + profile_interactions.message
-- - RPC public.send_profile_gift(...) with atomic token deduction

begin;

alter table public.profiles add column if not exists token_balance integer;

update public.profiles
set token_balance = 1000
where token_balance is null;

alter table public.profiles alter column token_balance set default 1000;
alter table public.profiles alter column token_balance set not null;

alter table public.profiles drop constraint if exists profiles_token_balance_nonnegative;
alter table public.profiles
  add constraint profiles_token_balance_nonnegative
  check (token_balance >= 0);

alter table public.profile_interactions add column if not exists is_anonymous boolean;
alter table public.profile_interactions add column if not exists message text;

update public.profile_interactions
set is_anonymous = false
where is_anonymous is null;

alter table public.profile_interactions alter column is_anonymous set default false;
alter table public.profile_interactions alter column is_anonymous set not null;

create index if not exists profile_interactions_to_kind_created_idx
  on public.profile_interactions (to_profile_id, kind, created_at desc);

create or replace function public.send_profile_gift(
  p_to_profile_id uuid,
  p_label text,
  p_emoji text,
  p_token_cost integer,
  p_message text default null,
  p_is_anonymous boolean default false
)
returns table (
  interaction_id uuid,
  new_balance integer,
  token_spent integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_sender_profile_id uuid;
  v_sender_balance integer;
  v_sender_banned boolean;
  v_interaction_id uuid;
  v_new_balance integer;
  v_label text;
  v_emoji text;
  v_message text;
begin
  if auth.uid() is null then
    raise exception 'Brak autoryzacji.' using errcode = '42501';
  end if;

  if p_to_profile_id is null then
    raise exception 'Brak odbiorcy prezentu.' using errcode = '22023';
  end if;

  if p_token_cost is null or p_token_cost <= 0 then
    raise exception 'Niepoprawny koszt prezentu.' using errcode = '22023';
  end if;

  select p.id
  into v_sender_profile_id
  from public.profiles p
  where p.id = auth.uid()
     or (
       nullif(auth.jwt() ->> 'email', '') is not null
       and lower(coalesce(p.email, '')) = lower(auth.jwt() ->> 'email')
     )
  order by
    case when p.id = auth.uid() then 0 else 1 end,
    p.created_at asc
  limit 1;

  if v_sender_profile_id is null then
    raise exception 'Brak profilu nadawcy przypietego do konta.' using errcode = '42501';
  end if;

  if v_sender_profile_id = p_to_profile_id then
    raise exception 'Nie mozna wyslac prezentu samemu sobie.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_to_profile_id
  ) then
    raise exception 'Profil odbiorcy nie istnieje.' using errcode = '23503';
  end if;

  select
    p.token_balance,
    coalesce((to_jsonb(p) ->> 'is_banned')::boolean, false)
  into
    v_sender_balance,
    v_sender_banned
  from public.profiles p
  where p.id = v_sender_profile_id
  for update;

  if v_sender_banned then
    raise exception 'Konto zbanowane nie moze wysylac prezentow.' using errcode = '42501';
  end if;

  if coalesce(v_sender_balance, 0) < p_token_cost then
    raise exception 'Niewystarczajace saldo tokenow.' using errcode = '22023';
  end if;

  update public.profiles p
  set token_balance = p.token_balance - p_token_cost
  where p.id = v_sender_profile_id
  returning p.token_balance into v_new_balance;

  v_label := nullif(btrim(coalesce(p_label, '')), '');
  v_emoji := nullif(btrim(coalesce(p_emoji, '')), '');
  v_message := nullif(left(btrim(coalesce(p_message, '')), 180), '');

  insert into public.profile_interactions (
    from_profile_id,
    to_profile_id,
    kind,
    emoji,
    label,
    token_cost,
    created_at,
    is_anonymous,
    message
  )
  values (
    v_sender_profile_id,
    p_to_profile_id,
    'gift',
    coalesce(v_emoji, '🎁'),
    coalesce(v_label, 'Prezent'),
    p_token_cost,
    now(),
    coalesce(p_is_anonymous, false),
    v_message
  )
  returning id into v_interaction_id;

  return query
  select v_interaction_id, v_new_balance, p_token_cost;
end;
$$;

grant execute on function public.send_profile_gift(uuid, text, text, integer, text, boolean) to authenticated;

commit;

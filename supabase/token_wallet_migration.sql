-- =============================================================
-- Token wallet system migration
-- =============================================================
-- Adds:
--   • token_packages         — available purchase packages
--   • token_transactions     — full audit log of every token movement
--   • RPC grant_welcome_bonus(profile_id)  — idempotent welcome bonus
--   • RPC admin_grant_tokens(...)          — admin sends tokens + logs reason
--
-- Prerequisites:
--   • supabase/gift_tokens_migration.sql must have already been run
--     (adds profiles.token_balance column)
-- =============================================================

begin;

-- ────────────────────────────────────────────────────────────────
-- 1. TOKEN PACKAGES
-- ────────────────────────────────────────────────────────────────
create table if not exists public.token_packages (
  id            text primary key,
  name          text    not null,
  tokens        integer not null check (tokens > 0),
  bonus_tokens  integer not null default 0 check (bonus_tokens >= 0),
  price_grosz   integer not null check (price_grosz > 0), -- 1 PLN = 100 grosz
  is_active     boolean not null default true,
  is_popular    boolean not null default false,
  sort_order    integer not null default 0
);

-- Remove existing rows (safe re-run)
delete from public.token_packages where id in ('starter','standard','popular','premium_pack');

insert into public.token_packages
  (id,              name,          tokens,  bonus_tokens,  price_grosz,  is_active,  is_popular,  sort_order)
values
  ('starter',       'Starter',       200,        0,             900,      true,       false,       1),
  ('standard',      'Standard',      500,       150,           2500,      true,       true,        2),
  ('popular',       'Popularny',    1000,       500,           5000,      true,       false,       3),
  ('premium_pack',  'Premium+',     2000,      1500,          10000,      true,       false,       4);

-- ────────────────────────────────────────────────────────────────
-- 2. TOKEN TRANSACTIONS (audit log)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.token_transactions (
  id            uuid    primary key default gen_random_uuid(),
  profile_id    uuid    not null references public.profiles(id) on delete cascade,
  amount        integer not null,   -- positive = credit, negative = debit
  balance_after integer not null,
  type          text    not null,   -- 'purchase'|'welcome_bonus'|'admin_grant'|'gift_sent'
  description   text    not null,
  reference_id  text,               -- payment session ID, interaction ID, granting admin ID …
  created_at    timestamptz not null default now()
);

create index if not exists token_transactions_profile_created_idx
  on public.token_transactions (profile_id, created_at desc);

alter table public.token_transactions enable row level security;

drop policy if exists "Users can view own token transactions" on public.token_transactions;
create policy "Users can view own token transactions"
  on public.token_transactions
  for select
  using (profile_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- 3. RPC: grant_welcome_bonus  (idempotent — safe to call twice)
-- ────────────────────────────────────────────────────────────────
create or replace function public.grant_welcome_bonus(p_profile_id uuid)
returns table (new_balance integer, already_received boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already boolean;
  v_new_balance integer;
begin
  select exists(
    select 1 from public.token_transactions
    where profile_id = p_profile_id and type = 'welcome_bonus'
  ) into v_already;

  if v_already then
    select coalesce(token_balance, 0)
    into v_new_balance
    from public.profiles
    where id = p_profile_id;

    return query select v_new_balance, true;
    return;
  end if;

  update public.profiles
  set token_balance = coalesce(token_balance, 0) + 100
  where id = p_profile_id
  returning token_balance into v_new_balance;

  if not found then
    raise exception 'Profil nie istnieje.' using errcode = '23503';
  end if;

  insert into public.token_transactions
    (profile_id, amount, balance_after, type, description)
  values
    (p_profile_id, 100, v_new_balance, 'welcome_bonus', 'Bonus powitalny 🎉');

  return query select v_new_balance, false;
end;
$$;

-- ────────────────────────────────────────────────────────────────
-- 4. RPC: admin_grant_tokens
-- ────────────────────────────────────────────────────────────────
create or replace function public.admin_grant_tokens(
  p_profile_id uuid,
  p_amount     integer,
  p_reason     text
)
returns table (new_balance integer, transaction_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller_role    text;
  v_caller_id      uuid;
  v_new_balance    integer;
  v_transaction_id uuid;
begin
  -- Verify caller is admin
  select p.id, p.role
  into v_caller_id, v_caller_role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if v_caller_role not in ('admin', 'super_admin') then
    raise exception 'Brak uprawnień admina.' using errcode = '42501';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Kwota musi być większa od zera.' using errcode = '22023';
  end if;

  -- Credit tokens
  update public.profiles
  set token_balance = coalesce(token_balance, 0) + p_amount
  where id = p_profile_id
  returning token_balance into v_new_balance;

  if not found then
    raise exception 'Profil docelowy nie istnieje.' using errcode = '23503';
  end if;

  -- Log transaction
  insert into public.token_transactions
    (profile_id, amount, balance_after, type, description, reference_id)
  values
    (p_profile_id, p_amount, v_new_balance, 'admin_grant',
     coalesce(nullif(trim(p_reason), ''), 'Doładowanie od admina'), v_caller_id::text)
  returning id into v_transaction_id;

  return query select v_new_balance, v_transaction_id;
end;
$$;

-- ────────────────────────────────────────────────────────────────
-- 5. RPC: credit_purchased_tokens  (called by webhook after payment)
-- ────────────────────────────────────────────────────────────────
create or replace function public.credit_purchased_tokens(
  p_profile_id    uuid,
  p_amount        integer,      -- total tokens (base + bonus)
  p_price_grosz   integer,
  p_session_id    text,
  p_description   text default null
)
returns table (new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already boolean;
  v_new_balance integer;
begin
  -- Idempotency: skip if this session was already credited
  select exists(
    select 1 from public.token_transactions
    where reference_id = p_session_id and type = 'purchase'
  ) into v_already;

  if v_already then
    select coalesce(token_balance, 0) into v_new_balance
    from public.profiles where id = p_profile_id;
    return query select v_new_balance;
    return;
  end if;

  update public.profiles
  set token_balance = coalesce(token_balance, 0) + p_amount
  where id = p_profile_id
  returning token_balance into v_new_balance;

  if not found then
    raise exception 'Profil nie istnieje.' using errcode = '23503';
  end if;

  insert into public.token_transactions
    (profile_id, amount, balance_after, type, description, reference_id)
  values
    (p_profile_id, p_amount, v_new_balance, 'purchase',
     coalesce(p_description, format('Zakup %s tokenów za %.2f PLN', p_amount, p_price_grosz::numeric / 100)),
     p_session_id);

  return query select v_new_balance;
end;
$$;

commit;

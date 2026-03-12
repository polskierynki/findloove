-- ════════════════════════════════════════════════════════════════
-- ZNAJOMI — Friendships Migration
-- Uruchom w: Supabase > SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Tabela znajomości
create table if not exists public.friendships (
  id            uuid        primary key default gen_random_uuid(),
  requester_id  uuid        not null references public.profiles(id) on delete cascade,
  addressee_id  uuid        not null references public.profiles(id) on delete cascade,
  -- pending: wysłano zaproszenie, accepted: zaakceptowano, declined: odrzucono
  status        text        not null default 'pending'
                check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  -- jeden kierunek na parę — aplikacja sprawdza obie strony
  unique(requester_id, addressee_id)
);

-- 2. RLS
alter table public.friendships enable row level security;

-- Każdy może wstawiać zaproszenia (INSERT)
create policy "Anyone can insert friendships"
  on public.friendships for insert
  with check (true);

-- Każdy może czytać znajomości (SELECT) — potrzebne do sprawdzania statusu
create policy "Anyone can read friendships"
  on public.friendships for select
  using (true);

-- Każdy może aktualizować status (accept/decline)
create policy "Anyone can update friendships"
  on public.friendships for update
  using (true);

-- Usuwanie (cofnięcie zaproszenia / usunięcie znajomego)
create policy "Anyone can delete friendships"
  on public.friendships for delete
  using (true);

-- 3. Indeksy
create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id);
create index if not exists idx_friendships_status    on public.friendships(status);

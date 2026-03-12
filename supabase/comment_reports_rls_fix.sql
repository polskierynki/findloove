-- ════════════════════════════════════════════════════════════════
-- FIX: RLS policies for comment_reports — poluzowanie zasad
-- Uruchom w: Supabase > SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Usuń starą, zbyt restrykcyjną polisę INSERT
drop policy if exists "Auth users can insert comment_reports" on public.comment_reports;

-- Nowa polisa INSERT — pozwala każdemu (w tym anonimowemu) wstawiać zgłoszenia
-- W portalach randkowych zgłaszanie treści powinno działać zawsze
create policy "Anyone can insert comment_reports"
  on public.comment_reports
  for insert
  with check (true);

-- Upewnij się że polisy select i update też istnieją (idempotent)
drop policy if exists "Anyone can read comment_reports" on public.comment_reports;
create policy "Anyone can read comment_reports"
  on public.comment_reports
  for select
  using (true);

drop policy if exists "Anyone can update comment_reports" on public.comment_reports;
create policy "Anyone can update comment_reports"
  on public.comment_reports
  for update
  using (true);

-- Upewnij się że tabela comment_reports istnieje (bezpieczny re-run)
create table if not exists public.comment_reports (
  id                uuid        primary key default gen_random_uuid(),
  comment_id        uuid,
  photo_comment_id  uuid,
  comment_type      text        not null check (comment_type in ('wall', 'photo')),
  comment_content   text        not null,
  comment_author_id uuid        references public.profiles(id) on delete set null,
  reporter_id       uuid        references public.profiles(id) on delete set null,
  reason            text        not null,
  status            text        not null default 'pending'
                    check (status in ('pending', 'resolved', 'dismissed')),
  created_at        timestamptz default now()
);

alter table public.comment_reports enable row level security;

-- Upewnij się że tabela profiles ma kolumnę strikes
alter table public.profiles
  add column if not exists strikes integer not null default 0;

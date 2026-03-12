-- ════════════════════════════════════════════════════════════════
-- FIX: comment_reports table + RLS policies
-- Uruchom w: Supabase > SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Upewnij się że tabela profiles ma kolumnę strikes
alter table public.profiles
  add column if not exists strikes integer not null default 0;

-- 2. Utwórz tabelę (jeśli nie istnieje) — NAJPIERW tabela, potem polisy
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

-- 3. Włącz RLS
alter table public.comment_reports enable row level security;

-- 4. Usuń stare polisy (jeśli istnieją) i utwórz nowe
drop policy if exists "Auth users can insert comment_reports" on public.comment_reports;
drop policy if exists "Anyone can insert comment_reports"     on public.comment_reports;
drop policy if exists "Anyone can read comment_reports"       on public.comment_reports;
drop policy if exists "Anyone can update comment_reports"     on public.comment_reports;

-- INSERT — każdy może zgłosić komentarz (anon też)
create policy "Anyone can insert comment_reports"
  on public.comment_reports
  for insert
  with check (true);

-- SELECT — odczyt otwarty (admin widzi wszystkie)
create policy "Anyone can read comment_reports"
  on public.comment_reports
  for select
  using (true);

-- UPDATE — admin może zmieniać status (resolved/dismissed)
create policy "Anyone can update comment_reports"
  on public.comment_reports
  for update
  using (true);

-- 5. Indeksy pomocnicze
create index if not exists idx_comment_reports_status
  on public.comment_reports(status);

create index if not exists idx_comment_reports_author
  on public.comment_reports(comment_author_id);

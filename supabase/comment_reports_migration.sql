-- ══════════════════════════════════════════════════════════════════
-- ZGŁOSZENIA KOMENTARZY — Comment Reports Migration
-- Uruchom w: Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- 1. Dodaj kolumnę strikes do profili (liczba ostrzeżeń / strike'ów)
alter table public.profiles
  add column if not exists strikes integer not null default 0;

-- 2. Tabela zgłoszeń komentarzy
create table if not exists public.comment_reports (
  id                uuid        primary key default gen_random_uuid(),

  -- Jeden z poniższych jest wypełniony zależnie od comment_type
  comment_id        uuid,                               -- profile_comments.id (tablica)
  photo_comment_id  uuid,                               -- profile_photo_comments.id (zdjęcie)

  comment_type      text        not null
                    check (comment_type in ('wall', 'photo')),

  comment_content   text        not null,               -- snapshot treści w chwili zgłoszenia

  -- Kto napisał komentarz (autor komentarza)
  comment_author_id uuid        references public.profiles(id) on delete set null,

  -- Kto zgłasza
  reporter_id       uuid        references public.profiles(id) on delete set null,

  reason            text        not null,

  -- Status: pending → admin widzi | resolved → strike dany | dismissed → odrzucone
  status            text        not null default 'pending'
                    check (status in ('pending', 'resolved', 'dismissed')),

  created_at        timestamptz default now()
);

-- 3. Row Level Security
alter table public.comment_reports enable row level security;

-- Wszyscy zalogowani mogą wstawiać zgłoszenia
create policy "Auth users can insert comment_reports"
  on public.comment_reports
  for insert
  with check (auth.uid() is not null);

-- Odczyt otwarty (admin używa przez anon key; można potem ograniczyć)
create policy "Anyone can read comment_reports"
  on public.comment_reports
  for select
  using (true);

-- Aktualizacja statusu (admin)
create policy "Anyone can update comment_reports"
  on public.comment_reports
  for update
  using (true);

-- 4. Indeks na status (szybkie filtrowanie "pending")
create index if not exists idx_comment_reports_status
  on public.comment_reports(status);

-- 5. Indeks na autora (szybkie zliczanie strike'ów po autorze)
create index if not exists idx_comment_reports_author
  on public.comment_reports(comment_author_id);

-- ══════════════════════════════════════════════════════════════════
-- LOGIKA BANOWANIA (wskazówka — obsługiwana po stronie aplikacji):
--   Po każdym strike sprawdzaj: jeśli profiles.strikes >= 3
--   → ustaw profiles.status = 'banned'
-- ══════════════════════════════════════════════════════════════════

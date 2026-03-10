-- ═══════════════════════════════════════════════════════════════
-- Dodanie brakujących kolumn do tabeli profiles
-- ═══════════════════════════════════════════════════════════════

-- Dodaj kolumny jeśli nie istnieją
alter table public.profiles add column if not exists drinking text;
alter table public.profiles add column if not exists pets text;
alter table public.profiles add column if not exists sexual_orientation text;
alter table public.profiles add column if not exists looking_for text;

-- Ustaw domyślne wartości
update public.profiles
set drinking = ''
where drinking is null;

update public.profiles
set pets = ''
where pets is null;

update public.profiles
set sexual_orientation = ''
where sexual_orientation is null;

update public.profiles
set looking_for = ''
where looking_for is null;

-- Potwierdzenie
select 'Kolumny dodane pomyślnie!' as status;

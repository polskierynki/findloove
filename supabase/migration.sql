-- Dodanie kolumny email do profili (jeśli nie istnieje)
alter table public.profiles add column if not exists email text;
-- Wymuś unikalność emaila (jeśli nie null)
create unique index if not exists profiles_email_unique on public.profiles (email) where email is not null;
-- Galeria zdjęć: photos[] w profiles (proste rozwiązanie)
alter table public.profiles add column if not exists photos text[];

-- ═══════════════════════════════════════════════════════════════
-- AKTUALIZACJA: Dodanie nowych kolumn do istniejącej tabeli
-- ═══════════════════════════════════════════════════════════════

-- Stosunek do alkoholu
alter table public.profiles add column if not exists drinking text;

-- Zwierzęta domowe
alter table public.profiles add column if not exists pets text;

-- Orientacja seksualna
alter table public.profiles add column if not exists sexual_orientation text;

-- Czego szuka użytkownik (przyjaźń/miłość/przygoda)
alter table public.profiles add column if not exists looking_for text;

-- ═══════════════════════════════════════════════════════════════

-- Alternatywnie: osobna tabela profile_photos (bardziej elastyczne)
create table if not exists public.profile_photos (
  profile_id uuid references public.profiles(id) on delete cascade,
  is_main boolean default false,
  created_at timestamptz default now()
);
-- ───────────────────────────────────────────────────────────────
-- ADMIN: Tabela zgłoszeń użytkowników (report/flag)
-- ───────────────────────────────────────────────────────────────
create table if not exists public.admin_reports (
  id uuid primary key default gen_random_uuid(),
  reported_profile_id uuid references public.profiles(id) on delete cascade,
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
);
-- ═══════════════════════════════════════════════════════════════
-- ZŁOTE LATA — SQL Migration
-- ═══════════════════════════════════════════════════════════════
--
-- ▶ ŚWIEŻA INSTALACJA (baza pusta):
--   Odkomentuj sekcję "ŚWIEŻA INSTALACJA" i uruchom cały plik.
--
-- ▶ BAZA JUŻ ISTNIEJE (np. dostajesz "relation already exists"):
--   Uruchom tylko sekcję "AKTUALIZACJA" na dole pliku.
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer not null check (age >= 8 and age <= 120),
  city text not null,
  bio text,
  interests text[] default '{}',
  status text,
  alter table public.profiles add column if not exists verification_pending boolean default false;
  image_url text,
  is_verified boolean default false,
  occupation text,
  zodiac text,
  smoking text,
  children text,
  gender text,
  seeking_gender text,
  seeking_age_min integer default 8,
  seeking_age_max integer default 120,
  to_profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(from_profile_id, to_profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid references public.profiles(id) on delete cascade,
  to_profile_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.messages enable row level security;

create policy "Public read profiles"  on public.profiles for select using (true);
create policy "Public insert profiles" on public.profiles for insert with check (true);
create policy "Public read likes"     on public.likes    for select using (true);
create policy "Public insert likes"   on public.likes    for insert with check (true);
create policy "Public read messages"  on public.messages for select using (true);
create policy "Public insert messages" on public.messages for insert with check (true);

insert into public.profiles (name, age, city, bio, interests, status, image_url, is_verified, occupation, zodiac, smoking, children, gender, seeking_gender, seeking_age_min, seeking_age_max) values
('Anna', 68, 'Kraków',
 'Emerytowana nauczycielka biologii. Kocham spacery po ogrodzie botanicznym i dobrą herbatę przy książce. Szukam kogoś do wspólnych wyjść do teatru i rozmów o życiu.',
 array['Ogrodnictwo','Teatr','Literatura','Podróże'], 'Szuka przyjaźni',
 'https://images.unsplash.com/photo-1551001738-95629f633633?auto=format&fit=crop&q=80&w=600',
 true, 'Emerytka (Nauczycielka)', 'Panna', 'Niepaląca', 'Mam dorosłe dzieci', 'K', 'M', 60, 80),
('Marek', 72, 'Gdańsk',
 'Pasjonat żeglarstwa i majsterkowania. Mimo wieku wciąż aktywny fizycznie. Chciałbym poznać panią, która doceni domowe ciasto i wspólny spacer nad morzem.',
 array['Majsterkowanie','Morze','Gotowanie','Krzyżówki'], 'Szuka miłości',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
 true, 'Inżynier na emeryturze', 'Byk', 'Okazyjnie', 'Dziadek trójki wnucząt', 'M', 'K', 58, 75),
('Elżbieta', 65, 'Wrocław',
 'Energiczna optymistka. Uwielbiam taniec towarzyski i nordic walking. Szukam osoby, z którą mogłabym dzielić pasję do aktywnego spędzania czasu.',
 array['Taniec','Sport','Kino','Koty'], 'Szuka przygody',
 'https://images.unsplash.com/photo-1544168190-79c17527004f?auto=format&fit=crop&q=80&w=600',
 false, 'Księgowa', 'Waga', 'Niepaląca', 'Bezdzietna', 'K', 'K', 55, 75),
('Janusz', 70, 'Poznań',
 'Dawniej muzyk filharmonii, dziś pasjonat gry w szachy i historii II Wojny Światowej. Szukam spokojnej osoby na wspólne wieczory.',
 array['Muzyka','Szachy','Historia','Las'], 'Szuka miłości',
 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=600',
 true, 'Muzyk', 'Koziorożec', 'Niepalący', 'Mam dzieci', 'M', 'K', 60, 78);


-- SUPER ADMIN PROFILE (nie do usunięcia przez innych użytkowników)
insert into public.profiles (
  id, name, age, city, bio, interests, status, image_url, is_verified, occupation, zodiac, smoking, children, gender, seeking_gender, seeking_age_min, seeking_age_max, created_at
) values (
  '00000000-0000-0000-0000-000000000001',
  'Super Admin',
  40,
  'Łódź',
  'Konto techniczne: super administrator. Nie do usunięcia przez innych użytkowników. Dostęp tylko dla właściciela serwisu.',
  array['Admin','Zarządzanie'],
  'Super Admin',
  'https://ui-avatars.com/api/?name=Admin&background=111827&color=fff&size=256',
  true,
  'Właściciel serwisu',
  'Lew',
  'Niepalący',
  'Brak',
  'M',
  'Dowolna',
  18,
  120,
  now()
)
on conflict (id) do nothing;

-- SUPER ADMIN AUTH (przykład, dostosuj do systemu auth, np. Supabase Auth lub inny)
-- E-mail: lio1985lodz@gmail.com
-- Hasło: wQ7!pZr2@eL9#xVt

-- Uwaga: Jeśli korzystasz z Supabase Auth, utwórz użytkownika przez panel lub API, a następnie przypisz mu id: 00000000-0000-0000-0000-000000000001

-- Ochrona przed usunięciem:
-- Dodaj w aplikacji lub triggerze SQL blokadę usuwania profilu o id = '00000000-0000-0000-0000-000000000001'
-- Przykład triggera:
--
-- create or replace function protect_super_admin() returns trigger as $$
-- begin
--   if old.id = '00000000-0000-0000-0000-000000000001' then
--     raise exception 'Nie można usunąć super admina!';
--   end if;
--   return old;
-- end;
-- $$ language plpgsql;
--
-- create trigger no_delete_super_admin
--   before delete on public.profiles
--   for each row execute function protect_super_admin();

*/



alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists seeking_gender text;
alter table public.profiles add column if not exists seeking_age_min integer default 50;
alter table public.profiles add column if not exists seeking_age_max integer default 100;
alter table public.profiles add column if not exists is_blocked boolean default false;
alter table public.profiles add column if not exists last_active timestamptz;
alter table public.profiles add column if not exists role text default 'user';

-- Ustawienie roli super_admin dla profilu technicznego
update public.profiles set role = 'super_admin' where id = '00000000-0000-0000-0000-000000000001';

update public.profiles set gender = 'K', seeking_gender = 'M', seeking_age_min = 60, seeking_age_max = 80 where name = 'Anna'      and gender is null;
update public.profiles set gender = 'M', seeking_gender = 'K', seeking_age_min = 58, seeking_age_max = 75 where name = 'Marek'     and gender is null;
update public.profiles set gender = 'K', seeking_gender = 'K', seeking_age_min = 55, seeking_age_max = 75 where name = 'Elżbieta'  and gender is null;
update public.profiles set gender = 'M', seeking_gender = 'K', seeking_age_min = 60, seeking_age_max = 78 where name = 'Janusz'    and gender is null;

update public.profiles
set image_url = 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?auto=format&fit=crop&q=80&w=600'
where name = 'Anna' and age = 68;


-- ───────────────────────────────────────────────────────────────
-- SEKCJA C: PROFILE TESTOWE (8 profili — 4K + 4M)
-- Bezpieczne do uruchomienia wielokrotnie (ON CONFLICT DO NOTHING
-- nie istnieje dla INSERT bez unique key, więc usuń ręcznie jeśli
-- chcesz uruchomić ponownie).
-- ───────────────────────────────────────────────────────────────

insert into public.profiles
  (name, age, city, bio, interests, status, image_url, is_verified, occupation, zodiac, smoking, children, gender, seeking_gender, seeking_age_min, seeking_age_max)
values
(
  'Halina', 63, 'Warszawa',
  'Ciepła i rodzinna kobieta z pasją do gotowania i ogrodnictwa. Wychowałam troje dzieci, teraz delektuję się wnukami i wolnym czasem. Szukam spokojnego, dobrego mężczyzny do wspólnych wieczorów przy herbacie i długich spacerów.',
  array['Gotowanie','Ogrodnictwo','Wnuki','Spacery','Kościół'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600',
  true, 'Emerytka (Pielęgniarka)', 'Byk', 'Niepaląca', 'Mam wnukata/ki', 'K', 'M', 58, 75
),
(
  'Krystyna', 71, 'Kraków',
  'Przez 40 lat leczyłam ludzi — teraz czas na siebie. Kocham literaturę, muzykę klasyczną i teatr. Mam poczucie humoru i wciąż jestem ciekawa świata. Chciałabym poznać kogoś kulturalnego do rozmów i wspólnych wyjść.',
  array['Literatura','Muzyka','Teatr','Kino','Fotografia'],
  'Szuka przyjaźni',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600',
  true, 'Lekarz na emeryturze', 'Panna', 'Niepaląca', 'Mam dorosłe dzieci', 'K', 'M', 63, 80
),
(
  'Danuta', 67, 'Gdańsk',
  'Aktywna, niezależna i pełna energii! Taniec towarzyski to moja wielka pasja — chodzę na zajęcia dwa razy w tygodniu. Lubię też nordic walking nad morzem i jogę. Szukam kobiety do wspólnych aktywności i szczerych rozmów.',
  array['Taniec','Nordic Walking','Joga','Rowerowanie','Koty'],
  'Szuka przygody',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=600',
  false, 'Nauczycielka (emerytka)', 'Waga', 'Okazyjnie', 'Bezdzietna', 'K', 'K', 55, 73
),
(
  'Barbara', 59, 'Wrocław',
  'Prowadziłam własną firmę przez 20 lat — teraz zwalniam tempo i odkrywam świat. Podróże to mój żywioł, byłam już w 30 krajach. Szukam mężczyzny z pasją, który nie boi się nowych przygód i ma apetyt na życie.',
  array['Podróże','Fotografia','Kino','Sport','Muzyka'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&q=80&w=600',
  true, 'Przedsiębiorczyni', 'Lew', 'Niepaląca', 'Bezdzietna', 'K', 'M', 55, 72
),
(
  'Stanisław', 68, 'Łódź',
  'Całe życie budowałem mosty — teraz buduję relacje. Spokojny, solidny i z dużym poczuciem humoru. Lubię majsterkować w garażu, grać w szachy i wyjeżdżać na weekend nad jezioro z wędką. Czekam na kogoś wyjątkowego.',
  array['Majsterkowanie','Szachy','Wędkarstwo','Historia','Las'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&q=80&w=600',
  true, 'Inżynier na emeryturze', 'Koziorożec', 'Niepalący', 'Mam dorosłe dzieci', 'M', 'K', 58, 72
),
(
  'Zygmunt', 74, 'Poznań',
  'Przez całe życie otaczała mnie muzyka — grałem na skrzypcach w orkiestrze przez 35 lat. Teraz słucham, czytam i chodzę na długie spacery. Szukam spokojnej, ciepłej kobiety do rozmów o życiu i wspólnego spędzania czasu.',
  array['Muzyka','Literatura','Spacery','Kościół','Szachy'],
  'Szuka przyjaźni',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=600',
  true, 'Muzyk (emeryt)', 'Skorpion', 'Niepalący', 'Mam wnukata/ki', 'M', 'K', 60, 78
),
(
  'Ryszard', 61, 'Warszawa',
  'Wciąż aktywny zawodowo i sportowo. Trzy razy w tygodniu pływam, latem wyjeżdżam na rower. Jestem otwarty, bezpośredni i nie lubię nudy. Szukam mężczyzny o podobnym stylu życia — aktywnego, ciekawego świata.',
  array['Sport','Rowerowanie','Basen','Podróże','Fotografia'],
  'Szuka przygody',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600',
  false, 'Przedsiębiorca', 'Baran', 'Okazyjnie', 'Bezdzietny', 'M', 'M', 52, 68
),
(
  'Henryk', 70, 'Gdańsk',
  'Emerytowany kardiolog z miłością do historii i ogrodnictwa. Mój ogród to moje sanktuarium. Jestem człowiekiem spokojnym, uważnym i czułym. Szukam kobiety, która doceni ciszę, dobrą książkę i wspólne gotowanie.',
  array['Historia','Literatura','Ogrodnictwo','Gotowanie','Muzyka'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600',
  true, 'Lekarz na emeryturze', 'Ryby', 'Niepalący', 'Mam dorosłe dzieci', 'M', 'K', 57, 72
);

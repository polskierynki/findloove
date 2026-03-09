-- ═══════════════════════════════════════════════════════════════
-- ZŁOTE LATA — Odświeżenie profili testowych
-- ═══════════════════════════════════════════════════════════════
-- Data: 9 marca 2026
--
-- Ten skrypt:
-- 1. Usuwa WSZYSTKIE stare profile testowe (poza super adminem)
-- 2. Dodaje nowe, atrakcyjne profile z dobrymi zdjęciami
-- 3. Zapełnia stronę realistycznymi danymi do testów
--
-- UWAGA: To usunie WSZYSTKIE profile poza super adminem!
-- Jeśli masz prawdziwych użytkowników, NIE uruchamiaj tego skryptu!
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- KROK 1: Usuń stare profile (poza super adminem)
-- ───────────────────────────────────────────────────────────────

-- Usuń polubienia (cascaduje automatycznie, ale dla pewności)
delete from public.likes
where from_profile_id != '00000000-0000-0000-0000-000000000001'
  and to_profile_id != '00000000-0000-0000-0000-000000000001';

-- Usuń wiadomości
delete from public.messages
where from_profile_id != '00000000-0000-0000-0000-000000000001'
  and to_profile_id != '00000000-0000-0000-0000-000000000001';

-- Usuń wszystkie profile poza super adminem
delete from public.profiles
where id != '00000000-0000-0000-0000-000000000001';

-- ───────────────────────────────────────────────────────────────
-- KROK 2: Dodaj nowe, świeże profile testowe
-- ───────────────────────────────────────────────────────────────

insert into public.profiles
  (name, age, city, bio, interests, status, image_url, is_verified, occupation, zodiac, smoking, children, gender, seeking_gender, seeking_age_min, seeking_age_max)
values
-- ═══ KOBIETY ═══
(
  'Zofia', 64, 'Warszawa',
  'Emerytowana nauczycielka języka polskiego z pasją do literatury i teatru. Uwielbiam spacery po Łazienkach i wieczory przy dobrej książce. Szukam kulturalnego mężczyzny do rozmów o sztuce i wspólnych wyjść do teatru. Mam poczucie humoru i ciepłe serce.',
  array['Literatura','Teatr','Spacery','Kino','Muzyka klasyczna'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?auto=format&fit=crop&q=80&w=600',
  true, 'Emerytka (Nauczycielka)', 'Waga', 'Niepaląca', 'Mam dorosłe dzieci', 'K', 'M', 60, 75
),
(
  'Krystyna', 68, 'Kraków',
  'Aktywna babcia dwójki wnucząt. Kocham gotowanie (moje pierogi słyną w całej rodzinie!), ogrodnictwo i nordic walking. Jestem ciepła, otwarta i pełna energii. Szukam mężczyzny, który doceni domowe ciasto i wspólne wycieczki po górach.',
  array['Gotowanie','Ogrodnictwo','Nordic Walking','Wnuki','Kościół'],
  'Szuka przyjaźni',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600',
  true, 'Emerytka (Pielęgniarka)', 'Byk', 'Niepaląca', 'Babcia', 'K', 'M', 62, 78
),
(
  'Danuta', 61, 'Gdańsk',
  'Energiczna optymistka z miłością do morza i aktywnego życia. Tańczę salsy dwa razy w tygodniu, chodzę na jogę i uwielbiam podróże. Szukam kobiety o podobnej energii do wspólnych przygód i szczerych rozmów przy winie.',
  array['Taniec','Joga','Podróże','Morze','Koty'],
  'Szuka przygody',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=600',
  false, 'Właścicielka salonu fryzjerskiego', 'Lew', 'Okazyjnie', 'Bezdzietna', 'K', 'K', 55, 68
),
(
  'Jolanta', 66, 'Wrocław',
  'Całe życie kierowałam zespołem w dużej firmie, teraz odkrywam świat i siebie. Byłam już w 25 krajach i mam apetyt na więcej! Uwielbiam fotografię, dobrą kawę i głębokie rozmowy. Szukam mężczyzny z pasją i chęcią do życia.',
  array['Podróże','Fotografia','Kawa','Kino','Sport'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&q=80&w=600',
  true, 'Menedżerka (emerytka)', 'Panna', 'Niepaląca', 'Bezdzietna', 'K', 'M', 60, 75
),
(
  'Elżbieta', 69, 'Poznań',
  'Spokojna i refleksyjna, z wielką miłością do natury. Maluję akwarele, hoduje storczyki i medytuję. Jestem wegetarianką i praktykuję jogę od 20 lat. Szukam duchowej, spokojnej osoby do wspólnego wzrostu.',
  array['Malarstwo','Joga','Ogrodnictwo','Natura','Medytacja'],
  'Szuka przyjaźni',
  'https://images.unsplash.com/photo-1544168190-79c17527004f?auto=format&fit=crop&q=80&w=600',
  true, 'Artystka', 'Ryby', 'Niepaląca', 'Mam dorosłe dzieci', 'K', 'Dowolna', 58, 75
),
(
  'Barbara', 63, 'Łódź',
  'Pielęgniarka z 40-letnim stażem, teraz na zasłużonej emeryturze. Jestem opiekuńcza, ciepła i lubię pomagać innym. Uwielbiam kryminały (książki i seriale!), spacery z psem i spotkania z przyjaciółmi. Szukam dobrego, spokojnego mężczyzny.',
  array['Czytanie','Psy','Seriale','Spacery','Gotowanie'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600',
  false, 'Emerytka (Pielęgniarka)', 'Rak', 'Niepaląca', 'Mam dzieci', 'K', 'M', 58, 72
),
(
  'Halina', 72, 'Katowice',
  'Emerytowana bibliotekarka z ogromną wiedzą i jeszcze większym sercem. Książki to moje życie, ale uwielbiam też długie rozmowy przy herbacie. Mam troje wnucząt, które są moją radością. Szukam mężczyzny do cichych, spokojnych chwil.',
  array['Literatura','Filozofia','Herbata','Rodzina','Historia'],
  'Szuka przyjaźni',
  'https://images.unsplash.com/photo-1551001738-95629f633633?auto=format&fit=crop&q=80&w=600',
  true, 'Bibliotekarka (emerytka)', 'Koziorożec', 'Niepaląca', 'Babcia', 'K', 'M', 65, 80
),

-- ═══ MĘŻCZYŹNI ═══
(
  'Marek', 67, 'Warszawa',
  'Emerytowany architekt z pasją do historii i sztuki. Zwiedzam muzea, chodzę na wystawy i kocham dobrą restaurację. Jestem kulturalny, oczytany i mam poczucie humoru. Szukam inteligentnej kobiety do wspólnych odkryć kulturalnych.',
  array['Architektura','Muzea','Sztuka','Restauracje','Podróże'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
  true, 'Architekt (emeryt)', 'Wodnik', 'Niepalący', 'Mam dorosłe dzieci', 'M', 'K', 60, 72
),
(
  'Janusz', 70, 'Gdańsk',
  'Całe życie związany z morzem — byłem kapitanem statku. Teraz żegluję rekreacyjnie i majsterkuję przy łodzi. Lubię aktywność fizyczną, morze i dobrą książkę. Szukam kobiety, która nie boi się wiatru w żaglach i słonej wody.',
  array['Żeglarstwo','Morze','Majsterkowanie','Sport','Podróże'],
  'Szuka przygody',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=600',
  true, 'Kapitan (emeryt)', 'Skorpion', 'Okazyjnie', 'Mam dzieci', 'M', 'K', 58, 75
),
(
  'Stanisław', 65, 'Kraków',
  'Emerytowany inżynier budowlany. Całe życie budowałem mosty, teraz buduję relacje. Spokojny, solidny, z poczuciem humoru. Lubię szachy, wędkarstwo i historie przy ognisku. Czekam na kogoś wyjątkowego do wspólnego życia.',
  array['Szachy','Wędkarstwo','Majsterkowanie','Las','Historia'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&q=80&w=600',
  true, 'Inżynier (emeryt)', 'Byk', 'Niepalący', 'Dziadek', 'M', 'K', 60, 72
),
(
  'Zygmunt', 73, 'Poznań',
  'Muzyk z krwi i kości — grałem w orkiestrze symfonicznej przez 40 lat. Muzyka klasyczna to mój świat. Lubię też dobre wino, rozmowy o życiu i długie spacery. Szukam kobiety z duszą i wrażliwością na piękno.',
  array['Muzyka','Koncerty','Wino','Literatura','Spacery'],
  'Szuka przyjaźni',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=600',
  true, 'Muzyk (emeryt)', 'Panna', 'Niepalący', 'Mam wnuków', 'M', 'K', 62, 78
),
(
  'Ryszard', 62, 'Wrocław',
  'Wciąż aktywny zawodowo i życiowo. Prowadzę własną firmę konsultingową. Trzy razy w tygodniu na siłowni, w weekendy na rowerze. Jestem otwarty, bezpośredni i energiczny. Szukam mężczyzny o podobnym stylu życia.',
  array['Sport','Rowerowanie','Biznes','Podróże','Fotografia'],
  'Szuka przygody',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600',
  false, 'Konsultant biznesowy', 'Baran', 'Okazyjnie', 'Bezdzietny', 'M', 'M', 55, 70
),
(
  'Henryk', 68, 'Łódź',
  'Emerytowany lekarz internista z pasją do ogrodnictwa. Mój ogród to moja duma — uprawiam warzywa i kwiaty. Jestem spokojny, uważny i czuły. Lubię gotować (zwłaszcza włoskie potrawy) i dobrą muzykę. Szukam kobiety do wspólnego życia.',
  array['Ogrodnictwo','Gotowanie','Medycyna','Muzyka','Natura'],
  'Szuka miłości',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600',
  true, 'Lekarz (emeryt)', 'Rak', 'Niepalący', 'Mam dzieci', 'M', 'K', 60, 72
),
(
  'Tadeusz', 71, 'Szczecin',
  'Emerytowany nauczyciel historii z wielką pasją do genealogii i archiwów. Odkrywam przeszłość rodzin i piszę lokalne opowieści. Lubię biblioteki, spokój i rozmowy o tym, co było. Szukam kobiety z podobnymi pasjami.',
  array['Historia','Genealogia','Czytanie','Pisanie','Archiwa'],
  'Szuka przyjaźni',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
  false, 'Nauczyciel (emeryt)', 'Koziorożec', 'Niepalący', 'Mam rodzinę', 'M', 'K', 63, 75
);

-- ───────────────────────────────────────────────────────────────
-- KROK 3: Dodaj przykładowe polubienia (dla realizmu)
-- ───────────────────────────────────────────────────────────────

-- Zofia polubiła Marka, Janusza, Stanisława
insert into public.likes (from_profile_id, to_profile_id)
select
  (select id from public.profiles where name = 'Zofia' limit 1),
  id
from public.profiles
where name in ('Marek', 'Janusz', 'Stanisław')
on conflict do nothing;

-- Marek polubił Zofię i Jolantę
insert into public.likes (from_profile_id, to_profile_id)
select
  (select id from public.profiles where name = 'Marek' limit 1),
  id
from public.profiles
where name in ('Zofia', 'Jolanta')
on conflict do nothing;

-- Krystyna polubiła Stanisława i Henryka
insert into public.likes (from_profile_id, to_profile_id)
select
  (select id from public.profiles where name = 'Krystyna' limit 1),
  id
from public.profiles
where name in ('Stanisław', 'Henryk')
on conflict do nothing;

-- Danuta polubiła Elżbietę
insert into public.likes (from_profile_id, to_profile_id)
select
  (select id from public.profiles where name = 'Danuta' limit 1),
  id
from public.profiles
where name = 'Elżbieta'
on conflict do nothing;

-- Ryszard polubił Zygmunta
insert into public.likes (from_profile_id, to_profile_id)
select
  (select id from public.profiles where name = 'Ryszard' limit 1),
  id
from public.profiles
where name = 'Zygmunt'
on conflict do nothing;

-- ───────────────────────────────────────────────────────────────
-- GOTOWE!
-- ───────────────────────────────────────────────────────────────
-- Teraz masz:
-- - 14 nowych, realistycznych profili z dobrymi zdjęciami
-- - Mix kobiet i mężczyzn (7 + 7)
-- - Różne orientacje (większość hetero, 2 LGBT+)
-- - Różne miasta Polski
-- - Przykładowe polubienia do testów
-- - Wszystkie profile bez email/hasła (tylko wygląd strony)
-- ───────────────────────────────────────────────────────────────

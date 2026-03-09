-- ═══════════════════════════════════════════════════════════════
-- ZŁOTE LATA — SQL Migration (DZIAŁAJĄCA, IDEMPOTENTNA WERSJA)
-- ═══════════════════════════════════════════════════════════════
--
-- Ten plik można uruchamiać wielokrotnie.
-- Domyślnie uruchamiaj CAŁOŚĆ (A-F).
-- Jeśli nie chcesz danych testowych, pomiń sekcję F.
--
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────
-- SEKCJA A: TWORZENIE TABEL
-- ───────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer not null check (age >= 18 and age <= 120),
  city text not null,
  bio text,
  interests text[] not null default '{}',
  status text,
  image_url text,
  is_verified boolean not null default false,
  verification_pending boolean not null default false,
  occupation text,
  zodiac text,
  smoking text,
  children text,
  drinking text,
  pets text,
  sexual_orientation text,
  looking_for text,
  gender text,
  seeking_gender text,
  seeking_age_min integer default 18,
  seeking_age_max integer default 120,
  is_blocked boolean not null default false,
  last_active timestamptz,
  email text,
  photos text[] not null default '{}',
  role text not null default 'user',
  is_premium boolean not null default false,
  premium_until timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from (
      select lower(email) as email_norm, count(*) as cnt
      from public.profiles
      where email is not null and btrim(email) <> ''
      group by lower(email)
      having count(*) > 1
    ) duplicates
  ) then
    raise notice 'Pominieto tworzenie unique index na email: wykryto duplikaty email w profiles.';
  else
    execute 'create unique index if not exists profiles_email_unique on public.profiles (email) where email is not null';
  end if;
end $$;

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid references public.profiles(id) on delete cascade not null,
  to_profile_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(from_profile_id, to_profile_id)
);

create index if not exists likes_to_profile_id_idx on public.likes (to_profile_id);
create index if not exists likes_created_at_idx on public.likes (created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid references public.profiles(id) on delete cascade not null,
  to_profile_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_from_to_created_idx
  on public.messages (from_profile_id, to_profile_id, created_at desc);

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  is_main boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profile_photos_profile_id_idx on public.profile_photos (profile_id);

create table if not exists public.admin_reports (
  id uuid primary key default gen_random_uuid(),
  reported_profile_id uuid references public.profiles(id) on delete cascade not null,
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists admin_reports_status_idx on public.admin_reports (status);
create index if not exists admin_reports_created_at_idx on public.admin_reports (created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null default 'manual', -- stripe | p24 | blik | manual
  plan_code text not null,                 -- np. premium_monthly, premium_quarterly
  status text not null default 'pending',  -- pending | active | trial | past_due | canceled | expired
  amount_gross integer not null default 0, -- kwota w groszach
  currency text not null default 'PLN',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_profile_id_idx on public.subscriptions (profile_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create unique index if not exists subscriptions_provider_sub_id_unique
  on public.subscriptions (provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  provider text not null,
  event_type text not null,
  event_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_events_subscription_id_idx
  on public.subscription_events (subscription_id);
create index if not exists subscription_events_event_id_idx
  on public.subscription_events (event_id);

-- ───────────────────────────────────────────────────────────────
-- SEKCJA B: KOMPATYBILNOŚĆ ZE STARSZĄ SCHEMĄ
-- ───────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists photos text[];
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists seeking_gender text;
alter table public.profiles add column if not exists seeking_age_min integer default 18;
alter table public.profiles add column if not exists seeking_age_max integer default 120;
alter table public.profiles add column if not exists is_blocked boolean default false;
alter table public.profiles add column if not exists last_active timestamptz;
alter table public.profiles add column if not exists verification_pending boolean default false;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists is_premium boolean default false;
alter table public.profiles add column if not exists premium_until timestamptz;

update public.profiles
set interests = '{}'
where interests is null;

update public.profiles
set photos = '{}'
where photos is null;

update public.profiles
set age = 18
where age is null or age < 18;

update public.profiles
set age = 120
where age > 120;

update public.profiles
set seeking_age_min = 18
where seeking_age_min is null;

update public.profiles
set seeking_age_max = 120
where seeking_age_max is null;

update public.profiles
set seeking_age_min = 18
where seeking_age_min < 18;

update public.profiles
set seeking_age_max = 120
where seeking_age_max > 120;

update public.profiles
set seeking_age_min = seeking_age_max
where seeking_age_min > seeking_age_max;

update public.profiles
set role = 'user'
where role is null or role not in ('user', 'admin', 'super_admin');

alter table public.profiles alter column interests set default '{}';
alter table public.profiles alter column photos set default '{}';
alter table public.profiles alter column role set default 'user';
alter table public.profiles alter column is_premium set default false;
alter table public.profiles alter column verification_pending set default false;

alter table public.profiles alter column interests set not null;
alter table public.profiles alter column photos set not null;
alter table public.profiles alter column role set not null;
alter table public.profiles alter column is_premium set not null;
alter table public.profiles alter column verification_pending set not null;

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age >= 18 and age <= 120);

alter table public.profiles drop constraint if exists profiles_seeking_age_range_check;
alter table public.profiles
  add constraint profiles_seeking_age_range_check
  check (seeking_age_min <= seeking_age_max);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'super_admin'));

alter table public.profile_photos add column if not exists id uuid default gen_random_uuid();
alter table public.profile_photos add column if not exists url text;
alter table public.profile_photos add column if not exists is_main boolean default false;
alter table public.profile_photos add column if not exists sort_order integer default 0;
alter table public.profile_photos add column if not exists created_at timestamptz default now();

update public.profile_photos
set id = gen_random_uuid()
where id is null;

update public.profile_photos pp
set url = coalesce(pp.url, p.image_url, 'https://ui-avatars.com/api/?name=User&background=e2e8f0&color=475569&size=256')
from public.profiles p
where pp.profile_id = p.id
  and pp.url is null;

update public.profile_photos
set url = 'https://ui-avatars.com/api/?name=User&background=e2e8f0&color=475569&size=256'
where url is null;

alter table public.profile_photos alter column id set default gen_random_uuid();
alter table public.profile_photos alter column is_main set default false;
alter table public.profile_photos alter column sort_order set default 0;

alter table public.admin_reports add column if not exists status text default 'pending';
alter table public.admin_reports add column if not exists created_at timestamptz default now();
alter table public.admin_reports add column if not exists reviewed_at timestamptz;

update public.admin_reports
set status = 'pending'
where status is null;

alter table public.admin_reports alter column status set default 'pending';

alter table public.subscriptions add column if not exists provider text default 'manual';
alter table public.subscriptions add column if not exists plan_code text;
alter table public.subscriptions add column if not exists status text default 'pending';
alter table public.subscriptions add column if not exists amount_gross integer default 0;
alter table public.subscriptions add column if not exists currency text default 'PLN';
alter table public.subscriptions add column if not exists current_period_start timestamptz default now();
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists provider_customer_id text;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists created_at timestamptz default now();
alter table public.subscriptions add column if not exists updated_at timestamptz default now();

update public.subscriptions
set status = 'pending'
where status is null;

alter table public.subscriptions alter column status set default 'pending';
alter table public.subscriptions alter column amount_gross set default 0;
alter table public.subscriptions alter column currency set default 'PLN';
alter table public.subscriptions alter column updated_at set default now();

-- ───────────────────────────────────────────────────────────────
-- SEKCJA C: RLS I POLITYKI (DEV/DEMO - PUBLIC)
-- ───────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.messages enable row level security;
alter table public.profile_photos enable row level security;
alter table public.admin_reports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;

drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles" on public.profiles for select using (true);

drop policy if exists "Public insert profiles" on public.profiles;
create policy "Public insert profiles" on public.profiles for insert with check (true);

drop policy if exists "Public update profiles" on public.profiles;
create policy "Public update profiles" on public.profiles for update using (true);

drop policy if exists "Public delete profiles" on public.profiles;
create policy "Public delete profiles" on public.profiles for delete using (true);

drop policy if exists "Public read likes" on public.likes;
create policy "Public read likes" on public.likes for select using (true);

drop policy if exists "Public insert likes" on public.likes;
create policy "Public insert likes" on public.likes for insert with check (true);

drop policy if exists "Public delete likes" on public.likes;
create policy "Public delete likes" on public.likes for delete using (true);

drop policy if exists "Public read messages" on public.messages;
create policy "Public read messages" on public.messages for select using (true);

drop policy if exists "Public insert messages" on public.messages;
create policy "Public insert messages" on public.messages for insert with check (true);

drop policy if exists "Public delete messages" on public.messages;
create policy "Public delete messages" on public.messages for delete using (true);

drop policy if exists "Public read photos" on public.profile_photos;
create policy "Public read photos" on public.profile_photos for select using (true);

drop policy if exists "Public insert photos" on public.profile_photos;
create policy "Public insert photos" on public.profile_photos for insert with check (true);

drop policy if exists "Public update photos" on public.profile_photos;
create policy "Public update photos" on public.profile_photos for update using (true);

drop policy if exists "Public delete photos" on public.profile_photos;
create policy "Public delete photos" on public.profile_photos for delete using (true);

drop policy if exists "Public read reports" on public.admin_reports;
create policy "Public read reports" on public.admin_reports for select using (true);

drop policy if exists "Public insert reports" on public.admin_reports;
create policy "Public insert reports" on public.admin_reports for insert with check (true);

drop policy if exists "Public update reports" on public.admin_reports;
create policy "Public update reports" on public.admin_reports for update using (true);

drop policy if exists "Public read subscriptions" on public.subscriptions;
create policy "Public read subscriptions" on public.subscriptions for select using (true);

drop policy if exists "Public insert subscriptions" on public.subscriptions;
create policy "Public insert subscriptions" on public.subscriptions for insert with check (true);

drop policy if exists "Public update subscriptions" on public.subscriptions;
create policy "Public update subscriptions" on public.subscriptions for update using (true);

drop policy if exists "Public read subscription events" on public.subscription_events;
create policy "Public read subscription events" on public.subscription_events for select using (true);

drop policy if exists "Public insert subscription events" on public.subscription_events;
create policy "Public insert subscription events" on public.subscription_events for insert with check (true);

-- ───────────────────────────────────────────────────────────────
-- SEKCJA D: FUNKCJE I TRIGGERY
-- ───────────────────────────────────────────────────────────────

create or replace function protect_super_admin() returns trigger as $$
begin
  if old.id = '00000000-0000-0000-0000-000000000001' then
    raise exception 'Nie można usunąć konta Super Admin!';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists no_delete_super_admin on public.profiles;
create trigger no_delete_super_admin
  before delete on public.profiles
  for each row execute function protect_super_admin();

create or replace function update_last_active() returns trigger as $$
begin
  new.last_active = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profile_update_last_active on public.profiles;
create trigger profile_update_last_active
  before update on public.profiles
  for each row execute function update_last_active();

create or replace function set_subscription_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function set_subscription_updated_at();

-- ───────────────────────────────────────────────────────────────
-- SEKCJA E: DANE TECHNICZNE (SUPER ADMIN)
-- ───────────────────────────────────────────────────────────────

insert into public.profiles (
  id,
  name,
  age,
  city,
  bio,
  interests,
  status,
  image_url,
  is_verified,
  occupation,
  zodiac,
  smoking,
  children,
  gender,
  seeking_gender,
  seeking_age_min,
  seeking_age_max,
  email,
  role,
  is_premium,
  created_at
) values (
  '00000000-0000-0000-0000-000000000001',
  'Super Admin',
  40,
  'Łódź',
  'Konto techniczne: super administrator. Nie do usunięcia przez innych użytkowników. Dostęp tylko dla właściciela serwisu.',
  array['Admin', 'Zarządzanie'],
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
  'lio1985lodz@gmail.com',
  'super_admin',
  true,
  now()
)
on conflict (id) do update set
  name = excluded.name,
  role = 'super_admin',
  email = excluded.email,
  is_verified = true,
  is_premium = true;

update public.profiles
set role = 'super_admin'
where id = '00000000-0000-0000-0000-000000000001';

-- ───────────────────────────────────────────────────────────────
-- SEKCJA F: PROFILE TESTOWE (NIE DUPLIKUJĄ SIĘ PRZY KOLEJNYCH RUNACH)
-- ───────────────────────────────────────────────────────────────

with seed_profiles (
  name,
  age,
  city,
  bio,
  interests,
  status,
  image_url,
  is_verified,
  occupation,
  zodiac,
  smoking,
  children,
  gender,
  seeking_gender,
  seeking_age_min,
  seeking_age_max
) as (
  values
    (
      'Halina', 63, 'Warszawa',
      'Ciepła i rodzinna kobieta z pasją do gotowania i ogrodnictwa. Wychowałam troje dzieci, teraz delektuję się wnukami i wolnym czasem. Szukam spokojnego, dobrego mężczyzny do wspólnych wieczorów przy herbacie i długich spacerów.',
      array['Gotowanie', 'Ogrodnictwo', 'Wnuki', 'Spacery', 'Kościół'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600',
      true, 'Emerytka (Pielęgniarka)', 'Byk', 'Niepaląca', 'Mam wnukata/ki', 'K', 'M', 58, 75
    ),
    (
      'Krystyna', 71, 'Kraków',
      'Przez 40 lat leczyłam ludzi — teraz czas na siebie. Kocham literaturę, muzykę klasyczną i teatr. Mam poczucie humoru i wciąż jestem ciekawa świata. Chciałabym poznać kogoś kulturalnego do rozmów i wspólnych wyjść.',
      array['Literatura', 'Muzyka', 'Teatr', 'Kino', 'Fotografia'],
      'Szuka przyjaźni',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600',
      true, 'Lekarz na emeryturze', 'Panna', 'Niepaląca', 'Mam dorosłe dzieci', 'K', 'M', 63, 80
    ),
    (
      'Danuta', 67, 'Gdańsk',
      'Aktywna, niezależna i pełna energii! Taniec towarzyski to moja wielka pasja — chodzę na zajęcia dwa razy w tygodniu. Lubię też nordic walking nad morzem i jogę. Szukam kobiety do wspólnych aktywności i szczerych rozmów.',
      array['Taniec', 'Nordic Walking', 'Joga', 'Rowerowanie', 'Koty'],
      'Szuka przygody',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=600',
      false, 'Nauczycielka (emerytka)', 'Waga', 'Okazyjnie', 'Bezdzietna', 'K', 'K', 55, 73
    ),
    (
      'Barbara', 59, 'Wrocław',
      'Prowadziłam własną firmę przez 20 lat — teraz zwalniam tempo i odkrywam świat. Podróże to mój żywioł, byłam już w 30 krajach. Szukam mężczyzny z pasją, który nie boi się nowych przygód i ma apetyt na życie.',
      array['Podróże', 'Fotografia', 'Kino', 'Sport', 'Muzyka'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&q=80&w=600',
      true, 'Przedsiębiorczyni', 'Lew', 'Niepaląca', 'Bezdzietna', 'K', 'M', 55, 72
    ),
    (
      'Anna', 68, 'Kraków',
      'Emerytowana nauczycielka biologii. Kocham spacery po ogrodzie botanicznym i dobrą herbatę przy książce. Szukam kogoś do wspólnych wyjść do teatru i rozmów o życiu.',
      array['Ogrodnictwo', 'Teatr', 'Literatura', 'Podróże'],
      'Szuka przyjaźni',
      'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?auto=format&fit=crop&q=80&w=600',
      true, 'Emerytka (Nauczycielka)', 'Panna', 'Niepaląca', 'Mam dorosłe dzieci', 'K', 'M', 60, 80
    ),
    (
      'Stanisław', 68, 'Łódź',
      'Całe życie budowałem mosty — teraz buduję relacje. Spokojny, solidny i z dużym poczuciem humoru. Lubię majsterkować w garażu, grać w szachy i wyjeżdżać na weekend nad jezioro z wędką. Czekam na kogoś wyjątkowego.',
      array['Majsterkowanie', 'Szachy', 'Wędkarstwo', 'Historia', 'Las'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&q=80&w=600',
      true, 'Inżynier na emeryturze', 'Koziorożec', 'Niepalący', 'Mam dorosłe dzieci', 'M', 'K', 58, 72
    ),
    (
      'Zygmunt', 74, 'Poznań',
      'Przez całe życie otaczała mnie muzyka — grałem na skrzypcach w orkiestrze przez 35 lat. Teraz słucham, czytam i chodzę na długie spacery. Szukam spokojnej, ciepłej kobiety do rozmów o życiu i wspólnego spędzania czasu.',
      array['Muzyka', 'Literatura', 'Spacery', 'Kościół', 'Szachy'],
      'Szuka przyjaźni',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=600',
      true, 'Muzyk (emeryt)', 'Skorpion', 'Niepalący', 'Mam wnukata/ki', 'M', 'K', 60, 78
    ),
    (
      'Ryszard', 61, 'Warszawa',
      'Wciąż aktywny zawodowo i sportowo. Trzy razy w tygodniu pływam, latem wyjeżdżam na rower. Jestem otwarty, bezpośredni i nie lubię nudy. Szukam mężczyzny o podobnym stylu życia — aktywnego, ciekawego świata.',
      array['Sport', 'Rowerowanie', 'Basen', 'Podróże', 'Fotografia'],
      'Szuka przygody',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600',
      false, 'Przedsiębiorca', 'Baran', 'Okazyjnie', 'Bezdzietny', 'M', 'M', 52, 68
    ),
    (
      'Henryk', 70, 'Gdańsk',
      'Emerytowany kardiolog z miłością do historii i ogrodnictwa. Mój ogród to moje sanktuarium. Jestem człowiekiem spokojnym, uważnym i czułym. Szukam kobiety, która doceni ciszę, dobrą książkę i wspólne gotowanie.',
      array['Historia', 'Literatura', 'Ogrodnictwo', 'Gotowanie', 'Muzyka'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600',
      true, 'Lekarz na emeryturze', 'Ryby', 'Niepalący', 'Mam dorosłe dzieci', 'M', 'K', 57, 72
    ),
    (
      'Marek', 72, 'Gdańsk',
      'Pasjonat żeglarstwa i majsterkowania. Mimo wieku wciąż aktywny fizycznie. Chciałbym poznać panią, która doceni domowe ciasto i wspólny spacer nad morzem.',
      array['Majsterkowanie', 'Morze', 'Gotowanie', 'Krzyżówki'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
      true, 'Inżynier na emeryturze', 'Byk', 'Okazyjnie', 'Dziadek trójki wnucząt', 'M', 'K', 58, 75
    ),
    (
      'Elżbieta', 65, 'Wrocław',
      'Energiczna optymistka. Uwielbiam taniec towarzyski i nordic walking. Szukam osoby, z którą mogłabym dzielić pasję do aktywnego spędzania czasu.',
      array['Taniec', 'Sport', 'Kino', 'Koty'],
      'Szuka przygody',
      'https://images.unsplash.com/photo-1544168190-79c17527004f?auto=format&fit=crop&q=80&w=600',
      false, 'Księgowa', 'Waga', 'Niepaląca', 'Bezdzietna', 'K', 'K', 55, 75
    ),
    (
      'Janusz', 70, 'Poznań',
      'Dawniej muzyk filharmonii, dziś pasjonat gry w szachy i historii II Wojny Światowej. Szukam spokojnej osoby na wspólne wieczory.',
      array['Muzyka', 'Szachy', 'Historia', 'Las'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=600',
      true, 'Muzyk', 'Koziorożec', 'Niepalący', 'Mam dzieci', 'M', 'K', 60, 78
    )
)
insert into public.profiles (
  name,
  age,
  city,
  bio,
  interests,
  status,
  image_url,
  is_verified,
  occupation,
  zodiac,
  smoking,
  children,
  gender,
  seeking_gender,
  seeking_age_min,
  seeking_age_max,
  role,
  photos,
  created_at
)
select
  sp.name,
  sp.age,
  sp.city,
  sp.bio,
  sp.interests,
  sp.status,
  sp.image_url,
  sp.is_verified,
  sp.occupation,
  sp.zodiac,
  sp.smoking,
  sp.children,
  sp.gender,
  sp.seeking_gender,
  sp.seeking_age_min,
  sp.seeking_age_max,
  'user',
  array[sp.image_url],
  now()
from seed_profiles sp
where not exists (
  select 1
  from public.profiles p
  where p.name = sp.name
    and p.age = sp.age
    and p.city = sp.city
);

-- ───────────────────────────────────────────────────────────────
-- SEKCJA G: DEDUPLIKACJA PROFILI DEMO (role=user, email is null)
-- ───────────────────────────────────────────────────────────────
--
-- Scalamy duplikaty o tym samym (name, age, city).
-- Zostaje najstarszy rekord (najmniejsze created_at / id),
-- a relacje z tabel zależnych są przepinane do rekordu docelowego.

do $$
begin
  create temporary table if not exists _profile_dedupe_map (
    duplicate_id uuid primary key,
    keeper_id uuid not null
  ) on commit drop;

  truncate table _profile_dedupe_map;

  insert into _profile_dedupe_map (duplicate_id, keeper_id)
  with ranked as (
    select
      p.id,
      first_value(p.id) over (
        partition by lower(btrim(p.name)), p.age, lower(btrim(p.city))
        order by p.created_at asc, p.id asc
      ) as keeper_id,
      row_number() over (
        partition by lower(btrim(p.name)), p.age, lower(btrim(p.city))
        order by p.created_at asc, p.id asc
      ) as rn
    from public.profiles p
    where p.role = 'user'
      and p.email is null
  )
  select id as duplicate_id, keeper_id
  from ranked
  where rn > 1;

  if exists (select 1 from _profile_dedupe_map) then
    -- messages
    update public.messages m
    set from_profile_id = map.keeper_id
    from _profile_dedupe_map map
    where m.from_profile_id = map.duplicate_id;

    update public.messages m
    set to_profile_id = map.keeper_id
    from _profile_dedupe_map map
    where m.to_profile_id = map.duplicate_id;

    -- admin_reports
    update public.admin_reports r
    set reported_profile_id = map.keeper_id
    from _profile_dedupe_map map
    where r.reported_profile_id = map.duplicate_id;

    update public.admin_reports r
    set reporter_profile_id = map.keeper_id
    from _profile_dedupe_map map
    where r.reporter_profile_id = map.duplicate_id;

    -- profile_photos
    update public.profile_photos pp
    set profile_id = map.keeper_id
    from _profile_dedupe_map map
    where pp.profile_id = map.duplicate_id;

    -- subscriptions
    update public.subscriptions s
    set profile_id = map.keeper_id
    from _profile_dedupe_map map
    where s.profile_id = map.duplicate_id;

    -- likes: przebudowa, bo mamy unique(from_profile_id, to_profile_id)
    create temporary table _likes_rebuilt (
      from_profile_id uuid not null,
      to_profile_id uuid not null,
      created_at timestamptz not null
    ) on commit drop;

    insert into _likes_rebuilt (from_profile_id, to_profile_id, created_at)
    select
      coalesce(map_from.keeper_id, l.from_profile_id) as from_profile_id,
      coalesce(map_to.keeper_id, l.to_profile_id) as to_profile_id,
      min(l.created_at) as created_at
    from public.likes l
    left join _profile_dedupe_map map_from on map_from.duplicate_id = l.from_profile_id
    left join _profile_dedupe_map map_to on map_to.duplicate_id = l.to_profile_id
    group by 1, 2
    having coalesce(map_from.keeper_id, l.from_profile_id) <> coalesce(map_to.keeper_id, l.to_profile_id);

    delete from public.likes;

    insert into public.likes (from_profile_id, to_profile_id, created_at)
    select from_profile_id, to_profile_id, created_at
    from _likes_rebuilt
    on conflict (from_profile_id, to_profile_id) do nothing;

    -- Usuń profile-dupki po przepięciu relacji
    delete from public.profiles p
    using _profile_dedupe_map map
    where p.id = map.duplicate_id;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────
-- SEKCJA H: DODATKOWE PROFILE DEMO (nie duplikują się)
-- ───────────────────────────────────────────────────────────────

with extra_seed_profiles (
  name,
  age,
  city,
  bio,
  interests,
  status,
  image_url,
  is_verified,
  occupation,
  zodiac,
  smoking,
  children,
  gender,
  seeking_gender,
  seeking_age_min,
  seeking_age_max
) as (
  values
    (
      'Teresa', 66, 'Lublin',
      'Lubię spacery, książki i spokojne wieczory przy muzyce. Szukam ciepłej relacji i codziennej życzliwości.',
      array['Literatura', 'Spacery', 'Muzyka', 'Gotowanie'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1546961329-78bef0414d7c?auto=format&fit=crop&q=80&w=600',
      true, 'Emerytka', 'Waga', 'Niepaląca', 'Mam dorosłe dzieci', 'K', 'M', 60, 75
    ),
    (
      'Józef', 73, 'Szczecin',
      'Cenię spokój, szczerość i dobre rozmowy. Najchętniej spędzam czas nad wodą i w ogrodzie.',
      array['Ogrodnictwo', 'Wędkarstwo', 'Historia', 'Spacery'],
      'Szuka przyjaźni',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=600',
      false, 'Emeryt', 'Byk', 'Niepalący', 'Mam wnukata/ki', 'M', 'K', 62, 78
    ),
    (
      'Grażyna', 62, 'Katowice',
      'Jestem pogodna i aktywna. Chętnie tańczę, chodzę do teatru i poznaję nowe osoby.',
      array['Taniec', 'Teatr', 'Kino', 'Podróże'],
      'Szuka przygody',
      'https://images.unsplash.com/photo-1541233349642-6e425fe6190e?auto=format&fit=crop&q=80&w=600',
      true, 'Księgowa', 'Lew', 'Okazyjnie', 'Bezdzietna', 'K', 'M', 55, 70
    ),
    (
      'Andrzej', 69, 'Bydgoszcz',
      'Pasjonuję się muzyką i rowerem. Szukam osoby z poczuciem humoru do wspólnego odkrywania świata.',
      array['Muzyka', 'Rowerowanie', 'Kino', 'Szachy'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=600',
      true, 'Inżynier', 'Koziorożec', 'Niepalący', 'Mam dzieci', 'M', 'K', 58, 72
    ),
    (
      'Maria', 75, 'Toruń',
      'Uwielbiam gotować i rozmawiać przy herbacie. Szukam spokojnej relacji opartej na zaufaniu.',
      array['Gotowanie', 'Krzyżówki', 'Kościół', 'Literatura'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1581579438747-104c53d2f93b?auto=format&fit=crop&q=80&w=600',
      false, 'Emerytka', 'Panna', 'Niepaląca', 'Mam wnukata/ki', 'K', 'M', 64, 80
    ),
    (
      'Paweł', 64, 'Rzeszów',
      'Aktywny, serdeczny, lubię góry i fotografię. Szukam kobiety do wspólnych wyjazdów i rozmów.',
      array['Podróże', 'Fotografia', 'Sport', 'Spacery'],
      'Szuka przygody',
      'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=600',
      true, 'Przedsiębiorca', 'Baran', 'Okazyjnie', 'Mam dorosłe dzieci', 'M', 'K', 55, 70
    ),
    (
      'Irena', 70, 'Olsztyn',
      'Lubię naturę, jeziora i spokojny rytm dnia. Cenię serdeczność i wspólne małe radości.',
      array['Morze', 'Las', 'Spacery', 'Ogrodnictwo'],
      'Szuka przyjaźni',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=600',
      true, 'Emerytka', 'Rak', 'Niepaląca', 'Mam dorosłe dzieci', 'K', 'M', 62, 78
    ),
    (
      'Bogdan', 67, 'Białystok',
      'Spokojny i konkretny, lubię długie spacery i rozmowy o życiu. Szukam ciepłej, uczciwej relacji.',
      array['Historia', 'Spacery', 'Muzyka', 'Gotowanie'],
      'Szuka miłości',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
      false, 'Emeryt', 'Skorpion', 'Niepalący', 'Mam dzieci', 'M', 'K', 58, 74
    )
)
insert into public.profiles (
  name,
  age,
  city,
  bio,
  interests,
  status,
  image_url,
  is_verified,
  occupation,
  zodiac,
  smoking,
  children,
  gender,
  seeking_gender,
  seeking_age_min,
  seeking_age_max,
  role,
  photos,
  created_at
)
select
  sp.name,
  sp.age,
  sp.city,
  sp.bio,
  sp.interests,
  sp.status,
  sp.image_url,
  sp.is_verified,
  sp.occupation,
  sp.zodiac,
  sp.smoking,
  sp.children,
  sp.gender,
  sp.seeking_gender,
  sp.seeking_age_min,
  sp.seeking_age_max,
  'user',
  array[sp.image_url],
  now()
from extra_seed_profiles sp
where not exists (
  select 1
  from public.profiles p
  where p.name = sp.name
    and p.age = sp.age
    and p.city = sp.city
);

-- ═══════════════════════════════════════════════════════════════
-- KONIEC MIGRACJI
-- ═══════════════════════════════════════════════════════════════

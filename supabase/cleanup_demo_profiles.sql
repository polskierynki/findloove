-- =============================================================
-- CLEANUP: Usuń demo/seed profile, zostaw tylko prawdziwe konta
-- =============================================================
-- Uruchom to w Supabase SQL Editor.
--
-- Usuwa profile które NIE mają odpowiadającego wpisu w auth.users
-- (czyli wszystkie seed-owane demo profile, które nie mają konta).
-- Prawdziwe profile (stworzone przez rejestrację) zostają nienaruszone.

delete from public.profiles
where id not in (
  select id from auth.users
);

-- Sprawdzenie ile pozostało:
select count(*) as remaining_real_profiles from public.profiles;

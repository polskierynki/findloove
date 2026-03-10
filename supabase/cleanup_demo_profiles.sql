-- =============================================================
-- CLEANUP: Usuń demo/seed profile, zostaw tylko prawdziwe konta
-- =============================================================
-- Uruchom to w Supabase SQL Editor.
--
-- Usuwa profile które NIE mają odpowiadającego wpisu w auth.users
-- (czyli wszystkie seed-owane demo profile, które nie mają konta).
-- Prawdziwe profile (stworzone przez rejestrację) zostają nienaruszone.
-- Dodatkowo chroni profile admin/super_admin oraz wybrane konto realne.

-- Podgląd, co zostanie usunięte:
select id, name, email, role
from public.profiles p
where p.id not in (
  select u.id from auth.users u
)
and coalesce(p.role, '') not in ('admin', 'super_admin')
and lower(coalesce(p.email, '')) not in (
  'lsobczak@rentcompany.nl',
  'lio1985lodz@gmail.com'
);

delete from public.profiles p
where p.id not in (
  select u.id from auth.users u
)
and coalesce(p.role, '') not in ('admin', 'super_admin')
and lower(coalesce(p.email, '')) not in (
  'lsobczak@rentcompany.nl',
  'lio1985lodz@gmail.com'
);

-- Sprawdzenie ile pozostało:
select count(*) as remaining_real_profiles from public.profiles;

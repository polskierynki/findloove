-- MAGIC LINK SETUP FOR FINDLOOVE.PL
-- Wykonaj te kroki w Supabase Dashboard (SQL + Auth settings)

-- 1) Ten SQL jest opcjonalny: trigger tworzenia profilu po założeniu użytkownika przez magic link
-- Uruchom tylko jeśli chcesz auto-tworzyć rekord w tabeli profiles z auth.users

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
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
    created_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Użytkownik'),
    25,
    'Warszawa',
    'Cześć! Miło Cię poznać.',
    array[]::text[],
    'Szuka znajomości',
    'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?auto=format&fit=crop&q=80&w=600',
    false,
    'Wolny zawód',
    'Nieznany',
    'Niepalący/a',
    'Wolę nie odpowiadać',
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) KONFIGURACJA W SUPABASE DASHBOARD (manualnie, nie SQL):
-- Authentication -> URL Configuration:
--   Site URL: https://findloove.pl
--   Redirect URLs dodaj:
--     https://findloove.pl
--     https://www.findloove.pl
--     http://localhost:3000
--
-- Authentication -> Providers -> Email:
--   Włącz "Enable email provider"
--   Włącz "Confirm email" (zalecane)
--
-- Authentication -> SMTP Settings:
--   Włącz "Enable custom SMTP"
--   Sender email: hello@findloove.pl
--   Sender name: FindLoove
--   Ustaw dane SMTP od Twojego dostawcy poczty (np. Resend, Mailgun, Brevo, Google Workspace)
--
-- Authentication -> Email Templates -> Magic Link:
--   Subject: Zaloguj się do FindLoove
--   Template (HTML) ustaw wg własnych potrzeb brandowych
--
-- 3) UWAGA:
-- Sam SQL NIE ustawi nadawcy hello@findloove.pl.
-- Nadawca jest ustawiany wyłącznie w SMTP Settings w panelu Supabase.

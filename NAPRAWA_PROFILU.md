# Jak naprawić błąd 406 i problem z profilem

## Problem
- Błąd 406 z Supabase przy próbie odczytu profilu
- Brakujące polityki RLS (Row Level Security) dla UPDATE i DELETE

## Rozwiązanie

### Krok 1: Uruchom SQL fix w Supabase Dashboard

1. Zaloguj się do **Supabase Dashboard**: https://supabase.com/dashboard
2. Wybierz swój projekt
3. Przejdź do **SQL Editor** (w menu po lewej)
4. Skopiuj zawartość pliku `supabase/fix_rls_policies.sql`
5. Wklej do edytora SQL
6. Kliknij **Run** (lub naciśnij F5)

### Krok 2: Wyczyść cache przeglądarki

**Chrome/Brave:**
1. Naciśnij `Cmd+Shift+Delete` (Mac) lub `Ctrl+Shift+Delete` (Windows)
2. Wybierz "Cached images and files"
3. Kliknij "Clear data"

**Safari:**
1. Naciśnij `Cmd+Option+E`
2. Odśwież stronę: `Cmd+R`

**Lub po prostu:**
- Otwórz stronę w trybie prywatnym/incognito
- Naciśnij `Cmd+Shift+R` (Mac) lub `Ctrl+Shift+R` (Windows) aby wymusić przeładowanie

### Krok 3: Zweryfikuj działanie

1. Odśwież stronę aplikacji
2. Zaloguj się ponownie jeśli potrzeba
3. Kliknij "Mój profil"
4. Sprawdź konsolę deweloperską (F12) - nie powinno być błędów 406 ani #418

## Co zostało naprawione

✅ Dodano politykę UPDATE dla profiles (brak jej powodował błąd 406)
✅ Dodano politykę DELETE dla profiles
✅ Naprawiono politykę INSERT aby działała z auth.uid()
✅ Dodano polityki dla tabeli profile_photos
✅ Poprawiono błąd React #418 w MyProfileView (nieprawidłowe renderowanie JSX)

## Jeśli nadal nie działa

Otwórz konsolę deweloperską (F12) i sprawdź zakładkę "Network":
- Czy request do `/rest/v1/profiles` zwraca 200 czy 406?
- Jakie są nagłówki odpowiedzi?
- Czy w zakładce "Console" są jakieś nowe błędy?

Wyślij screenshot błędów jeśli nadal występują.

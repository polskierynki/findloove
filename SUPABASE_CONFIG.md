# Konfiguracja Supabase dla FindLooove.pl

## Problem z resetowaniem hasła

Jeśli link do resetowania hasła nie przekierowuje poprawnie na formularz, musisz skonfigurować URL w Supabase Dashboard.

## Wymagana konfiguracja

### 1. Otwórz Supabase Dashboard

1. Zaloguj się na [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Wybierz projekt FindLooove
3. Przejdź do **Authentication** → **URL Configuration**

### 2. Skonfiguruj Site URL

W polu **Site URL** wpisz:
```
https://findloove.pl
```

### 3. Skonfiguruj Redirect URLs

W polu **Redirect URLs** dodaj następujące URLe (każdy w nowej linii):

```
https://findloove.pl
https://findloove.pl/
https://findloove.pl/**
http://localhost:3000
http://localhost:3000/
http://localhost:3000/**
```

**Ważne:** Upewnij się, że **každy URL jest w osobnej linii** i kliknij **Save**

### 4. Dodatkowa konfiguracja (opcjonalnie)

Jeśli chcesz mieć więcej kontroli, możesz też ustawić:

**Email Link Expiry Time:** 3600 (1 godzina w sekundach)

### 5. Testowanie

Po zapisaniu konfiguracji:

1. Usuń starą aplikację z przeglądarki (Ctrl+Shift+Del lub Cmd+Shift+Del)
2. Otwórz FindLooove.pl w trybie incognito
3. Kliknij "Zapomniałeś hasła?"
4. Podaj swój email
5. Sprawdź skrzynkę pocztową
6. Kliknij w link w emailu
7. Powinieneś być przekierowany na FindLooove.pl z otwartym modalem resetowania hasła

### 6. Debugowanie

Jeśli nadal nie działa, otwórz konsolę przeglądarki (F12) i sprawdź:

1. **Po kliknięciu linku z emaila** - szukaj w konsoli:
   - `Current URL hash: ...` - powinien zawierać `#access_token=...&type=recovery`
   - `Recovery hash detected, showing modal` - jeśli hash jest prawidłowy
   - `Auth event: PASSWORD_RECOVERY` - jeśli Supabase wykrył reset hasła

2. Jeśli nie widzisz żadnych logów:
   - Sprawdź czy jesteś na `https://findloove.pl` (nie localhost)
   - Sprawdź czy w URL jest hash `#...` lub query param `?type=recovery`
   - Sprawdź Network tab czy nie ma błędów

### 7. Troubleshooting

**Problem:** Link przekierowuje na Supabase zamiast na FindLooove.pl
- **Rozwiązanie:** Sprawdź czy `https://findloove.pl` jest w Redirect URLs (punkt 3)

**Problem:** Link przekierowuje na FindLooove.pl ale nie otwiera modala
- **Rozwiązanie:** Otwórz konsolę (F12) i sprawdź logi. Hash powinien zawierać `type=recovery`

**Problem:** Modal się nie otwiera nawet z prawidłowym hashem
- **Rozwiązanie:** Upewnij się, że kod jest na najnowszej wersji (git pull) i odśwież stronę z Ctrl+Shift+R

**Problem:** "Invalid redirect URL" error
- **Rozwiązanie:** Dodaj dokładnie ten URL do Redirect URLs w Supabase, który widzisz w błędzie

## Weryfikacja konfiguracji

Po poprawnej konfiguracji:

✅ Site URL: `https://findloove.pl`
✅ Redirect URLs zawiera: `https://findloove.pl` i `https://findloove.pl/**`
✅ Email template zawiera: `{{ .ConfirmationURL }}`
✅ Link w emailu prowadzi do Supabase i przekierowuje na FindLooove.pl
✅ URL na FindLooove.pl zawiera hash `#access_token=...&type=recovery`
✅ Modal "Ustaw nowe hasło" otwiera się automatycznie

## Kontakt

Jeśli problem nadal występuje, napisz na support@findloove.pl z:
- Screenshotem URL po kliknięciu linku
- Logami z konsoli przeglądarki (F12)
- Informacją czy jesteś na localhost czy findloove.pl

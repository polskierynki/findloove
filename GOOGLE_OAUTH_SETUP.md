# Konfiguracja Google OAuth - Instrukcja

## Twój Google Client ID
```
1074360342431-f5i6a8m37v41rl4u7h2b5pdpcb2p77tj.apps.googleusercontent.com
```

## 🔧 Krok 1: Konfiguracja w Google Cloud Console

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Wybierz swój projekt lub utwórz nowy
3. Znajdź swój OAuth 2.0 Client ID (który zaczyna się od `1074360342431-...`)
4. Kliknij edytuj (ikonka ołówka)

### Dodaj Authorized redirect URIs:
```
https://wpwxjnxmckqnkdwcauwv.supabase.co/auth/v1/callback
```

**Dla lokalnego testowania (opcjonalnie):**
```
http://localhost:3000/auth/callback
```

5. Zapisz zmiany
6. **WAŻNE:** Skopiuj również **Client Secret** (będzie potrzebny w następnym kroku)

---

## 🔐 Krok 2: Konfiguracja w Supabase Dashboard

1. Przejdź do [Supabase Dashboard](https://supabase.com/dashboard/project/wpwxjnxmckqnkdwcauwv)
2. Kliknij **Authentication** → **Providers**
3. Znajdź **Google** na liście i kliknij aby rozwinąć
4. Włącz przełącznik **"Enable Sign in with Google"**

### Wypełnij pola:

**Client ID:**
```
1074360342431-f5i6a8m37v41rl4u7h2b5pdpcb2p77tj.apps.googleusercontent.com
```

**Client Secret:**
```
[Wklej tutaj Client Secret z Google Cloud Console]
```

5. Kliknij **Save** / **Zapisz**

---

## 🌐 Krok 3: Konfiguracja Site URL w Supabase

1. W Supabase Dashboard przejdź do **Authentication** → **URL Configuration**
2. Ustaw **Site URL**:
   - Dla produkcji: `https://findloove.pl` (lub Twoja domena Vercel)
   - Dla developerki: `http://localhost:3000`

3. W **Redirect URLs** dodaj:
```
http://localhost:3000/**
https://findloove.pl/**
https://*.vercel.app/**
```

---

## ✅ Krok 4: Test logowania

1. Uruchom aplikację lokalnie: `npm run dev`
2. Przejdź do strony logowania
3. Kliknij przycisk Google (biała ikona z logo Google)
4. Zaloguj się swoim kontem Google
5. Powinieneś zostać przekierowany z powrotem do aplikacji jako zalogowany użytkownik

---

## 🐛 Rozwiązywanie problemów

### "redirect_uri_mismatch"
- Sprawdź czy URL w Google Cloud Console dokładnie pasuje do: `https://wpwxjnxmckqnkdwcauwv.supabase.co/auth/v1/callback`
- Upewnij się, że zapisałeś zmiany w Google Cloud Console

### "Invalid client_id"
- Sprawdź czy Client ID w Supabase jest identyczny jak w Google Cloud Console
- Usuń ewentualne spacje na początku/końcu

### "Invalid client_secret"
- Upewnij się, że skopiowałeś cały Client Secret z Google Cloud Console
- Sprawdź czy nie skopiowałeś przypadkiem Client ID zamiast Secret

### Użytkownik loguje się ale nie ma profilu
- Kod automatycznie tworzy profil w tabeli `profiles` po pierwszym logowaniu OAuth
- Sprawdź w Supabase Table Editor → profiles czy pojawił się nowy rekord

---

## 📝 Notatki techniczne

- Kod OAuth jest już gotowy w `components/views/AuthView.tsx`
- Po zalogowaniu przez Google, aplikacja automatycznie tworzy profil użytkownika
- Dane pobierane z Google: email, name (z user_metadata)
- Użytkownicy OAuth mają automatycznie `is_verified: true`

---

## 🚀 Deployment na Vercel

Po wdrożeniu na Vercel:
1. Dodaj do Google Cloud Console redirect URI z domeną Vercel:
```
https://[twoja-domena].vercel.app/auth/callback
https://findloove.pl/auth/callback
```

2. Zmień w Supabase **Site URL** na URL produkcyjny

# 🚀 Instrukcja migracji bazy danych Supabase

## Krok 1: Przygotowanie

1. Zaloguj się do panelu Supabase: https://app.supabase.com
2. Wybierz swój projekt
3. Przejdź do **SQL Editor** (ikona `</>` w lewym menu)

---

## Krok 2: Wybierz odpowiednią strategię

### 🆕 Opcja A: Świeża instalacja (baza PUSTA)

**Kiedy użyć:** Jeśli to pierwsza migracja lub chcesz zacząć od zera.

1. Otwórz plik `migration_fixed.sql`
2. Skopiuj **CAŁY** plik
3. Wklej do SQL Editor w Supabase
4. Kliknij **RUN** (lub Ctrl/Cmd + Enter)

To utworzy:
- ✅ Wszystkie tabele
- ✅ Polityki RLS
- ✅ Triggery
- ✅ 12 profili testowych (w tym Super Admin)

---

### 🔄 Opcja B: Aktualizacja istniejącej bazy

**Kiedy użyć:** Jeśli masz już tabele i dane w bazie.

1. Otwórz plik `migration_fixed.sql`
2. Skopiuj **TYLKO SEKCJĘ D** (od linii z napisem "SEKCJA D: AKTUALIZACJA")
3. Wklej do SQL Editor
4. Kliknij **RUN**

To doda:
- ✅ Brakujące kolumny
- ✅ Poprawioną walidację wieku
- ✅ Triggery (jeśli jeszcze nie istnieją)

**UWAGA:** To NIE nadpisze istniejących danych!

---

### 🗑️ Opcja C: Reset całej bazy (USUWA WSZYSTKO!)

**⚠️ OSTRZEŻENIE:** To usuwa WSZYSTKIE tabele i dane!

```sql
-- URUCHOM TO TYLKO JEŚLI CHCESZ USUNĄĆ CAŁĄ BAZĘ!
drop table if exists public.admin_reports cascade;
drop table if exists public.profile_photos cascade;
drop table if exists public.messages cascade;
drop table if exists public.likes cascade;
drop table if exists public.profiles cascade;

drop function if exists protect_super_admin() cascade;
drop function if exists update_last_active() cascade;
```

Następnie uruchom **Opcję A** (cały plik migration_fixed.sql).

---

## Krok 3: Weryfikacja

### Sprawdź czy tabele istnieją:

```sql
select table_name 
from information_schema.tables 
where table_schema = 'public';
```

Powinieneś zobaczyć:
- ✅ profiles
- ✅ likes
- ✅ messages
- ✅ profile_photos
- ✅ admin_reports

### Sprawdź liczbę profili:

```sql
select count(*) from public.profiles;
```

Powinno być: **12** (11 użytkowników + 1 Super Admin)

### Sprawdź strukturę tabeli profiles:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'profiles' and table_schema = 'public'
order by ordinal_position;
```

---

## Krok 4: Testowanie

### Test 1: Sprawdź profile testowe

```sql
select name, age, city, gender, seeking_gender 
from public.profiles 
where created_at > now() - interval '1 hour'
order by name;
```

### Test 2: Sprawdź trigger ochrony Super Admin

```sql
-- To powinno zwrócić błąd!
delete from public.profiles 
where id = '00000000-0000-0000-0000-000000000001';
```

Oczekiwany rezultat: `ERROR: Nie można usunąć konta Super Admin!`

### Test 3: Sprawdź RLS

```sql
select tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public';
```

---

## 🛠️ Rozwiązywanie problemów

### ❌ Błąd: "relation already exists"

**Rozwiązanie:** Użyj **Opcji B** (tylko SEKCJA D) zamiast całego pliku.

---

### ❌ Błąd: "duplicate key value violates unique constraint"

**Przyczyna:** Próba dodania profili testowych, które już istnieją.

**Rozwiązanie:** 
- Usuń ręcznie istniejące profile testowe ALBO
- Skomentuj SEKCJĘ C w migration_fixed.sql

---

### ❌ Błąd: "column already exists"

**Przyczyna:** Kolumna już istnieje (normalne przy ponownym uruchomieniu).

**Rozwiązanie:** Zignoruj - `ADD COLUMN IF NOT EXISTS` powinno to obsłużyć automatycznie.

---

### ❌ Błąd: "constraint does not exist"

**Przyczyna:** Stary constraint nie istnieje (normalne przy pierwszej migracji).

**Rozwiązanie:** Zignoruj - `DROP CONSTRAINT IF EXISTS` to obsłuży.

---

## 📧 Dane logowania Super Admin

Po uruchomieniu migracji masz profil Super Admin:

- **ID:** `00000000-0000-0000-0000-000000000001`
- **Email:** `lio1985lodz@gmail.com` (skonfiguruj w Supabase Auth)
- **Hasło:** `wQ7!pZr2@eL9#xVt` (ustaw w Supabase Auth)

⚠️ **WAŻNE:** Musisz dodatkowo utworzyć użytkownika w Supabase Auth panel z tym samym UUID!

---

## ✅ Gotowe!

Twoja baza danych jest skonfigurowana i gotowa do użycia. 

Następne kroki:
1. Uruchom aplikację Next.js: `npm run dev`
2. Przetestuj rejestrację nowego użytkownika
3. Sprawdź czy profile się wyświetlają
4. Przetestuj funkcje: polubienia, wiadomości, weryfikacja

---

## 📚 Dodatkowe zasoby

- [Dokumentacja Supabase SQL](https://supabase.com/docs/guides/database)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Triggery PostgreSQL](https://www.postgresql.org/docs/current/trigger-definition.html)

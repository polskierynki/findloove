# 🔧 PLAN: Naprawianie wysyłania/odbierania wiadomości

## Problem
- Wcześniej: wiadomości się wysyłały, notyfikacja była, ale tekst nie wyświetlał się
- Teraz: nic się nie wysyła, nic się nie odbiera

## Root-cause Investigation

Potencjalne przyczyny:
1. **RLS polityka jest zbyt restrykcyjna** - INSERT pada na 42501
2. **Profile nie są poprawnie powiązane z auth account** - `profiles.id` != `auth.uid()`
3. **Stary/zepsuty SQL** - helper functions nie działają

## 📋 Plan działania

### KROK 1: Uruchom ultra-prosty SQL

W **Supabase SQL Editor** (`SQL` tab) skopiuj i uruchom plik:
```
supabase/messages_rls_ultra_simple.sql
```

To:
- Usunie **wszystkie** stare polityki
- Stworzy **minimalne** SELECT/INSERT/DELETE polityki
- Bez żadnych helplerów ani RPC

### KROK 2: Sprawdź profile mapping w bazie

W **Supabase SQL Editor**, uruchom diagnostykę:
```
supabase/DIAGNOSTICS-messages-rls.sql
```

Uruchom **pojedyncze query** i sprawdzaj wyniki:

#### Query 1️⃣: Check auth UID
```sql
select auth.uid() as current_auth_uid;
```
**Expected:** Pokaże Twój UUID (np. `550e8400-e29b-41d4-a716-446655440000`)

#### Query 2️⃣: Check profiles mapping
```sql
select 
  p.id,
  p.email,
  p.name
from public.profiles p
where p.id = auth.uid()
   or p.email = (select au.email from auth.users au where au.id = auth.uid());
```
**Expected:** Pokazze Twój profil

**Problem?** Jeśli nic się nie pokaże = profil nie jest powiązany z auth.uid()

### KROK 3: Jeśli BRAK PROFILU

Run SQL fix:
```sql
-- Link profile to auth account by ID match
update public.profiles
set id = auth.uid()
where id != auth.uid()
  and (select count(*) from auth.users au where au.id = profiles.id) > 0;

-- Or fix by email match (legacy)
update public.profiles p
set id = au.id
from auth.users au
where p.id != au.id
  and p.email = au.email
  and p.email is not null;
```

### KROK 4: Test INSERT message

```sql
insert into public.messages (from_profile_id, to_profile_id, content)
values (
  auth.uid(),
  '00000000-0000-0000-0000-000000000002',  -- ⚠️ Change to real recipient
  'Test message'
)
returning id, from_profile_id, to_profile_id, content;
```

**Expected:** ✅ Message successfully inserted

**Problems:**
- `42501` = RLS blocking → check polityki
- `23503` = Foreign key error → recipient profile doesn't exist
- `42703` = Column error → schema issue

### KROK 5: Test SELECT message

```sql
select * from public.messages
where from_profile_id = auth.uid()
   or to_profile_id = auth.uid()
limit 5;
```

**Expected:** ✅ Shows messages you sent/received

**Problem?:**
- `42501` = SELECT policy blocking

### KROK 6: Frontend test

1. **Build & start dev server:**
   ```bash
   npm run build
   npm run dev
   ```

2. **Open DevTools Console** (F12)

3. **Navigate to /messages**

4. **Send test message**

5. **Look at console logs:**
```
📤 Sending message...
  From (currentUserId): <uuid>
  From (authUserId): <uuid>
  To: <recipient-uuid>
  Content: Test...

📤 Sender candidates: [<uuid>, <uuid>]
📤 Trying to send FROM profile: <uuid>
✅ Message sent successfully!
```

---

## 🚨 Debugging by Error Code

| Error | Meaning | Fix |
|-------|---------|-----|
| `42501` | Permission denied (RLS) | Check polityki, check mapping |
| `23503` | Foreign key error | Recipient profile doesn't exist |
| `42703` | Column not found | Schema mismatch |
| `22023` | Invalid parameter | Empty message? |
| Nothing sent | RPC doesn't exist | Use ultra-simple SQL |

---

## 📊 Diagnostics Queries

### Check RLS enabled:
```sql
select relname, relrowsecurity 
from pg_class 
where relname = 'messages';
```

### Check policies:
```sql
select policyname, cmd from pg_policies 
where tablename = 'messages';
```

### Manual insert as admin:
(In Supabase, use `postgres` connection to bypass RLS)
```sql
insert into public.messages (from_profile_id, to_profile_id, content)
values (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  'Direct insert bypassing RLS'
);
```

---

## ✅ Success Indicators

When working correctly:
1. ✅ Can send message (no errors in console)
2. ✅ Message appears in chat immediately
3. ✅ Recipient sees message (if logged in)
4. ✅ Real-time subscription works
5. ✅ Conversation list updates

---

## 🎯 Next Steps

When this is working:
1. Run full migrations script
2. Test edge cases (multiple profiles per user, email-based accounts)
3. Add better error messages
4. Add message receipts/read status

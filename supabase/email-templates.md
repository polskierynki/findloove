# Szablony Email dla Supabase Auth - FindLooove.pl

Skopiuj i wklej poniższe szablony w Supabase Dashboard → Authentication → Email Templates

---

## 1. Confirm signup (Potwierdzenie rejestracji)

**Subject (Temat):** Potwierdź swoją rejestrację w FindLooove.pl

**Body (Treść):**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f43f5e; font-size: 28px; margin: 0;">💗 FindLooove.pl</h1>
  </div>
  
  <div style="background-color: #fff1f2; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1e293b; font-size: 22px; margin-top: 0;">Witamy w FindLooove!</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Cieszymy się, że dołączasz do naszej społeczności! 
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Aby dokończyć rejestrację i aktywować swoje konto, kliknij w poniższy przycisk:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #f43f5e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
        Potwierdź konto
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
      Jeśli nie rejestrowałeś się w FindLooove.pl, po prostu zignoruj tę wiadomość.
    </p>
    <p style="color: #64748b; font-size: 13px; margin-top: 15px;">
      Link wygasa za 24 godziny.
    </p>
  </div>
  
  <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    <p>FindLooove.pl - Znajdź swoją miłość w Polsce</p>
    <p style="margin-top: 5px;">
      Masz pytania? Napisz do nas: 
      <a href="mailto:support@findloove.pl" style="color: #f43f5e; text-decoration: none;">support@findloove.pl</a>
    </p>
  </div>
</div>
```

---

## 2. Invite user (Zaproszenie użytkownika)

**Subject (Temat):** Zaproszenie do FindLooove.pl

**Body (Treść):**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f43f5e; font-size: 28px; margin: 0;">💗 FindLooove.pl</h1>
  </div>
  
  <div style="background-color: #fff1f2; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1e293b; font-size: 22px; margin-top: 0;">Zostałeś zaproszony!</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Otrzymujesz to zaproszenie, ponieważ ktoś uważa, że FindLooove.pl może Ci się spodobać!
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      FindLooove.pl to polski serwis randkowy, który pomaga ludziom znaleźć swojego partnera.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #f43f5e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
        Przyjmij zaproszenie
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
      Jeśli nie chcesz dołączyć, po prostu zignoruj tę wiadomość.
    </p>
  </div>
  
  <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    <p>FindLooove.pl - Znajdź swoją miłość w Polsce</p>
    <p style="margin-top: 5px;">
      Masz pytania? Napisz do nas: 
      <a href="mailto:support@findloove.pl" style="color: #f43f5e; text-decoration: none;">support@findloove.pl</a>
    </p>
  </div>
</div>
```

---

## 3. Magic Link (Magiczny link do logowania)

**Subject (Temat):** Twój link do logowania w FindLooove.pl

**Body (Treść):**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f43f5e; font-size: 28px; margin: 0;">💗 FindLooove.pl</h1>
  </div>
  
  <div style="background-color: #fff1f2; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1e293b; font-size: 22px; margin-top: 0;">Zaloguj się jednym kliknięciem</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Otrzymujesz tę wiadomość, ponieważ poprosiłeś o link do szybkiego logowania w FindLooove.pl.
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Kliknij poniższy przycisk, aby zalogować się bez hasła:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #f43f5e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
        Zaloguj się teraz
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
      Jeśli nie prosiłeś o ten link, po prostu zignoruj tę wiadomość. 
      Twoje konto pozostanie bezpieczne.
    </p>
    <p style="color: #64748b; font-size: 13px; margin-top: 15px;">
      Link wygasa za 1 godzinę.
    </p>
  </div>
  
  <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    <p>FindLooove.pl - Znajdź swoją miłość w Polsce</p>
    <p style="margin-top: 5px;">
      Masz pytania? Napisz do nas: 
      <a href="mailto:support@findloove.pl" style="color: #f43f5e; text-decoration: none;">support@findloove.pl</a>
    </p>
  </div>
</div>
```

---

## 4. Change Email Address (Zmiana adresu email)

**Subject (Temat):** Potwierdź zmianę adresu email w FindLooove.pl

**Body (Treść):**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f43f5e; font-size: 28px; margin: 0;">💗 FindLooove.pl</h1>
  </div>
  
  <div style="background-color: #fff1f2; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1e293b; font-size: 22px; margin-top: 0;">Potwierdź zmianę adresu email</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Otrzymujesz tę wiadomość, ponieważ poprosiłeś o zmianę adresu email powiązanego z Twoim kontem FindLooove.pl.
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Aby potwierdzić zmianę na ten nowy adres email, kliknij w poniższy przycisk:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #f43f5e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
        Potwierdź nowy email
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
      <strong>Ważne:</strong> Jeśli nie prosiłeś o zmianę adresu email, natychmiast zmień hasło do swojego konta i skontaktuj się z nami.
    </p>
    <p style="color: #64748b; font-size: 13px; margin-top: 15px;">
      Link wygasa za 24 godziny.
    </p>
  </div>
  
  <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    <p>FindLooove.pl - Znajdź swoją miłość w Polsce</p>
    <p style="margin-top: 5px;">
      Masz pytania? Napisz do nas: 
      <a href="mailto:support@findloove.pl" style="color: #f43f5e; text-decoration: none;">support@findloove.pl</a>
    </p>
  </div>
</div>
```

---

## 5. Reauthentication (Ponowne uwierzytelnienie)

**Subject (Temat):** Potwierdź swoją tożsamość w FindLooove.pl

**Body (Treść):**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f43f5e; font-size: 28px; margin: 0;">💗 FindLooove.pl</h1>
  </div>
  
  <div style="background-color: #fff1f2; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1e293b; font-size: 22px; margin-top: 0;">Wymagane ponowne uwierzytelnienie</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Aby zapewnić bezpieczeństwo Twojego konta, prosimy o potwierdzenie Twojej tożsamości.
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Kliknij w poniższy przycisk, aby potwierdzić, że to Ty:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #f43f5e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
        Potwierdź tożsamość
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
      To dodatkowa warstwa bezpieczeństwa mająca na celu ochronę Twojego konta przed nieautoryzowanym dostępem.
    </p>
    <p style="color: #64748b; font-size: 13px; margin-top: 15px;">
      Link wygasa za 15 minut.
    </p>
  </div>
  
  <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    <p>FindLooove.pl - Znajdź swoją miłość w Polsce</p>
    <p style="margin-top: 5px;">
      Masz pytania? Napisz do nas: 
      <a href="mailto:support@findloove.pl" style="color: #f43f5e; text-decoration: none;">support@findloove.pl</a>
    </p>
  </div>
</div>
```

---

## 6. Reset Password (Resetowanie hasła) - bonus

**Subject (Temat):** Resetowanie hasła do FindLooove.pl

**Body (Treść):**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f43f5e; font-size: 28px; margin: 0;">💗 FindLooove.pl</h1>
  </div>
  
  <div style="background-color: #fff1f2; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #1e293b; font-size: 22px; margin-top: 0;">Resetowanie hasła</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Otrzymałeś tę wiadomość, ponieważ poprosiłeś o zresetowanie hasła do swojego konta w FindLooove.pl.
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Kliknij w poniższy przycisk, aby ustawić nowe hasło:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #f43f5e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
        Ustaw nowe hasło
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
      Jeśli nie prosiłeś o zresetowanie hasła, po prostu zignoruj tę wiadomość. 
      Twoje hasło pozostanie niezmienione.
    </p>
    <p style="color: #64748b; font-size: 13px; margin-top: 15px;">
      Link wygasa za 1 godzinę.
    </p>
  </div>
  
  <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    <p>FindLooove.pl - Znajdź swoją miłość w Polsce</p>
    <p style="margin-top: 5px;">
      Masz pytania? Napisz do nas: 
      <a href="mailto:support@findloove.pl" style="color: #f43f5e; text-decoration: none;">support@findloove.pl</a>
    </p>
  </div>
</div>
```

---

## Instrukcja użycia

1. Otwórz **Supabase Dashboard** → Twój projekt FindLooove
2. Przejdź do **Authentication** → **Email Templates**
3. Dla każdego szablonu:
   - Znajdź odpowiedni template (Confirm signup, Invite user, Magic Link, etc.)
   - Skopiuj **Subject** i wklej w pole "Subject"
   - Skopiuj **Body** (kod HTML) i wklej w pole "Message (Body)"
   - Kliknij **Save**

## Konfiguracja SMTP

Aby emaile były wysyłane z adresu **hello@findloove.pl**, skonfiguruj własny SMTP w:
**Project Settings** → **Auth** → **SMTP Settings**

Przykładowa konfiguracja (np. dla Gmail/Google Workspace):
- Host: smtp.gmail.com
- Port: 587
- Sender email: hello@findloove.pl
- Sender name: FindLooove.pl

## Weryfikacja w kodzie

Wszystkie wywołania już mają `redirectTo` ustawione na `window.location.origin`, więc użytkownicy będą przekierowywani z powrotem do Twojej strony FindLooove.pl.

✓ Magic Link - ma `emailRedirectTo` w `/lib/magicLink.ts`
✓ Password Reset - ma `redirectTo` w `/components/views/AuthView.tsx`
✓ Sign Up - wymaga dodania `emailRedirectTo` (opcjonalne ulepszenie)

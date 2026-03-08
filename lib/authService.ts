import { supabase } from '@/lib/supabase';

type AuthServiceResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * KROK 1: Wysyła e-mail z kodem OTP do resetu hasła.
 */
export async function sendPasswordResetOtp(userEmail: string): Promise<AuthServiceResult> {
  const normalizedEmail = userEmail.trim().toLowerCase();

  if (!normalizedEmail) {
    return { success: false, error: 'Podaj adres e-mail.' };
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

  if (error) {
    console.error('Blad podczas wysylania kodu OTP:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * KROK 2: Weryfikuje kod OTP z e-maila.
 */
export async function verifyOtpCode(userEmail: string, otpCode: string): Promise<AuthServiceResult> {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const sanitizedToken = otpCode.replace(/\s+/g, '');

  if (!normalizedEmail) {
    return { success: false, error: 'Podaj adres e-mail.' };
  }

  if (!sanitizedToken) {
    return { success: false, error: 'Podaj kod OTP.' };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: sanitizedToken,
    type: 'recovery',
  });

  if (error) {
    console.error('Podano nieprawidlowy lub wygasly kod:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * KROK 3: Ustawia nowe haslo po poprawnej weryfikacji OTP.
 */
export async function setNewPassword(newPassword: string): Promise<AuthServiceResult> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Haslo musi miec co najmniej 6 znakow.' };
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Blad podczas aktualizacji hasla:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

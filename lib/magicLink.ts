import { supabase } from './supabase';

/**
 * Wysyła Magic Link na podany email (z adresu hello@findloove.pl po konfiguracji SMTP)
 * @param userEmail - Adres email użytkownika
 * @param redirectTo - URL przekierowania po kliknięciu (domyślnie: strona główna)
 * @returns Promise z wynikiem operacji
 */
export async function sendMagicLink(userEmail: string, redirectTo?: string) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: userEmail,
      options: {
        emailRedirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.origin : ''),
        shouldCreateUser: true, // Automatycznie tworzy konto jeśli nie istnieje
        data: {
          // Możesz dodać dodatkowe dane użytkownika
          source: 'magic_link'
        }
      },
    });

    if (error) {
      console.error('Błąd wysyłania Magic Link:', error.message);
      return { success: false, error: error.message };
    }

    console.log('Magic Link wysłany z hello@findloove.pl na:', userEmail);
    return { success: true, data };
  } catch (err: any) {
    console.error('Błąd krytyczny:', err);
    return { success: false, error: err?.message || 'Wystąpił nieoczekiwany błąd' };
  }
}

/**
 * Weryfikuje czy użytkownik kliknął w Magic Link i jest zalogowany
 * @returns Promise z informacją o użytkowniku lub null
 */
export async function verifyMagicLink() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Błąd weryfikacji Magic Link:', error.message);
      return null;
    }

    return user;
  } catch (err: any) {
    console.error('Błąd weryfikacji:', err);
    return null;
  }
}

/**
 * Hook do obsługi callback po kliknięciu w Magic Link
 * Sprawdza czy w URL jest hash z tokenami i przetwarza je
 */
export async function handleMagicLinkCallback() {
  if (typeof window === 'undefined') return null;

  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('Błąd ustawiania sesji:', error.message);
      return null;
    }

    // Wyczyść hash z URL
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    return data.user;
  }

  return null;
}

import { supabase } from '../supabase';

function clearSupabaseSessionStorage() {
  if (typeof window === 'undefined') return;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return;

    const projectRef = new URL(url).hostname.split('.')[0];
    if (!projectRef) return;

    window.localStorage.removeItem(`sb-${projectRef}-auth-token`);
    window.localStorage.removeItem(`sb-${projectRef}-auth-token-code-verifier`);
  } catch (error) {
    console.error('Nie udało się wyczyścić storage sesji:', error);
  }
}

export function useLogout() {
  return async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Błąd podczas wylogowania:', error.message);
      }
    } catch (error) {
      console.error('Wylogowanie przerwane wyjątkiem:', error);
    } finally {
      clearSupabaseSessionStorage();
      window.location.assign('/');
    }
  };
}

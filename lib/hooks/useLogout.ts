import { supabase } from '../supabase';

export function useLogout() {
  return async () => {
    await supabase.auth.signOut();
    // Możesz dodać czyszczenie localStorage/cookies jeśli trzeba
    window.location.reload(); // Odśwież stronę po wylogowaniu
  };
}

'use client';

import { supabase } from '@/lib/supabase';

// Fallback demo id when no auth user is available.
const FALLBACK_PROFILE_ID = '00000000-0000-0000-0000-000000000001';

export function useLikes() {
  const likeProfile = async (toProfileId: string): Promise<void> => {
    // Jeśli to mock ID, tylko pokaż powiadomienie bez zapisu
    if (toProfileId.startsWith('mock-')) return;

    const { data } = await supabase.auth.getUser();
    const senderId = data.user?.id || FALLBACK_PROFILE_ID;

    if (senderId === toProfileId) return;

    await supabase.from('likes').upsert({
      from_profile_id: senderId,
      to_profile_id: toProfileId,
    });
  };

  return { likeProfile };
}

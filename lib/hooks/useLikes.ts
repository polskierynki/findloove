'use client';

import { supabase } from '@/lib/supabase';

// ID naszego "zalogowanego" użytkownika (demo - stały UUID)
const MY_PROFILE_ID = '00000000-0000-0000-0000-000000000001';

export function useLikes() {
  const likeProfile = async (toProfileId: string): Promise<void> => {
    // Jeśli to mock ID, tylko pokaż powiadomienie bez zapisu
    if (toProfileId.startsWith('mock-')) return;

    await supabase.from('likes').upsert({
      from_profile_id: MY_PROFILE_ID,
      to_profile_id: toProfileId,
    });
  };

  return { likeProfile };
}

'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Fallback demo id when no auth user is available.
const FALLBACK_PROFILE_ID = '00000000-0000-0000-0000-000000000001';

export function useLikes() {
  const getSenderId = useCallback(async (): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || FALLBACK_PROFILE_ID;
  }, []);

  const likeProfile = useCallback(async (toProfileId: string): Promise<void> => {
    // Jeśli to mock ID, tylko pokaż powiadomienie bez zapisu
    if (toProfileId.startsWith('mock-')) return;

    const senderId = await getSenderId();

    if (senderId === toProfileId) return;

    await supabase.from('likes').upsert({
      from_profile_id: senderId,
      to_profile_id: toProfileId,
    });
  }, [getSenderId]);

  const unlikeProfile = useCallback(async (toProfileId: string): Promise<void> => {
    if (toProfileId.startsWith('mock-')) return;

    const senderId = await getSenderId();

    if (senderId === toProfileId) return;

    await supabase
      .from('likes')
      .delete()
      .eq('from_profile_id', senderId)
      .eq('to_profile_id', toProfileId);
  }, [getSenderId]);

  const hasLikedProfile = useCallback(async (toProfileId: string): Promise<boolean> => {
    if (toProfileId.startsWith('mock-')) return false;

    const senderId = await getSenderId();

    if (senderId === toProfileId) return false;

    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('from_profile_id', senderId)
      .eq('to_profile_id', toProfileId)
      .maybeSingle();

    if (error) {
      console.error('Blad sprawdzania statusu polubienia:', error.message);
      return false;
    }

    return Boolean(data);
  }, [getSenderId]);

  const getLikedProfileIds = useCallback(async (): Promise<string[]> => {
    const senderId = await getSenderId();

    const { data, error } = await supabase
      .from('likes')
      .select('to_profile_id')
      .eq('from_profile_id', senderId);

    if (error) {
      console.error('Blad ladowania ulubionych:', error.message);
      return [];
    }

    return (data || []).map((row) => row.to_profile_id as string);
  }, [getSenderId]);

  return { likeProfile, unlikeProfile, hasLikedProfile, getLikedProfileIds };
}

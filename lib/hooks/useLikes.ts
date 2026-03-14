'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { resolveProfileIdForAuthUser, type AuthProfileUser } from '@/lib/profileAuth';

export function useLikes() {
  const getSenderId = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;

    return resolveProfileIdForAuthUser({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    } as AuthProfileUser);
  }, []);

  const likeProfile = useCallback(async (toProfileId: string): Promise<void> => {
    // Jeśli to mock ID, tylko pokaż powiadomienie bez zapisu
    if (toProfileId.startsWith('mock-')) return;

    const senderId = await getSenderId();
    if (!senderId) return;

    if (senderId === toProfileId) return;

    await supabase.from('likes').upsert({
      from_profile_id: senderId,
      to_profile_id: toProfileId,
    });
  }, [getSenderId]);

  const unlikeProfile = useCallback(async (toProfileId: string): Promise<void> => {
    if (toProfileId.startsWith('mock-')) return;

    const senderId = await getSenderId();
    if (!senderId) return;

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
    if (!senderId) return false;

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
    if (!senderId) return [];

    const { data, error } = await supabase
      .from('likes')
      .select('to_profile_id')
      .eq('from_profile_id', senderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Blad ladowania ulubionych:', error.message);
      return [];
    }

    return (data || []).map((row) => row.to_profile_id as string);
  }, [getSenderId]);

  const getProfileIdsWhoLikedMe = useCallback(async (): Promise<string[]> => {
    const senderId = await getSenderId();
    if (!senderId) return [];

    const { data, error } = await supabase
      .from('likes')
      .select('from_profile_id')
      .eq('to_profile_id', senderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Blad ladowania profili, ktore polubily mnie:', error.message);
      return [];
    }

    return (data || []).map((row) => row.from_profile_id as string);
  }, [getSenderId]);

  return { likeProfile, unlikeProfile, hasLikedProfile, getLikedProfileIds, getProfileIdsWhoLikedMe };
}

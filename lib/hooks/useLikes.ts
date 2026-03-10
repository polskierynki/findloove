'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type AuthLikeUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

async function resolveProfileIdForAuthUser(user: AuthLikeUser): Promise<string | null> {
  const normalizedEmail = user.email?.trim().toLowerCase() || null;

  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!byIdError && byId?.id) {
    return byId.id as string;
  }

  if (normalizedEmail) {
    const { data: byEmail, error: byEmailError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!byEmailError && byEmail?.id) {
      return byEmail.id as string;
    }
  }

  const fallbackName =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
    'Uzytkownik';

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: normalizedEmail,
        name: fallbackName,
        age: 30,
        city: 'Nieznane',
        bio: '',
        interests: [],
        image_url: '',
      },
      { onConflict: 'id' },
    )
    .select('id')
    .maybeSingle();

  if (createError) {
    console.error('Blad mapowania auth->profile dla ulubionych:', createError.message);
    return null;
  }

  return (created?.id as string | undefined) || user.id;
}

export function useLikes() {
  const getSenderId = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;

    return resolveProfileIdForAuthUser({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    });
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
      .eq('from_profile_id', senderId);

    if (error) {
      console.error('Blad ladowania ulubionych:', error.message);
      return [];
    }

    return (data || []).map((row) => row.to_profile_id as string);
  }, [getSenderId]);

  return { likeProfile, unlikeProfile, hasLikedProfile, getLikedProfileIds };
}

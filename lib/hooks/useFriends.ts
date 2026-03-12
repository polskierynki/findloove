'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { resolveProfileIdForAuthUser } from '@/lib/profileAuth';

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined';

export interface Friend {
  id: string;
  name: string;
  age?: number;
  city?: string;
  image_url?: string;
  friendshipId: string;
}

export function useFriends() {
  const getMyProfileId = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return resolveProfileIdForAuthUser({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    });
  }, []);

  /** Wyślij zaproszenie do znajomych */
  const sendFriendRequest = useCallback(async (toProfileId: string): Promise<void> => {
    const myId = await getMyProfileId();
    if (!myId || myId === toProfileId) return;

    await supabase.from('friendships').upsert({
      requester_id: myId,
      addressee_id: toProfileId,
      status: 'pending',
    }, { onConflict: 'requester_id,addressee_id' });
  }, [getMyProfileId]);

  /** Zaakceptuj zaproszenie (jako addressee) */
  const acceptFriendRequest = useCallback(async (friendshipId: string): Promise<void> => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);
  }, []);

  /** Odrzuć / usuń znajomego */
  const removeFriendship = useCallback(async (friendshipId: string): Promise<void> => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
  }, []);

  /** Sprawdź status znajomości z danym profilem */
  const getFriendshipStatus = useCallback(async (toProfileId: string): Promise<{ status: FriendshipStatus; friendshipId: string | null }> => {
    const myId = await getMyProfileId();
    if (!myId || myId === toProfileId) return { status: 'none', friendshipId: null };

    const { data } = await supabase
      .from('friendships')
      .select('id, status, requester_id')
      .or(`and(requester_id.eq.${myId},addressee_id.eq.${toProfileId}),and(requester_id.eq.${toProfileId},addressee_id.eq.${myId})`)
      .maybeSingle();

    if (!data) return { status: 'none', friendshipId: null };

    if (data.status === 'accepted') return { status: 'accepted', friendshipId: data.id };
    if (data.status === 'declined') return { status: 'declined', friendshipId: data.id };
    if (data.status === 'pending') {
      return {
        status: data.requester_id === myId ? 'pending_sent' : 'pending_received',
        friendshipId: data.id,
      };
    }
    return { status: 'none', friendshipId: null };
  }, [getMyProfileId]);

  /** Lista zaakceptowanych znajomych */
  const getMyFriends = useCallback(async (): Promise<Friend[]> => {
    const myId = await getMyProfileId();
    if (!myId) return [];

    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);

    if (!data || data.length === 0) return [];

    const friendIds = data.map((f: any) =>
      f.requester_id === myId ? f.addressee_id : f.requester_id
    );
    const friendshipIdMap = new Map<string, string>(
      data.map((f: any) => [
        f.requester_id === myId ? f.addressee_id : f.requester_id,
        f.id,
      ])
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, age, city, image_url')
      .in('id', friendIds);

    return (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      city: p.city,
      image_url: p.image_url,
      friendshipId: friendshipIdMap.get(p.id) || '',
    }));
  }, [getMyProfileId]);

  /** Oczekujące zaproszenia DO mnie */
  const getPendingRequests = useCallback(async (): Promise<Friend[]> => {
    const myId = await getMyProfileId();
    if (!myId) return [];

    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id')
      .eq('addressee_id', myId)
      .eq('status', 'pending');

    if (!data || data.length === 0) return [];

    const requesterIds = data.map((f: any) => f.requester_id);
    const friendshipIdMap = new Map<string, string>(data.map((f: any) => [f.requester_id, f.id]));

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, age, city, image_url')
      .in('id', requesterIds);

    return (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      city: p.city,
      image_url: p.image_url,
      friendshipId: friendshipIdMap.get(p.id) || '',
    }));
  }, [getMyProfileId]);

  return {
    sendFriendRequest,
    acceptFriendRequest,
    removeFriendship,
    getFriendshipStatus,
    getMyFriends,
    getPendingRequests,
  };
}

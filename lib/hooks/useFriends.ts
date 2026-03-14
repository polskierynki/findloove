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

export type FriendRequestState = 'pending' | 'accepted' | 'declined';

export interface SentFriendRequest extends Friend {
  status: FriendRequestState;
  createdAt?: string;
  updatedAt?: string;
}

type FriendshipAcceptedRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
};

type FriendshipPendingRow = {
  id: string;
  requester_id: string;
};

type FriendshipSentRow = {
  id: string;
  addressee_id: string;
  status: FriendRequestState;
  created_at?: string | null;
  updated_at?: string | null;
};

type FriendProfileRow = {
  id: string;
  name: string;
  age?: number | null;
  city?: string | null;
  image_url?: string | null;
};

function normalizeFriendRequestState(status: string | null | undefined): FriendRequestState {
  if (status === 'accepted' || status === 'declined') return status;
  return 'pending';
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

  /** Odrzuc zaproszenie (jako addressee), zostawiajac status do podgladu po stronie nadawcy */
  const declineFriendRequest = useCallback(async (friendshipId: string): Promise<void> => {
    await supabase
      .from('friendships')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
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

  /** Lista zaakceptowanych znajomych dla dowolnego profilu */
  const getFriendsForProfile = useCallback(async (targetProfileId: string): Promise<Friend[]> => {
    if (!targetProfileId) return [];

    const { data, error } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${targetProfileId},addressee_id.eq.${targetProfileId}`);

    if (error || !data || data.length === 0) return [];

    const friendshipIdMap = new Map<string, string>();

    for (const row of (data as FriendshipAcceptedRow[])) {
      const friendId = row.requester_id === targetProfileId ? row.addressee_id : row.requester_id;
      if (!friendId || friendId === targetProfileId || friendshipIdMap.has(friendId)) continue;
      friendshipIdMap.set(friendId, row.id);
    }

    const friendIds = Array.from(friendshipIdMap.keys());
    if (friendIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, age, city, image_url')
      .in('id', friendIds)
      .neq('is_blocked', true);

    return ((profiles as FriendProfileRow[] | null) || [])
      .map((p) => ({
        id: p.id,
        name: p.name,
        age: p.age ?? undefined,
        city: p.city ?? undefined,
        image_url: p.image_url ?? undefined,
        friendshipId: friendshipIdMap.get(p.id) || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' }));
  }, []);

  /** Lista zaakceptowanych znajomych */
  const getMyFriends = useCallback(async (): Promise<Friend[]> => {
    const myId = await getMyProfileId();
    if (!myId) return [];

    return getFriendsForProfile(myId);
  }, [getFriendsForProfile, getMyProfileId]);

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

    const pendingRows = data as FriendshipPendingRow[];
    const requesterIds = pendingRows.map((f) => f.requester_id);
    const friendshipIdMap = new Map<string, string>(pendingRows.map((f) => [f.requester_id, f.id]));

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, age, city, image_url')
      .in('id', requesterIds)
      .neq('is_blocked', true);

    return ((profiles as FriendProfileRow[] | null) || []).map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age ?? undefined,
      city: p.city ?? undefined,
      image_url: p.image_url ?? undefined,
      friendshipId: friendshipIdMap.get(p.id) || '',
    }));
  }, [getMyProfileId]);

  /** Wyslane zaproszenia ODE mnie, wraz ze statusem */
  const getSentRequests = useCallback(async (): Promise<SentFriendRequest[]> => {
    const myId = await getMyProfileId();
    if (!myId) return [];

    const { data } = await supabase
      .from('friendships')
      .select('id, addressee_id, status, created_at, updated_at')
      .eq('requester_id', myId)
      .in('status', ['pending', 'accepted', 'declined'])
      .order('updated_at', { ascending: false });

    if (!data || data.length === 0) return [];

    const sentRows = (data as FriendshipSentRow[]).filter(
      (row) => row.addressee_id && row.addressee_id !== myId,
    );
    const addresseeIds = sentRows.map((row) => row.addressee_id);
    if (addresseeIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, age, city, image_url')
      .in('id', addresseeIds)
      .neq('is_blocked', true);

    const profileMap = new Map<string, FriendProfileRow>(
      ((profiles as FriendProfileRow[] | null) || []).map((profile) => [profile.id, profile]),
    );

    const result: SentFriendRequest[] = [];

    for (const row of sentRows) {
      const profile = profileMap.get(row.addressee_id);
      if (!profile) continue;

      result.push({
        id: profile.id,
        name: profile.name,
        age: profile.age ?? undefined,
        city: profile.city ?? undefined,
        image_url: profile.image_url ?? undefined,
        friendshipId: row.id,
        status: normalizeFriendRequestState(row.status),
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
      });
    }

    return result;
  }, [getMyProfileId]);

  return {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriendship,
    getFriendshipStatus,
    getFriendsForProfile,
    getMyFriends,
    getPendingRequests,
    getSentRequests,
  };
}

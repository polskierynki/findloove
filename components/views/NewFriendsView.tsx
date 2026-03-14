'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  Heart,
  HeartOff,
  Loader2,
  MapPin,
  MessageCircle,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  useFriends,
  type Friend,
  type FriendRequestState,
  type SentFriendRequest,
} from '@/lib/hooks/useFriends';
import { useLikes } from '@/lib/hooks/useLikes';
import { navigateToUserChat } from '@/lib/chatNavigation';

type FriendsTab = 'friends' | 'requests' | 'favorites';

type FavoriteProfile = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  image_url: string | null;
};

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&q=70';

function normalizeTab(value: string | null): FriendsTab {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'requests' || normalized === 'zaproszenia') return 'requests';
  if (
    normalized === 'favorites' ||
    normalized === 'ulubione' ||
    normalized === 'liked' ||
    normalized === 'likes'
  ) {
    return 'favorites';
  }
  return 'friends';
}

function sortFriends(items: Friend[]): Friend[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' }));
}

const SENT_REQUEST_STATUS_LABEL: Record<FriendRequestState, string> = {
  pending: 'Czeka',
  accepted: 'Zaakceptowane',
  declined: 'Odrzucone',
};

const SENT_REQUEST_STATUS_CLASS: Record<FriendRequestState, string> = {
  pending: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
  accepted: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100',
  declined: 'border-rose-500/40 bg-rose-500/15 text-rose-100',
};

const SENT_STATUS_ORDER: Record<FriendRequestState, number> = {
  pending: 0,
  accepted: 1,
  declined: 2,
};

function sortSentRequests(items: SentFriendRequest[]): SentFriendRequest[] {
  return [...items].sort((a, b) => {
    const statusDiff = SENT_STATUS_ORDER[a.status] - SENT_STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    const aTs = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTs = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTs - aTs;
  });
}

function isFavoriteProfile(value: FavoriteProfile | undefined): value is FavoriteProfile {
  return Boolean(value);
}

export default function NewFriendsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    getMyFriends,
    getPendingRequests,
    getSentRequests,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriendship,
  } = useFriends();
  const { getLikedProfileIds, getProfileIdsWhoLikedMe, unlikeProfile } = useLikes();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<SentFriendRequest[]>([]);
  const [favoriteProfiles, setFavoriteProfiles] = useState<FavoriteProfile[]>([]);
  const [likedMeProfiles, setLikedMeProfiles] = useState<FavoriteProfile[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  const activeTab = useMemo(() => normalizeTab(searchParams.get('tab')), [searchParams]);

  const setActiveTab = useCallback(
    (tab: FriendsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'friends') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `/friends?${nextQuery}` : '/friends', { scroll: false });
    },
    [router, searchParams],
  );

  const loadSocialData = useCallback(async () => {
    setLoadingSocial(true);

    try {
      const [friendsData, pendingData, sentData] = await Promise.all([
        getMyFriends(),
        getPendingRequests(),
        getSentRequests(),
      ]);
      setFriends(sortFriends(friendsData));
      setPendingRequests(sortFriends(pendingData));
      setSentRequests(sortSentRequests(sentData));
      setSocialError(null);
    } catch (error) {
      console.error('Error loading friends data:', error);
      setSocialError('Nie udalo sie zaladowac listy znajomych. Sprobuj ponownie.');
    } finally {
      setLoadingSocial(false);
    }
  }, [getMyFriends, getPendingRequests, getSentRequests]);

  const loadFavorites = useCallback(async () => {
    setLoadingFavorites(true);

    try {
      const [likedProfileIds, likedMeIds] = await Promise.all([
        getLikedProfileIds(),
        getProfileIdsWhoLikedMe(),
      ]);

      if (likedProfileIds.length === 0 && likedMeIds.length === 0) {
        setFavoriteProfiles([]);
        setLikedMeProfiles([]);
        setFavoritesError(null);
        return;
      }

      const uniqueProfileIds = Array.from(new Set([...likedProfileIds, ...likedMeIds]));

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, age, city, image_url')
        .in('id', uniqueProfileIds)
        .neq('is_blocked', true);

      if (error) throw error;

      const profileMap = new Map(
        (((data as FavoriteProfile[] | null) ?? []).map((profile) => [profile.id, profile])),
      );

      const likedByMeProfiles = likedProfileIds
        .map((profileId) => profileMap.get(profileId))
        .filter(isFavoriteProfile);

      const likedMeOrderedProfiles = likedMeIds
        .map((profileId) => profileMap.get(profileId))
        .filter(isFavoriteProfile);

      setFavoriteProfiles(likedByMeProfiles);
      setLikedMeProfiles(likedMeOrderedProfiles);
      setFavoritesError(null);
    } catch (error) {
      console.error('Error loading favorite profiles:', error);
      setFavoritesError('Nie udalo sie zaladowac ulubionych. Sprobuj ponownie.');
    } finally {
      setLoadingFavorites(false);
    }
  }, [getLikedProfileIds, getProfileIdsWhoLikedMe]);

  const activeError = activeTab === 'favorites' ? favoritesError : socialError;

  useEffect(() => {
    void Promise.all([loadSocialData(), loadFavorites()]);
  }, [loadFavorites, loadSocialData]);

  const handleAcceptRequest = useCallback(
    async (request: Friend) => {
      setBusyActionKey(`accept-${request.friendshipId}`);

      try {
        await acceptFriendRequest(request.friendshipId);
        setPendingRequests((prev) => prev.filter((item) => item.id !== request.id));
        setFriends((prev) => sortFriends([...prev, request]));
      } catch (error) {
        console.error('Error accepting friend request:', error);
      } finally {
        setBusyActionKey(null);
      }
    },
    [acceptFriendRequest],
  );

  const handleRejectRequest = useCallback(
    async (request: Friend) => {
      setBusyActionKey(`reject-${request.friendshipId}`);

      try {
        await declineFriendRequest(request.friendshipId);
        setPendingRequests((prev) => prev.filter((item) => item.id !== request.id));
      } catch (error) {
        console.error('Error rejecting friend request:', error);
      } finally {
        setBusyActionKey(null);
      }
    },
    [declineFriendRequest],
  );

  const handleRemoveFriend = useCallback(
    async (friend: Friend) => {
      setBusyActionKey(`remove-${friend.friendshipId}`);

      try {
        await removeFriendship(friend.friendshipId);
        setFriends((prev) => prev.filter((item) => item.id !== friend.id));
      } catch (error) {
        console.error('Error removing friend:', error);
      } finally {
        setBusyActionKey(null);
      }
    },
    [removeFriendship],
  );

  const handleRemoveFavorite = useCallback(
    async (profileId: string) => {
      setBusyActionKey(`favorite-${profileId}`);

      try {
        await unlikeProfile(profileId);
        setFavoriteProfiles((prev) => prev.filter((item) => item.id !== profileId));
      } catch (error) {
        console.error('Error removing favorite profile:', error);
      } finally {
        setBusyActionKey(null);
      }
    },
    [unlikeProfile],
  );

  const handleRemoveSentRequest = useCallback(
    async (request: SentFriendRequest) => {
      setBusyActionKey(`sent-${request.friendshipId}`);

      try {
        await removeFriendship(request.friendshipId);
        setSentRequests((prev) => prev.filter((item) => item.friendshipId !== request.friendshipId));
      } catch (error) {
        console.error('Error removing sent request:', error);
      } finally {
        setBusyActionKey(null);
      }
    },
    [removeFriendship],
  );

  const requestsCount = pendingRequests.length + sentRequests.length;
  const favoritesCount = favoriteProfiles.length + likedMeProfiles.length;

  const stats: Array<{ id: FriendsTab; label: string; value: number; hint: string; icon: ReactNode }> = [
    {
      id: 'friends',
      label: 'Znajomi',
      value: friends.length,
      hint: 'Zaakceptowane relacje',
      icon: <Users size={16} />,
    },
    {
      id: 'requests',
      label: 'Zaproszenia',
      value: requestsCount,
      hint: 'Wyslane + do Ciebie',
      icon: <UserPlus size={16} />,
    },
    {
      id: 'favorites',
      label: 'Ulubione',
      value: favoritesCount,
      hint: 'Ty polubiles + Ciebie polubili',
      icon: <Heart size={16} />,
    },
  ];

  return (
    <div className="relative z-10 pt-28 pb-24 px-6 lg:px-12 max-w-[2200px] mx-auto flex flex-col gap-8">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-light mb-2">
            Centrum <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300 font-medium">znajomych</span>
          </h1>
          <p className="text-cyan-300/75 text-base md:text-lg font-light">
            Zarzadzaj kontaktami, zaproszeniami i ulubionymi profilami w jednym miejscu.
          </p>
        </div>

        <button
          onClick={() => router.push('/discover')}
          className="self-start md:self-auto rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-200 hover:bg-cyan-500/20 transition-colors"
        >
          Szukaj nowych osob
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.id}
            onClick={() => setActiveTab(stat.id)}
            className={`glass rounded-2xl border p-4 flex items-center justify-between text-left transition-colors ${
              activeTab === stat.id
                ? 'border-cyan-400/45 bg-cyan-500/10'
                : 'border-white/10 hover:border-cyan-400/30 hover:bg-cyan-500/5'
            }`}
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-cyan-300/70">{stat.label}</p>
              <p className="text-2xl font-semibold text-white mt-1">{stat.value}</p>
              <p className="text-xs text-cyan-200/60 mt-1">{stat.hint}</p>
            </div>
            <div className="w-9 h-9 rounded-full border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
              {stat.icon}
            </div>
          </button>
        ))}
      </section>

      <section className="glass rounded-2xl border border-white/10 p-2 sm:p-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200'
                : 'text-white/65 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            Znajomi ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'requests'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                : 'text-white/65 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            Zaproszenia ({requestsCount})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200'
                : 'text-white/65 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            Ulubione ({favoritesCount})
          </button>
        </div>
      </section>

      {activeError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {activeError}
        </div>
      )}

      {activeTab === 'friends' && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {loadingSocial &&
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`friend-loading-${idx}`} className="glass rounded-2xl border border-white/10 p-4 animate-pulse">
                <div className="h-40 rounded-xl bg-white/10 mb-4" />
                <div className="h-4 bg-white/10 rounded mb-2" />
                <div className="h-3 bg-white/10 rounded w-2/3 mb-4" />
                <div className="h-9 bg-white/10 rounded" />
              </div>
            ))}

          {!loadingSocial && friends.length === 0 && (
            <div className="col-span-full glass rounded-2xl border border-cyan-500/20 p-10 text-center">
              <Users size={42} className="mx-auto text-cyan-300/40 mb-3" />
              <h2 className="text-xl text-white mb-2">Jeszcze nie masz znajomych</h2>
              <p className="text-cyan-200/70 mb-5">Wejdz na profil i wyslij zaproszenie, aby budowac swoja siec kontaktow.</p>
              <button
                onClick={() => router.push('/discover')}
                className="rounded-xl bg-cyan-500/20 border border-cyan-500/40 px-5 py-2.5 text-cyan-100 hover:bg-cyan-500/30 transition-colors"
              >
                Odkrywaj profile
              </button>
            </div>
          )}

          {!loadingSocial &&
            friends.map((friend) => {
              const isRemoving = busyActionKey === `remove-${friend.friendshipId}`;

              return (
                <div key={friend.id} className="glass rounded-2xl border border-white/10 overflow-hidden">
                  <button
                    onClick={() => router.push(`/profile/${friend.id}`)}
                    className="w-full text-left"
                  >
                    <img
                      src={friend.image_url || FALLBACK_AVATAR}
                      alt={friend.name}
                      className="w-full h-48 object-cover"
                    />
                  </button>

                  <div className="p-4">
                    <button
                      onClick={() => router.push(`/profile/${friend.id}`)}
                      className="text-lg text-white font-medium hover:text-cyan-200 transition-colors"
                    >
                      {friend.name}
                      {friend.age ? `, ${friend.age}` : ''}
                    </button>
                    {friend.city && (
                      <p className="text-sm text-cyan-300/70 mt-1 flex items-center gap-1.5">
                        <MapPin size={14} />
                        {friend.city}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => navigateToUserChat(router, friend.id)}
                        className="rounded-lg border border-cyan-500/35 bg-cyan-500/15 text-cyan-100 py-2 text-sm hover:bg-cyan-500/25 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle size={15} />
                        Napisz
                      </button>

                      <button
                        onClick={() => void handleRemoveFriend(friend)}
                        disabled={isRemoving}
                        className="rounded-lg border border-red-500/35 bg-red-500/10 text-red-200 py-2 text-sm hover:bg-red-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {isRemoving ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />}
                        Usun
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </section>
      )}

      {activeTab === 'requests' && (
        <section className="space-y-6">
          {loadingSocial && (
            <div className="glass rounded-2xl border border-white/10 p-6 text-cyan-200/70 flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" /> Ladowanie zaproszen...
            </div>
          )}

          {!loadingSocial && (
            <>
              <div className="glass rounded-2xl border border-amber-500/20 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg text-white font-medium">Wyslane zaproszenia</h2>
                    <p className="text-sm text-amber-100/75">Status: czeka, zaakceptowane, odrzucone.</p>
                  </div>
                  <div className="rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-sm text-amber-100">
                    {sentRequests.length}
                  </div>
                </div>

                {sentRequests.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                    <p className="text-amber-100/75">Nie masz jeszcze wyslanych zaproszen.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map((request) => {
                      const isRemovingSent = busyActionKey === `sent-${request.friendshipId}`;

                      return (
                        <div
                          key={request.friendshipId}
                          className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col md:flex-row md:items-center gap-4"
                        >
                          <img
                            src={request.image_url || FALLBACK_AVATAR}
                            alt={request.name}
                            className="w-16 h-16 rounded-full object-cover border border-white/20"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => router.push(`/profile/${request.id}`)}
                                className="text-white text-lg font-medium hover:text-cyan-200 transition-colors"
                              >
                                {request.name}
                                {request.age ? `, ${request.age}` : ''}
                              </button>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                                  SENT_REQUEST_STATUS_CLASS[request.status]
                                }`}
                              >
                                {SENT_REQUEST_STATUS_LABEL[request.status]}
                              </span>
                            </div>
                            {request.city && (
                              <p className="text-sm text-cyan-300/70 mt-1 flex items-center gap-1.5">
                                <MapPin size={14} />
                                {request.city}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <button
                              onClick={() => navigateToUserChat(router, request.id)}
                              className="rounded-lg border border-cyan-500/35 bg-cyan-500/15 px-4 py-2 text-cyan-100 hover:bg-cyan-500/25 transition-colors flex items-center gap-1.5"
                            >
                              <MessageCircle size={15} />
                              Napisz
                            </button>

                            {request.status === 'accepted' ? (
                              <button
                                onClick={() => setActiveTab('friends')}
                                className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-emerald-100 hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5"
                              >
                                <Users size={15} />
                                Znajomi
                              </button>
                            ) : (
                              <button
                                onClick={() => void handleRemoveSentRequest(request)}
                                disabled={isRemovingSent}
                                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white/80 hover:text-red-200 hover:border-red-500/35 hover:bg-red-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                {isRemovingSent ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                                {request.status === 'pending' ? 'Cofnij' : 'Usun wpis'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="glass rounded-2xl border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg text-white font-medium">Zaproszenia do Ciebie</h2>
                    <p className="text-sm text-cyan-200/70">Akceptuj lub odrzucaj nowe zaproszenia.</p>
                  </div>
                  <div className="rounded-full border border-cyan-500/35 bg-cyan-500/15 px-3 py-1 text-sm text-cyan-100">
                    {pendingRequests.length}
                  </div>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6 text-center">
                    <p className="text-cyan-100/75">Brak oczekujacych zaproszen do Ciebie.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => {
                      const isAccepting = busyActionKey === `accept-${request.friendshipId}`;
                      const isRejecting = busyActionKey === `reject-${request.friendshipId}`;

                      return (
                        <div
                          key={request.id}
                          className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                          <img
                            src={request.image_url || FALLBACK_AVATAR}
                            alt={request.name}
                            className="w-16 h-16 rounded-full object-cover border border-amber-500/40"
                          />

                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => router.push(`/profile/${request.id}`)}
                              className="text-white text-lg font-medium hover:text-cyan-200 transition-colors"
                            >
                              {request.name}
                              {request.age ? `, ${request.age}` : ''}
                            </button>
                            {request.city && (
                              <p className="text-sm text-cyan-300/70 mt-1 flex items-center gap-1.5">
                                <MapPin size={14} />
                                {request.city}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 sm:justify-end">
                            <button
                              onClick={() => void handleAcceptRequest(request)}
                              disabled={isAccepting || isRejecting}
                              className="rounded-lg border border-green-500/35 bg-green-500/15 px-4 py-2 text-green-100 hover:bg-green-500/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                              {isAccepting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                              Akceptuj
                            </button>
                            <button
                              onClick={() => void handleRejectRequest(request)}
                              disabled={isAccepting || isRejecting}
                              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white/80 hover:text-red-200 hover:border-red-500/35 hover:bg-red-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                              {isRejecting ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                              Odrzuc
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'favorites' && (
        <section className="space-y-6">
          {loadingFavorites &&
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`favorite-loading-${idx}`} className="glass rounded-2xl border border-white/10 p-4 animate-pulse">
                <div className="h-40 rounded-xl bg-white/10 mb-4" />
                <div className="h-4 bg-white/10 rounded mb-2" />
                <div className="h-3 bg-white/10 rounded w-2/3 mb-4" />
                <div className="h-9 bg-white/10 rounded" />
              </div>
            ))}

          {!loadingFavorites && (
            <>
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg text-white font-medium">Polubione przeze mnie</h2>
                    <p className="text-sm text-fuchsia-100/70">Profile, ktorym przypiales serduszko.</p>
                  </div>
                  <div className="rounded-full border border-fuchsia-500/35 bg-fuchsia-500/15 px-3 py-1 text-sm text-fuchsia-100">
                    {favoriteProfiles.length}
                  </div>
                </div>

                {favoriteProfiles.length === 0 ? (
                  <div className="glass rounded-2xl border border-fuchsia-500/20 p-10 text-center">
                    <HeartOff size={42} className="mx-auto text-fuchsia-300/40 mb-3" />
                    <h2 className="text-xl text-white mb-2">Brak ulubionych profili</h2>
                    <p className="text-fuchsia-100/70 mb-5">Dodawaj profile do ulubionych i wracaj do nich tutaj.</p>
                    <button
                      onClick={() => router.push('/discover')}
                      className="rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 px-5 py-2.5 text-fuchsia-100 hover:bg-fuchsia-500/30 transition-colors"
                    >
                      Znajdz nowe osoby
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {favoriteProfiles.map((profile) => {
                      const isRemoving = busyActionKey === `favorite-${profile.id}`;

                      return (
                        <div key={profile.id} className="glass rounded-2xl border border-white/10 overflow-hidden">
                          <button
                            onClick={() => router.push(`/profile/${profile.id}`)}
                            className="w-full text-left"
                          >
                            <img
                              src={profile.image_url || FALLBACK_AVATAR}
                              alt={profile.name}
                              className="w-full h-48 object-cover"
                            />
                          </button>

                          <div className="p-4">
                            <button
                              onClick={() => router.push(`/profile/${profile.id}`)}
                              className="text-lg text-white font-medium hover:text-fuchsia-200 transition-colors"
                            >
                              {profile.name}
                              {profile.age ? `, ${profile.age}` : ''}
                            </button>
                            {profile.city && (
                              <p className="text-sm text-cyan-300/70 mt-1 flex items-center gap-1.5">
                                <MapPin size={14} />
                                {profile.city}
                              </p>
                            )}

                            <div className="grid grid-cols-2 gap-2 mt-4">
                              <button
                                onClick={() => navigateToUserChat(router, profile.id)}
                                className="rounded-lg border border-cyan-500/35 bg-cyan-500/15 text-cyan-100 py-2 text-sm hover:bg-cyan-500/25 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <MessageCircle size={15} />
                                Napisz
                              </button>
                              <button
                                onClick={() => void handleRemoveFavorite(profile.id)}
                                disabled={isRemoving}
                                className="rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/15 text-fuchsia-100 py-2 text-sm hover:bg-fuchsia-500/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                              >
                                {isRemoving ? <Loader2 size={15} className="animate-spin" /> : <Heart size={15} />}
                                Usun
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg text-white font-medium">Kto polubil mnie</h2>
                    <p className="text-sm text-rose-100/70">Osoby, ktore przypiely Ci serduszko.</p>
                  </div>
                  <div className="rounded-full border border-rose-500/35 bg-rose-500/15 px-3 py-1 text-sm text-rose-100">
                    {likedMeProfiles.length}
                  </div>
                </div>

                {likedMeProfiles.length === 0 ? (
                  <div className="glass rounded-2xl border border-rose-500/20 p-10 text-center">
                    <Heart size={42} className="mx-auto text-rose-300/40 mb-3" />
                    <h2 className="text-xl text-white mb-2">Nikt jeszcze Cie nie polubil</h2>
                    <p className="text-rose-100/70">Gdy ktos polubi Twoj profil, zobaczysz to tutaj.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {likedMeProfiles.map((profile) => (
                      <div key={`liked-me-${profile.id}`} className="glass rounded-2xl border border-white/10 overflow-hidden">
                        <button
                          onClick={() => router.push(`/profile/${profile.id}`)}
                          className="w-full text-left"
                        >
                          <img
                            src={profile.image_url || FALLBACK_AVATAR}
                            alt={profile.name}
                            className="w-full h-48 object-cover"
                          />
                        </button>

                        <div className="p-4">
                          <button
                            onClick={() => router.push(`/profile/${profile.id}`)}
                            className="text-lg text-white font-medium hover:text-rose-200 transition-colors"
                          >
                            {profile.name}
                            {profile.age ? `, ${profile.age}` : ''}
                          </button>
                          {profile.city && (
                            <p className="text-sm text-cyan-300/70 mt-1 flex items-center gap-1.5">
                              <MapPin size={14} />
                              {profile.city}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <button
                              onClick={() => navigateToUserChat(router, profile.id)}
                              className="rounded-lg border border-cyan-500/35 bg-cyan-500/15 text-cyan-100 py-2 text-sm hover:bg-cyan-500/25 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <MessageCircle size={15} />
                              Napisz
                            </button>
                            <button
                              onClick={() => router.push(`/profile/${profile.id}`)}
                              className="rounded-lg border border-rose-500/35 bg-rose-500/15 text-rose-100 py-2 text-sm hover:bg-rose-500/25 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Heart size={15} />
                              Zobacz profil
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

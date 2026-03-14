'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useFriends, type Friend } from '@/lib/hooks/useFriends';
import { useLikes } from '@/lib/hooks/useLikes';

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

export default function NewFriendsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getMyFriends, getPendingRequests, acceptFriendRequest, removeFriendship } = useFriends();
  const { getLikedProfileIds, unlikeProfile } = useLikes();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [favoriteProfiles, setFavoriteProfiles] = useState<FavoriteProfile[]>([]);
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
      const [friendsData, pendingData] = await Promise.all([getMyFriends(), getPendingRequests()]);
      setFriends(sortFriends(friendsData));
      setPendingRequests(sortFriends(pendingData));
      setSocialError(null);
    } catch (error) {
      console.error('Error loading friends data:', error);
      setSocialError('Nie udalo sie zaladowac listy znajomych. Sprobuj ponownie.');
    } finally {
      setLoadingSocial(false);
    }
  }, [getMyFriends, getPendingRequests]);

  const loadFavorites = useCallback(async () => {
    setLoadingFavorites(true);

    try {
      const likedProfileIds = await getLikedProfileIds();
      if (likedProfileIds.length === 0) {
        setFavoriteProfiles([]);
        setFavoritesError(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, age, city, image_url')
        .in('id', likedProfileIds)
        .neq('is_blocked', true);

      if (error) throw error;

      const orderMap = new Map(likedProfileIds.map((id, index) => [id, index]));
      const orderedProfiles = ((data as FavoriteProfile[] | null) ?? []).sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );

      setFavoriteProfiles(orderedProfiles);
      setFavoritesError(null);
    } catch (error) {
      console.error('Error loading favorite profiles:', error);
      setFavoritesError('Nie udalo sie zaladowac ulubionych. Sprobuj ponownie.');
    } finally {
      setLoadingFavorites(false);
    }
  }, [getLikedProfileIds]);

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
        await removeFriendship(request.friendshipId);
        setPendingRequests((prev) => prev.filter((item) => item.id !== request.id));
      } catch (error) {
        console.error('Error rejecting friend request:', error);
      } finally {
        setBusyActionKey(null);
      }
    },
    [removeFriendship],
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

  const stats = [
    { id: 'friends', label: 'Znajomi', value: friends.length, icon: <Users size={16} /> },
    { id: 'requests', label: 'Zaproszenia', value: pendingRequests.length, icon: <UserPlus size={16} /> },
    { id: 'favorites', label: 'Ulubione', value: favoriteProfiles.length, icon: <Heart size={16} /> },
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
          <div key={stat.id} className="glass rounded-2xl border border-white/10 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-cyan-300/70">{stat.label}</p>
              <p className="text-2xl font-semibold text-white mt-1">{stat.value}</p>
            </div>
            <div className="w-9 h-9 rounded-full border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
              {stat.icon}
            </div>
          </div>
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
            Zaproszenia ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200'
                : 'text-white/65 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            Ulubione ({favoriteProfiles.length})
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
                        onClick={() => router.push(`/messages?user=${encodeURIComponent(friend.id)}`)}
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
        <section className="space-y-4">
          {loadingSocial && (
            <div className="glass rounded-2xl border border-white/10 p-6 text-cyan-200/70 flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" /> Ladowanie zaproszen...
            </div>
          )}

          {!loadingSocial && pendingRequests.length === 0 && (
            <div className="glass rounded-2xl border border-amber-500/20 p-10 text-center">
              <UserPlus size={40} className="mx-auto text-amber-300/40 mb-3" />
              <h2 className="text-xl text-white mb-2">Brak oczekujacych zaproszen</h2>
              <p className="text-amber-100/70">Nowe zaproszenia do znajomych pojawia sie tutaj.</p>
            </div>
          )}

          {!loadingSocial &&
            pendingRequests.map((request) => {
              const isAccepting = busyActionKey === `accept-${request.friendshipId}`;
              const isRejecting = busyActionKey === `reject-${request.friendshipId}`;

              return (
                <div
                  key={request.id}
                  className="glass rounded-2xl border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
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
        </section>
      )}

      {activeTab === 'favorites' && (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {loadingFavorites &&
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`favorite-loading-${idx}`} className="glass rounded-2xl border border-white/10 p-4 animate-pulse">
                <div className="h-40 rounded-xl bg-white/10 mb-4" />
                <div className="h-4 bg-white/10 rounded mb-2" />
                <div className="h-3 bg-white/10 rounded w-2/3 mb-4" />
                <div className="h-9 bg-white/10 rounded" />
              </div>
            ))}

          {!loadingFavorites && favoriteProfiles.length === 0 && (
            <div className="col-span-full glass rounded-2xl border border-fuchsia-500/20 p-10 text-center">
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
          )}

          {!loadingFavorites &&
            favoriteProfiles.map((profile) => {
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
                        onClick={() => router.push(`/messages?user=${encodeURIComponent(profile.id)}`)}
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
        </section>
      )}
    </div>
  );
}

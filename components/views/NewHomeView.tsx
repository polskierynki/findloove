'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ChatCircle, Sparkle, MapPin, Lightning, SealCheck } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { resolveProfileIdForAuthUser } from '@/lib/profileAuth';
import { Profile, SupabaseProfile, filterNonAdminProfiles, getLookingFor, mapSupabaseProfile } from '@/lib/types';
import { MatchCursor, fetchRankedProfilesPage, isMissingMatchingRpc } from '@/lib/matching';
import { LOOKING_FOR_OPTIONS } from './constants/profileFormOptions';
import { useLikes } from '@/lib/hooks/useLikes';

const HIDDEN_ADMIN_EMAILS = new Set([
  'lio1985lodz@gmail.com',
]);

function isHiddenAdminProfile(profile: { role?: string | null; email?: string | null }): boolean {
  const normalizedRole = (profile.role || '').trim().toLowerCase();
  const normalizedEmail = (profile.email || '').trim().toLowerCase();

  return (
    normalizedRole === 'admin' ||
    normalizedRole === 'super_admin' ||
    HIDDEN_ADMIN_EMAILS.has(normalizedEmail)
  );
}

type DiscoveryMode = 'recommended' | 'nearby' | 'active';

type RankedProfile = {
  profile: Profile;
  recommendedScore: number;
  matchScore: number;
  sharedInterests: number;
  isNearby: boolean;
  activityTs: number;
  sortValue?: number;
};

type HeartBurstParticle = {
  x: number;
  y: number;
  delayMs: number;
  sizePx: number;
};

type PopularityMetrics = {
  score: number;
  likesReceived: number;
  acceptedFriendships: number;
  isPopular: boolean;
};

type LikePopularityRow = {
  to_profile_id: string;
};

type FriendshipRequesterPopularityRow = {
  requester_id: string;
};

type FriendshipAddresseePopularityRow = {
  addressee_id: string;
};

const HEART_BURST_PARTICLES: HeartBurstParticle[] = [
  { x: 0, y: -26, delayMs: 0, sizePx: 9 },
  { x: 16, y: -16, delayMs: 24, sizePx: 10 },
  { x: 22, y: 0, delayMs: 48, sizePx: 9 },
  { x: 14, y: 14, delayMs: 72, sizePx: 8 },
  { x: 0, y: 20, delayMs: 36, sizePx: 8 },
  { x: -14, y: 14, delayMs: 62, sizePx: 9 },
  { x: -22, y: 0, delayMs: 46, sizePx: 9 },
  { x: -16, y: -16, delayMs: 20, sizePx: 10 },
];

const POPULARITY_WINDOW_DAYS = 45;
const POPULARITY_SCORE_THRESHOLD = 70;
const POPULARITY_MIN_LIKES = 5;
const POPULARITY_MIN_ACCEPTED_FRIENDSHIPS = 2;

function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function toTimestamp(value?: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computePopularityScore(params: {
  likesReceived: number;
  acceptedFriendships: number;
  activityTs: number;
  isVerified: boolean;
}): number {
  const likesScore = Math.min(50, params.likesReceived * 8);
  const friendshipsScore = Math.min(40, params.acceptedFriendships * 12);

  let activityScore = 0;
  if (params.activityTs > 0) {
    const daysAgo = (Date.now() - params.activityTs) / 86400000;
    if (daysAgo <= 3) {
      activityScore = 12;
    } else if (daysAgo <= 10) {
      activityScore = 6;
    }
  }

  const verifiedScore = params.isVerified ? 4 : 0;

  return clamp(Math.round(likesScore + friendshipsScore + activityScore + verifiedScore), 0, 100);
}

function getProfileLookingFor(profile: Profile): string | null {
  const explicit = normalizeText(profile.details?.looking_for);
  if (explicit) return explicit;

  const inferred = getLookingFor(profile.status || '');
  return inferred ? normalizeText(inferred) : null;
}

function isAgeWithinRange(age: number, min?: number, max?: number): boolean {
  if (typeof min === 'number' && age < min) return false;
  if (typeof max === 'number' && age > max) return false;
  return true;
}

function getActivityBonus(activityTs: number): number {
  if (!activityTs) return 0;
  const hoursAgo = (Date.now() - activityTs) / 3600000;
  if (hoursAgo <= 2) return 12;
  if (hoursAgo <= 24) return 8;
  if (hoursAgo <= 72) return 5;
  if (hoursAgo <= 168) return 2;
  return 0;
}

function rankProfile(currentProfile: Profile | null, candidate: Profile): RankedProfile {
  const activityTs = toTimestamp(candidate.lastActive || candidate.createdAt);

  if (!currentProfile) {
    const baseScore = getActivityBonus(activityTs) + (candidate.isVerified ? 4 : 0);
    const matchScore = clamp(60 + baseScore, 55, 90);

    return {
      profile: candidate,
      recommendedScore: baseScore,
      matchScore,
      sharedInterests: 0,
      isNearby: false,
      activityTs,
    };
  }

  const myInterests = new Set((currentProfile.interests || []).map((interest) => normalizeText(interest)));
  const candidateInterests = (candidate.interests || []).map((interest) => normalizeText(interest));
  const sharedInterests = candidateInterests.filter((interest) => myInterests.has(interest)).length;

  const isNearby = normalizeText(currentProfile.city) !== ''
    && normalizeText(candidate.city) === normalizeText(currentProfile.city);

  const myLookingFor = getProfileLookingFor(currentProfile);
  const candidateLookingFor = getProfileLookingFor(candidate);
  const lookingForMatch = Boolean(myLookingFor && candidateLookingFor && myLookingFor === candidateLookingFor);

  const ageCompatibility = isAgeWithinRange(candidate.age, currentProfile.seeking_age_min, currentProfile.seeking_age_max)
    && isAgeWithinRange(currentProfile.age, candidate.seeking_age_min, candidate.seeking_age_max);

  const genderCompatibility =
    (!currentProfile.seeking_gender || !candidate.gender || currentProfile.seeking_gender === candidate.gender)
    && (!candidate.seeking_gender || !currentProfile.gender || candidate.seeking_gender === currentProfile.gender);

  const activityBonus = getActivityBonus(activityTs);

  const recommendedScore =
    sharedInterests * 18
    + (isNearby ? 14 : 0)
    + (lookingForMatch ? 16 : 0)
    + (ageCompatibility ? 10 : 0)
    + (genderCompatibility ? 6 : -8)
    + (candidate.isVerified ? 4 : 0)
    + activityBonus;

  const matchScore = clamp(
    50
      + sharedInterests * 11
      + (isNearby ? 8 : 0)
      + (lookingForMatch ? 9 : 0)
      + (ageCompatibility ? 6 : 0)
      + Math.min(10, activityBonus)
      + (genderCompatibility ? 4 : -6),
    52,
    99,
  );

  return {
    profile: candidate,
    recommendedScore,
    matchScore,
    sharedInterests,
    isNearby,
    activityTs,
  };
}

export default function NewHomeView() {
  const router = useRouter();
  const [rankedProfiles, setRankedProfiles] = useState<RankedProfile[]>([]);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [popularityByProfileId, setPopularityByProfileId] = useState<Record<string, PopularityMetrics>>({});
  const [likeBurstTicks, setLikeBurstTicks] = useState<Record<string, number>>({});
  const [likePopTicks, setLikePopTicks] = useState<Record<string, number>>({});
  const [burstingLikeIds, setBurstingLikeIds] = useState<Set<string>>(new Set());
  const [poppingLikeIds, setPoppingLikeIds] = useState<Set<string>>(new Set());
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>('recommended');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<MatchCursor | null>(null);
  const [rpcUnavailable, setRpcUnavailable] = useState(false);
  const [viewerResolved, setViewerResolved] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const likeBurstTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const likePopTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const { likeProfile, unlikeProfile, getLikedProfileIds } = useLikes();

  const triggerLikeFx = useCallback((profileId: string) => {
    setLikeBurstTicks((prev) => ({
      ...prev,
      [profileId]: (prev[profileId] ?? 0) + 1,
    }));
    setLikePopTicks((prev) => ({
      ...prev,
      [profileId]: (prev[profileId] ?? 0) + 1,
    }));

    setBurstingLikeIds((prev) => {
      const next = new Set(prev);
      next.add(profileId);
      return next;
    });
    setPoppingLikeIds((prev) => {
      const next = new Set(prev);
      next.add(profileId);
      return next;
    });

    const existingBurstTimeout = likeBurstTimeoutsRef.current.get(profileId);
    if (existingBurstTimeout) {
      clearTimeout(existingBurstTimeout);
    }

    const existingPopTimeout = likePopTimeoutsRef.current.get(profileId);
    if (existingPopTimeout) {
      clearTimeout(existingPopTimeout);
    }

    likeBurstTimeoutsRef.current.set(
      profileId,
      setTimeout(() => {
        setBurstingLikeIds((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
        likeBurstTimeoutsRef.current.delete(profileId);
      }, 700),
    );

    likePopTimeoutsRef.current.set(
      profileId,
      setTimeout(() => {
        setPoppingLikeIds((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
        likePopTimeoutsRef.current.delete(profileId);
      }, 280),
    );
  }, []);

  useEffect(() => {
    return () => {
      likeBurstTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      likeBurstTimeoutsRef.current.clear();
      likePopTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      likePopTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const profileIds = Array.from(new Set(rankedProfiles.map((item) => item.profile.id).filter(Boolean)));
    if (profileIds.length === 0) {
      setPopularityByProfileId({});
      return;
    }

    const loadPopularitySignals = async () => {
      const windowStartIso = new Date(Date.now() - POPULARITY_WINDOW_DAYS * 86400000).toISOString();

      const [likesResponse, requesterResponse, addresseeResponse, overrideResponse] = await Promise.all([
        supabase
          .from('likes')
          .select('to_profile_id')
          .in('to_profile_id', profileIds)
          .gte('created_at', windowStartIso),
        supabase
          .from('friendships')
          .select('requester_id')
          .eq('status', 'accepted')
          .in('requester_id', profileIds)
          .gte('updated_at', windowStartIso),
        supabase
          .from('friendships')
          .select('addressee_id')
          .eq('status', 'accepted')
          .in('addressee_id', profileIds)
          .gte('updated_at', windowStartIso),
        supabase
          .from('profiles')
          .select('id')
          .in('id', profileIds)
          .eq('is_popular_override', true),
      ]);

      if (likesResponse.error || requesterResponse.error || addresseeResponse.error) {
        console.error('Error loading popularity signals:', likesResponse.error || requesterResponse.error || addresseeResponse.error);
        if (active) {
          setPopularityByProfileId({});
        }
        return;
      }

      const overrideSet = new Set<string>(
        ((overrideResponse.data as { id: string }[] | null) || []).map((r) => r.id)
      );

      const likesCount = new Map<string, number>();
      for (const row of ((likesResponse.data as LikePopularityRow[] | null) || [])) {
        likesCount.set(row.to_profile_id, (likesCount.get(row.to_profile_id) ?? 0) + 1);
      }

      const friendshipsCount = new Map<string, number>();
      for (const row of ((requesterResponse.data as FriendshipRequesterPopularityRow[] | null) || [])) {
        friendshipsCount.set(row.requester_id, (friendshipsCount.get(row.requester_id) ?? 0) + 1);
      }
      for (const row of ((addresseeResponse.data as FriendshipAddresseePopularityRow[] | null) || [])) {
        friendshipsCount.set(row.addressee_id, (friendshipsCount.get(row.addressee_id) ?? 0) + 1);
      }

      const rankedById = new Map(rankedProfiles.map((item) => [item.profile.id, item]));
      const nextPopularityMap: Record<string, PopularityMetrics> = {};

      for (const profileId of profileIds) {
        const rankedItem = rankedById.get(profileId);
        if (!rankedItem) continue;

        const likesReceived = likesCount.get(profileId) ?? 0;
        const acceptedFriendships = friendshipsCount.get(profileId) ?? 0;

        const score = computePopularityScore({
          likesReceived,
          acceptedFriendships,
          activityTs: rankedItem.activityTs,
          isVerified: Boolean(rankedItem.profile.isVerified),
        });

        const isPopular =
          overrideSet.has(profileId)
          || (score >= POPULARITY_SCORE_THRESHOLD
            && likesReceived >= POPULARITY_MIN_LIKES
            && acceptedFriendships >= POPULARITY_MIN_ACCEPTED_FRIENDSHIPS);

        nextPopularityMap[profileId] = {
          score,
          likesReceived,
          acceptedFriendships,
          isPopular,
        };
      }

      if (active) {
        setPopularityByProfileId(nextPopularityMap);
      }
    };

    void loadPopularitySignals();

    return () => {
      active = false;
    };
  }, [rankedProfiles]);

  useEffect(() => {
    let active = true;

    const resolveViewerProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let resolvedProfileId: string | null = null;
        let meProfile: Profile | null = null;

        if (user) {
          resolvedProfileId = await resolveProfileIdForAuthUser({
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
          });

          if (resolvedProfileId) {
            const { data: myProfileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', resolvedProfileId)
              .maybeSingle();

            if (myProfileData) {
              meProfile = mapSupabaseProfile(myProfileData as SupabaseProfile);
            }
          }
        }

        if (!active) return;

        setCurrentProfileId(resolvedProfileId);
        setCurrentProfile(meProfile);
      } catch (error) {
        console.error('Error resolving viewer profile:', error);
        if (active) {
          setCurrentProfileId(null);
          setCurrentProfile(null);
        }
      } finally {
        if (active) {
          setViewerResolved(true);
        }
      }
    };

    void resolveViewerProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadLikedProfiles = async () => {
      if (!currentProfileId) {
        setLikedProfiles(new Set());
        return;
      }

      const likedIds = await getLikedProfileIds();
      setLikedProfiles(new Set(likedIds));
    };

    void loadLikedProfiles();
  }, [currentProfileId, getLikedProfileIds]);

  const loadFallbackProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(120)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedProfiles = ((data as SupabaseProfile[] | null) || []).map(mapSupabaseProfile);
    const filteredProfiles = filterNonAdminProfiles(mappedProfiles)
      .filter((profile) => !isHiddenAdminProfile(profile))
      .filter((profile) => !currentProfileId || profile.id !== currentProfileId);

    const rankedFallback = filteredProfiles.map((profile) => rankProfile(currentProfile, profile));

    if (discoveryMode === 'active') {
      rankedFallback.sort((a, b) => b.activityTs - a.activityTs || b.recommendedScore - a.recommendedScore);
    } else if (discoveryMode === 'nearby') {
      rankedFallback.sort((a, b) => Number(b.isNearby) - Number(a.isNearby) || b.recommendedScore - a.recommendedScore);
    } else {
      rankedFallback.sort((a, b) => b.recommendedScore - a.recommendedScore || b.activityTs - a.activityTs);
    }

    setRankedProfiles(rankedFallback);
    setHasMore(false);
    setNextCursor(null);
  }, [currentProfile, currentProfileId, discoveryMode]);

  const fetchRankedPage = useCallback(async (cursor: MatchCursor | null) => {
    const append = Boolean(cursor);

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const sort = discoveryMode === 'nearby'
        ? 'closest'
        : discoveryMode === 'active'
        ? 'active'
        : 'recommended';

      const result = await fetchRankedProfilesPage({
        viewerProfileId: currentProfileId,
        limit: 24,
        cursor,
        sort,
        referenceCity: currentProfile?.city || null,
      });

      const normalizedItems: RankedProfile[] = result.items.map((item) => ({
        profile: item.profile,
        recommendedScore: item.recommendedScore,
        matchScore: item.matchScore,
        sharedInterests: item.sharedInterests,
        isNearby: item.isNearby,
        activityTs: item.activityTs,
        sortValue: item.sortValue,
      }));

      setRpcUnavailable(false);
      setRankedProfiles((prev) => (append ? [...prev, ...normalizedItems] : normalizedItems));
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('Error loading ranked profiles:', error);

      if (append) {
        setHasMore(false);
      } else if (isMissingMatchingRpc(error)) {
        setRpcUnavailable(true);
        await loadFallbackProfiles();
      } else {
        setRankedProfiles([]);
        setHasMore(false);
        setNextCursor(null);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [currentProfile?.city, currentProfileId, discoveryMode, loadFallbackProfiles]);

  useEffect(() => {
    if (!viewerResolved) return;
    void fetchRankedPage(null);
  }, [fetchRankedPage, viewerResolved]);

  useEffect(() => {
    if (!viewerResolved) return;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimeout) return;

      refreshTimeout = setTimeout(() => {
        refreshTimeout = null;
        void fetchRankedPage(null);
      }, 900);
    };

    const channel = supabase
      .channel(`home-matching-live-${discoveryMode}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      channel.unsubscribe();
    };
  }, [discoveryMode, fetchRankedPage, viewerResolved]);

  const displayProfiles = useMemo(() => {
    if (discoveryMode === 'nearby') {
      return rankedProfiles.filter((item) => item.isNearby);
    }
    return rankedProfiles;
  }, [discoveryMode, rankedProfiles]);

  const nearbyCityLabel = currentProfile?.city || 'Twoje miasto';

  const subtitle = useMemo(() => {
    if (discoveryMode === 'nearby') {
      if (!currentProfile?.city) {
        return 'Uzupelnij miasto w profilu, aby zobaczyc osoby najblizej Ciebie.';
      }
      return `Pokazujemy osoby z miasta: ${nearbyCityLabel}.`;
    }

    if (discoveryMode === 'active') {
      return `Najswiezsze profile i osoby aktywne ostatnio (${displayProfiles.length} wynikow).`;
    }

    return `Dopasowalismy ${displayProfiles.length} osob na podstawie zainteresowan, celu relacji i aktywnosci.`;
  }, [currentProfile?.city, discoveryMode, displayProfiles.length, nearbyCityLabel]);

  const toggleLike = async (profileId: string) => {
    const wasLiked = likedProfiles.has(profileId);

    if (!wasLiked) {
      triggerLikeFx(profileId);
    }

    setLikedProfiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });

    try {
      if (wasLiked) {
        await unlikeProfile(profileId);
      } else {
        await likeProfile(profileId);
      }
    } catch (error) {
      console.error('Blad aktualizacji ulubionych:', error);
      setLikedProfiles((prev) => {
        const rollback = new Set(prev);
        if (wasLiked) {
          rollback.add(profileId);
        } else {
          rollback.delete(profileId);
        }
        return rollback;
      });
    }
  };

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    void fetchRankedPage(nextCursor);
  };

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto flex flex-col gap-8">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-light mb-2">
            Odkrywaj <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400 font-medium">nowe znajomości</span>
          </h1>
          <p className="text-cyan-400/70 font-light text-lg">
            {subtitle}
          </p>
          {rpcUnavailable && (
            <p className="text-xs text-amber-300/80 mt-2">
              Tryb awaryjny: ranking liczony lokalnie (uruchom migracje `supabase/profile_matching_rpc.sql`).
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setDiscoveryMode('recommended')}
            className={`px-5 py-2.5 rounded-full glass text-sm transition-all ${
              discoveryMode === 'recommended'
                ? 'border-cyan-500/30 bg-cyan-500/10 font-medium text-cyan-300 shadow-[inset_0_0_15px_rgba(0,255,255,0.1)]'
                : 'border-cyan-500/30 font-light text-cyan-300/70 hover:bg-cyan-500/10 hover:border-cyan-500/50'
            }`}
          >
            <Sparkle className="inline-block mr-1.5 text-cyan-400" size={16} weight="fill" /> Rekomendowani
          </button>
          <button
            onClick={() => setDiscoveryMode('nearby')}
            className={`px-5 py-2.5 rounded-full glass text-sm transition-all ${
              discoveryMode === 'nearby'
                ? 'border-cyan-500/30 bg-cyan-500/10 font-medium text-cyan-300 shadow-[inset_0_0_15px_rgba(0,255,255,0.1)]'
                : 'border-cyan-500/30 font-light text-cyan-300/70 hover:bg-cyan-500/10 hover:border-cyan-500/50'
            }`}
          >
            W pobliżu {currentProfile?.city ? `(${nearbyCityLabel})` : ''}
          </button>
          <button
            onClick={() => setDiscoveryMode('active')}
            className={`px-5 py-2.5 rounded-full glass text-sm transition-all ${
              discoveryMode === 'active'
                ? 'border-cyan-500/30 bg-cyan-500/10 font-medium text-cyan-300 shadow-[inset_0_0_15px_rgba(0,255,255,0.1)]'
                : 'border-cyan-500/30 font-light text-cyan-300/70 hover:bg-cyan-500/10 hover:border-cyan-500/50'
            }`}
          >
            Aktywni
          </button>
        </div>
      </section>

      {/* Profile Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8 mt-8">
        {loading ? (
          <div className="col-span-full text-center text-cyan-400">Ładowanie profili...</div>
        ) : discoveryMode === 'nearby' && !currentProfile?.city ? (
          <div className="col-span-full text-center text-cyan-300/80 glass rounded-2xl border border-cyan-500/20 p-10">
            Uzupełnij miasto w profilu, aby lista „W pobliżu” działała precyzyjnie.
          </div>
        ) : displayProfiles.length === 0 ? (
          <div className="col-span-full text-center text-cyan-300/80 glass rounded-2xl border border-cyan-500/20 p-10">
            Brak wyników dla tej kategorii. Spróbuj innego filtru.
          </div>
        ) : (
          displayProfiles.map((item, idx) => {
            const profile = item.profile;
            const isLiked = likedProfiles.has(profile.id);
            const popularity = popularityByProfileId[profile.id];
            const isPopular = Boolean(popularity?.isPopular);
            const isLikeBursting = burstingLikeIds.has(profile.id);
            const isLikePopping = poppingLikeIds.has(profile.id);
            const likeBurstTick = likeBurstTicks[profile.id] ?? 0;
            const likePopTick = likePopTicks[profile.id] ?? 0;
            const matchScore = item.matchScore;
            const isRecentlyActive = item.activityTs > 0 && Date.now() - item.activityTs <= 24 * 3600000;

            return (
              <div
                key={profile.id}
                onClick={() => router.push(`/profile/${profile.id}`)}
                className={`profile-card glass rounded-[2rem] overflow-hidden relative group cursor-pointer ${
                  isPopular ? 'popular-profile-card' : ''
                }`}
              >
                <div className="aspect-[3/4] w-full relative">
                  <img
                    src={
                      profile.image_url ||
                      `https://images.unsplash.com/photo-${1515372039744 + idx}?ixlib=rb-4.0.3&w=800&q=80`
                    }
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07050f] via-[#07050f]/40 to-transparent"></div>
                  {isPopular && (
                    <>
                      <div className="popular-profile-frame absolute inset-0 pointer-events-none z-[5]"></div>
                      <div className="popular-profile-sheen absolute inset-0 pointer-events-none z-[4]"></div>
                    </>
                  )}

                  {/* Match Badge */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-fuchsia-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,0,255,0.2)]">
                      <Sparkle className="text-fuchsia-400" size={14} weight="fill" />
                      <span className="text-xs font-semibold text-white">{matchScore}% Match</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPopular && (
                        <div
                          className="popular-bolt-badge"
                          title={`Popularna: ${popularity?.score || 0}/100 • ${popularity?.likesReceived || 0} polubien • ${popularity?.acceptedFriendships || 0} znajomych`}
                        >
                          <Lightning size={13} weight="fill" className="popular-bolt-icon" />
                        </div>
                      )}
                      {profile.details?.looking_for && (
                        <div className={`bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                          profile.details.looking_for === 'miłość' 
                            ? 'border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.2)]'
                            : profile.details.looking_for === 'przygoda'
                            ? 'border-cyan-500/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                            : 'border-cyan-500/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                        }`}>
                          <span className="text-xs font-semibold text-white">
                            {LOOKING_FOR_OPTIONS.find(opt => opt.value === profile.details.looking_for)?.label}
                          </span>
                        </div>
                      )}
                      {item.sharedInterests > 0 && (
                        <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-cyan-500/30 text-[10px] font-semibold text-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                          Wspólne: {item.sharedInterests}
                        </div>
                      )}
                      {isRecentlyActive && (
                        <div className="w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)] border-2 border-black"></div>
                      )}
                    </div>
                  </div>

                  {/* Profile Info - Always visible, slides up on hover */}
                  <div className="absolute bottom-0 left-0 w-full pb-1 px-5 pt-2 z-10 transform transition-transform duration-300 ease-out group-hover:-translate-y-6">
                    <div className="card-meta flex flex-col gap-2.5 relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-3xl font-medium text-white">
                            {profile.name || 'User'},{' '}
                            {typeof profile.age === 'number' ? `${profile.age} lat` : '? lat'}
                          </h2>
                          {profile.isVerified && (
                            <SealCheck size={22} weight="fill" className="text-cyan-400 drop-shadow-[0_0_6px_rgba(0,255,255,0.8)] flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-cyan-300/70 text-sm font-light">
                          <MapPin size={14} weight="fill" className="text-cyan-400" />
                          <span>{profile.city || 'Bliżej nieokreślone'}</span>
                        </div>
                      </div>

                      {/* Action Buttons - Hidden by default, visible on hover */}
                      <div className="card-actions flex gap-3 relative z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(profile.id);
                          }}
                          className="pointer-events-auto flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 py-2.5 rounded-xl flex items-center justify-center gap-2 text-white transition-all hover:border-red-400/50 hover:text-red-400 group/btn"
                        >
                          <div className="relative inline-flex h-6 w-6 items-center justify-center overflow-visible">
                            {isLikeBursting && (
                              <div key={`home-like-burst-${profile.id}-${likeBurstTick}`} className="like-heart-burst" aria-hidden="true">
                                {HEART_BURST_PARTICLES.map((particle, index) => {
                                  const style: CSSProperties = {
                                    fontSize: `${particle.sizePx}px`,
                                    animationDelay: `${particle.delayMs}ms`,
                                    ['--burst-x' as string]: `${particle.x}px`,
                                    ['--burst-y' as string]: `${particle.y}px`,
                                  };

                                  return (
                                    <span key={`home-particle-${profile.id}-${likeBurstTick}-${index}`} className="like-heart-particle" style={style}>
                                      ❤
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          <Heart
                            key={`home-heart-${profile.id}-${likePopTick}-${isLiked ? 'liked' : 'idle'}`}
                            size={20}
                            weight={isLiked ? 'fill' : 'regular'}
                            className={`${
                              isLiked ? 'text-red-400' : ''
                            } ${isLikePopping ? 'like-heart-core-pop' : ''} group-hover/btn:scale-110 transition-transform`}
                          />
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/messages?user=${encodeURIComponent(profile.id)}`);
                          }}
                          className="pointer-events-auto flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(0,255,255,0.3)] py-2.5 rounded-xl flex items-center justify-center gap-2 text-white transition-all"
                        >
                          <ChatCircle size={20} weight="fill" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {!rpcUnavailable && hasMore && !(discoveryMode === 'nearby' && !currentProfile?.city) && (
        <div className="flex justify-center mt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-3 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Ladowanie kolejnych profili...' : 'Pokaz kolejne profile'}
          </button>
        </div>
      )}
    </div>
  );
}

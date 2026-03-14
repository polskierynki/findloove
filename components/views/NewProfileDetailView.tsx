'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Heart,
  Gift,
  Lightning,
  PaperPlaneTilt,
  ChatCircle,
  Sparkle,
  Images,
  MapPin,
  SealCheck,
  HeartStraight,
  Quotes,
  X,
  CaretLeft,
  CaretRight,
  Smiley,
  Flag,
  UserPlus,
  UserCheck,
} from '@phosphor-icons/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { resolveProfileIdForAuthUser } from '@/lib/profileAuth';
import {
  applyEmojiSuggestionAtCursor,
  getEmojiSuggestionsAtCursor,
  processEmojiAssistInput,
  type EmojiKeywordSuggestion,
} from '@/lib/emojiAssist';
import { computeUnifiedCompatibility } from '@/lib/matching';
import { Profile } from '@/lib/types';
import { useLikes } from '@/lib/hooks/useLikes';
import { useFriends, type FriendshipStatus, type Friend } from '@/lib/hooks/useFriends';
import { ALL_INTERESTS, ZODIAC_SIGNS } from './constants/profileFormOptions';
import EmojiPopover from '@/components/ui/EmojiPopover';
import EmojiKeywordSuggestions from '@/components/ui/EmojiKeywordSuggestions';
import FloatingBadgeTooltip from '@/components/ui/FloatingBadgeTooltip';
import HoverHintIconButton from '@/components/ui/HoverHintIconButton';
import ReportCommentModal from '@/components/ui/ReportCommentModal';
import GiftModal, { type GiftSelectionPayload } from '@/components/modals/GiftModal';

type AppComment = {
  id: string;
  content: string;
  author_profile_id: string;
  author: { name: string; image: string; city: string };
  created_at: string;
};

type ProfileCommentRow = {
  id: string;
  content: string;
  author_profile_id: string;
  created_at: string;
  profiles?: {
    name?: string | null;
    image_url?: string | null;
    city?: string | null;
  } | null;
};

type ReceivedGift = {
  id: string;
  emoji: string;
  label: string;
  tokenCost: number;
  fromName: string;
  isAnonymous: boolean;
  message: string;
  createdAt: string;
};

type HeartBurstParticle = {
  x: number;
  y: number;
  delayMs: number;
  sizePx: number;
};

const HEART_BURST_PARTICLES: HeartBurstParticle[] = [
  { x: 0, y: -30, delayMs: 0, sizePx: 10 },
  { x: 20, y: -20, delayMs: 30, sizePx: 11 },
  { x: 28, y: -2, delayMs: 60, sizePx: 10 },
  { x: 18, y: 16, delayMs: 90, sizePx: 9 },
  { x: 0, y: 24, delayMs: 40, sizePx: 9 },
  { x: -18, y: 16, delayMs: 70, sizePx: 10 },
  { x: -28, y: -2, delayMs: 50, sizePx: 10 },
  { x: -20, y: -20, delayMs: 20, sizePx: 11 },
];

const DETAIL_HERO_IMAGE_SIZES = '(max-width: 1023px) calc(100vw - 3rem), 68vw';
const DETAIL_GALLERY_FEATURED_SIZES = '(max-width: 1023px) 66vw, 24vw';
const DETAIL_GALLERY_THUMB_SIZES = '(max-width: 1023px) 33vw, 12vw';
const DETAIL_MODAL_IMAGE_SIZES = '100vw';

function formatRelativeTime(timestamp: string): string {
  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) return 'Przed chwila';

  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Teraz';
  if (diffMin < 60) return `${diffMin} min temu`;
  if (diffHour < 24) return `${diffHour} godz. temu`;
  if (diffDay === 1) return 'Wczoraj';
  if (diffDay < 7) return `${diffDay} dni temu`;

  return new Date(ts).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
  });
}

function formatCommentDateTime(timestamp: string): string {
  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) return '';

  return new Date(ts).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type CompatibilityProfile = {
  id?: string | null;
  age?: number | null;
  city?: string | null;
  interests?: string[] | null;
  status?: string | null;
  details?: {
    looking_for?: string | null;
    zodiac?: string | null;
    smoking?: string | null;
    drinking?: string | null;
    pets?: string | null;
    children?: string | null;
  } | null;
  looking_for?: string | null;
  zodiac?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  pets?: string | null;
  children?: string | null;
  gender?: string | null;
  seeking_gender?: string | null;
  seeking_age_min?: number | null;
  seeking_age_max?: number | null;
  last_active?: string | null;
  lastActive?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  isVerified?: boolean | null;
  is_verified?: boolean | null;
  role?: string | null;
};

type CompatibilityResult = {
  matchScore: number;
  sharedTraits: number;
  sharedInterests: number;
};

function computeCompatibility(viewer: CompatibilityProfile | null, target: CompatibilityProfile | null): CompatibilityResult {
  const unified = computeUnifiedCompatibility(viewer, target);

  return {
    matchScore: unified.matchScore,
    sharedTraits: unified.sharedTraits,
    sharedInterests: unified.sharedInterests,
  };
}

export default function NewProfileDetailView({ profileId }: { profileId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkPhotoParam = searchParams.get('photo');
  const deepLinkCommentsParam = searchParams.get('comments');
  const { likeProfile, unlikeProfile, hasLikedProfile } = useLikes();
  const { sendFriendRequest, acceptFriendRequest, removeFriendship, getFriendshipStatus, getFriendsForProfile } = useFriends();

  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [profileFriends, setProfileFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDetailPopular, setIsDetailPopular] = useState(false);
  const [detailPopularityStats, setDetailPopularityStats] = useState({
    score: 0,
    likesReceived: 0,
    acceptedFriendships: 0,
  });
  const [comments, setComments] = useState<AppComment[]>([]);
  const [photoComments, setPhotoComments] = useState<AppComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [photoCommentText, setPhotoCommentText] = useState('');
  const [generalCommentSuggestions, setGeneralCommentSuggestions] = useState<EmojiKeywordSuggestion[]>([]);
  const [photoCommentSuggestions, setPhotoCommentSuggestions] = useState<EmojiKeywordSuggestion[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeBurstTick, setLikeBurstTick] = useState(0);
  const [likePopTick, setLikePopTick] = useState(0);
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<CompatibilityProfile | null>(null);
  const [compatibilityLoading, setCompatibilityLoading] = useState(true);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftBalance, setGiftBalance] = useState<number>(0);
  const [giftSending, setGiftSending] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftNotice, setGiftNotice] = useState<string | null>(null);
  const [receivedGifts, setReceivedGifts] = useState<ReceivedGift[]>([]);
  const [receivedGiftsLoading, setReceivedGiftsLoading] = useState(false);
  const [deletingGiftId, setDeletingGiftId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingPhotoComment, setIsSubmittingPhotoComment] = useState(false);
  const [deletingWallCommentId, setDeletingWallCommentId] = useState<string | null>(null);
  const [deletingPhotoCommentId, setDeletingPhotoCommentId] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [photoCommentsLoading, setPhotoCommentsLoading] = useState(false);
  const [photoCommentsTableAvailable, setPhotoCommentsTableAvailable] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [showGeneralCommentEmojiPicker, setShowGeneralCommentEmojiPicker] = useState(false);
  const [showPhotoCommentEmojiPicker, setShowPhotoCommentEmojiPicker] = useState(false);
  const [reportModal, setReportModal] = useState<{
    kind: 'wall-comment' | 'photo-comment' | 'photo-content';
    targetId?: string | null;
    content: string;
    authorId: string;
    contextLabel?: string;
  } | null>(null);
  const generalCommentInputRef = useRef<HTMLInputElement>(null);
  const photoCommentInputRef = useRef<HTMLInputElement>(null);
  const generalCommentEmojiButtonRef = useRef<HTMLButtonElement>(null);
  const photoCommentEmojiButtonRef = useRef<HTMLButtonElement>(null);
  const loggedProfileViewRef = useRef<string | null>(null);
  const deepLinkHandledRef = useRef<string | null>(null);

  const allPhotos = useMemo(() => {
    if (!profile) return [];
    const photos = [
      profile.image_url,
      ...(profile.photos || []),
    ].filter((item): item is string => Boolean(item && item.trim()));

    return Array.from(new Set(photos));
  }, [profile]);

  const visibleProfileFriends = useMemo(
    () => (friendsExpanded ? profileFriends : profileFriends.slice(0, 6)),
    [friendsExpanded, profileFriends],
  );

  const hasMoreProfileFriends = profileFriends.length > 6;

  const refreshTargetProfileSnapshot = useCallback(async (viewerProfileId?: string | null) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      console.error('Blad odswiezania profilu docelowego:', error.message);
      return;
    }

    const effectiveViewerProfileId = viewerProfileId ?? authorProfileId;
    const rawProfile = data as ({ id?: string; is_blocked?: boolean; is_verified?: boolean } & Profile) | null;
    const isHiddenForViewer = Boolean(rawProfile?.is_blocked) && rawProfile?.id !== effectiveViewerProfileId;
    const baseProfile = data as Profile | null;
    const nextProfile = isHiddenForViewer ? null : (baseProfile ? { ...baseProfile, isVerified: Boolean(rawProfile?.is_verified) } : null);

    setProfile(nextProfile ?? null);
    return nextProfile ?? null;
  }, [authorProfileId, profileId]);

  const refreshViewerProfileSnapshot = useCallback(async (viewerProfileId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', viewerProfileId)
      .maybeSingle();

    if (error) {
      console.error('Blad odswiezania profilu odwiedzajacego:', error.message);
      return;
    }

    setViewerProfile((data as CompatibilityProfile | null) ?? null);
  }, []);

  const compatibility = useMemo(
    () => computeCompatibility(viewerProfile, profile as CompatibilityProfile | null),
    [profile, viewerProfile],
  );

  const compatibilityTraitsLabel = useMemo(() => {
    if (compatibilityLoading) return 'Trwa analiza dopasowania...';
    if (!viewerProfile) return 'Zaloguj się, aby zobaczyć dopasowanie';

    const suffix = compatibility.sharedTraits === 1
      ? 'wspólna cecha'
      : compatibility.sharedTraits <= 4
      ? 'wspólne cechy'
      : 'wspólnych cech';

    return `${compatibility.sharedTraits} ${suffix}`;
  }, [compatibility.sharedTraits, compatibilityLoading, viewerProfile]);

  const normalizedViewerRole = (viewerProfile?.role || '').trim().toLowerCase();
  const isViewerAdmin = normalizedViewerRole === 'admin' || normalizedViewerRole === 'super_admin';
  const isViewingOwnProfile = Boolean(authorProfileId && authorProfileId === profileId);

  const isDetailRecentlyActive = useMemo(() => {
    const lastActive = (profile as any)?.last_active as string | undefined;
    if (!lastActive) return false;
    const ts = Date.parse(lastActive);
    return !Number.isNaN(ts) && Date.now() - ts <= 15 * 60 * 1000;
  }, [profile]);

  const detailPopularTooltip = useMemo(() => {
    const overrideSuffix = Boolean((profile as any)?.is_popular_override) ? ' • Oznaczony recznie' : '';
    return `Popularny profil • Wynik: ${detailPopularityStats.score}/100 • Polubienia: ${detailPopularityStats.likesReceived} • Znajomi: ${detailPopularityStats.acceptedFriendships}${overrideSuffix}`;
  }, [detailPopularityStats.acceptedFriendships, detailPopularityStats.likesReceived, detailPopularityStats.score, profile]);

  useEffect(() => {
    if (!profile) {
      setIsDetailPopular(false);
      setDetailPopularityStats({ score: 0, likesReceived: 0, acceptedFriendships: 0 });
      return;
    }

    const hasOverride = Boolean((profile as any).is_popular_override);
    const windowStart = new Date(Date.now() - 45 * 86400000).toISOString();

    void Promise.all([
      supabase.from('likes').select('id', { count: 'exact', head: true })
        .eq('to_profile_id', profileId)
        .gte('created_at', windowStart),
      supabase.from('friendships').select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
        .eq('status', 'accepted'),
    ]).then(([likesRes, friendsRes]) => {
      const likesReceived = likesRes.count ?? 0;
      const acceptedFriendships = friendsRes.count ?? 0;

      const lastActiveTs = Date.parse(((profile as any)?.last_active as string | undefined) || '');
      let activityScore = 0;

      if (!Number.isNaN(lastActiveTs)) {
        const daysAgo = (Date.now() - lastActiveTs) / 86400000;
        if (daysAgo <= 3) {
          activityScore = 12;
        } else if (daysAgo <= 10) {
          activityScore = 6;
        }
      }

      const verifiedScore = profile.isVerified ? 4 : 0;
      const score = Math.min(100, likesReceived * 8 + acceptedFriendships * 12 + activityScore + verifiedScore);

      setDetailPopularityStats({
        score,
        likesReceived,
        acceptedFriendships,
      });

      setIsDetailPopular(
        hasOverride || (score >= 70 && likesReceived >= 5 && acceptedFriendships >= 2),
      );
    }).catch(() => {
      setDetailPopularityStats({ score: 0, likesReceived: 0, acceptedFriendships: 0 });
      setIsDetailPopular(hasOverride);
    });
  }, [profile, profileId]);

  const canDeleteGift = useCallback((gift: ReceivedGift) => {
    if (isViewerAdmin) return true;
    if (!isViewingOwnProfile) return false;
    return Boolean(gift.message && gift.message.trim());
  }, [isViewerAdmin, isViewingOwnProfile]);

  const loadGeneralComments = useCallback(async () => {
    const { data: commentsData, error: commentsError } = await supabase
      .from('profile_comments')
      .select(`
        id,
        content,
        author_profile_id,
        created_at,
        profiles!author_profile_id (name, image_url, city)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Blad ladowania komentarzy profilu:', commentsError.message);
      setComments([]);
      return;
    }

    setComments(
      ((commentsData as ProfileCommentRow[] | null) || []).map((entry) => ({
        id: entry.id,
        content: entry.content,
        author_profile_id: entry.author_profile_id,
        author: {
          name: entry.profiles?.name || 'User',
          image: entry.profiles?.image_url || '',
          city: entry.profiles?.city || '',
        },
        created_at: entry.created_at,
      })),
    );
  }, [profileId]);

  const loadPhotoComments = useCallback(async (photoIndex: number) => {
    setPhotoCommentsLoading(true);

    try {
      const { data, error } = await supabase
        .from('profile_photo_comments')
        .select('id, content, author_profile_id, created_at')
        .eq('profile_id', profileId)
        .eq('photo_index', photoIndex)
        .order('created_at', { ascending: true });

      if (error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('profile_photo_comments')) {
          setPhotoCommentsTableAvailable(false);
          setPhotoComments([]);
          return;
        }
        throw error;
      }

      setPhotoCommentsTableAvailable(true);

      const rows = (data || []) as Array<{
        id: string;
        content: string;
        author_profile_id: string;
        created_at: string;
      }>;

      const authorIds = Array.from(new Set(rows.map((row) => row.author_profile_id).filter(Boolean)));
      let authorMap = new Map<string, { name?: string | null; image_url?: string | null; city?: string | null }>();

      if (authorIds.length > 0) {
        const { data: authors, error: authorError } = await supabase
          .from('profiles')
          .select('id, name, image_url, city')
          .in('id', authorIds);

        if (authorError) {
          console.error('Blad ladowania autorow komentarzy zdjec:', authorError.message);
        } else {
          authorMap = new Map(
            (authors || []).map((author) => [
              author.id as string,
              {
                name: (author as { name?: string | null }).name,
                image_url: (author as { image_url?: string | null }).image_url,
                city: (author as { city?: string | null }).city,
              },
            ]),
          );
        }
      }

      setPhotoComments(
        rows.map((row) => {
          const author = authorMap.get(row.author_profile_id);
          return {
            id: row.id,
            content: row.content,
            author_profile_id: row.author_profile_id,
            author: {
              name: author?.name || 'User',
              image: author?.image_url || '',
              city: author?.city || '',
            },
            created_at: row.created_at,
          };
        }),
      );
    } catch (error) {
      console.error('Blad ladowania komentarzy do zdjecia:', error);
      setPhotoComments([]);
    } finally {
      setPhotoCommentsLoading(false);
    }
  }, [profileId]);

  const resolveCurrentAuthorProfileId = useCallback(async () => {
    if (authorProfileId) return authorProfileId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const resolved = await resolveProfileIdForAuthUser({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    if (resolved) {
      setAuthorProfileId(resolved);
    }

    return resolved;
  }, [authorProfileId]);

  useEffect(() => {
    let cancelled = false;

    const loadViewerProfileForCompatibility = async () => {
      setCompatibilityLoading(true);

      try {
        const viewerProfileId = await resolveCurrentAuthorProfileId();

        if (cancelled) return;

        if (!viewerProfileId) {
          setViewerProfile(null);
          return;
        }

        await refreshViewerProfileSnapshot(viewerProfileId);
      } catch (error) {
        console.error('Blad analizy dopasowania profili:', error);
        if (cancelled) return;
        setViewerProfile(null);
      } finally {
        if (!cancelled) {
          setCompatibilityLoading(false);
        }
      }
    };

    void loadViewerProfileForCompatibility();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshViewerProfileSnapshot, resolveCurrentAuthorProfileId]);

  const loadReceivedGifts = useCallback(async () => {
    setReceivedGiftsLoading(true);

    try {
      const { data, error } = await supabase
        .from('profile_interactions')
        .select('id, from_profile_id, label, emoji, token_cost, created_at, is_anonymous, message')
        .eq('to_profile_id', profileId)
        .eq('kind', 'gift')
        .order('created_at', { ascending: false })
        .limit(16);

      if (error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('is_anonymous') || errorText.includes('token_balance') || errorText.includes('send_profile_gift')) {
          setGiftError('Brak migracji systemu prezentow/tokenow. Uruchom SQL: supabase/gift_tokens_migration.sql');
          setReceivedGifts([]);
          return;
        }
        throw error;
      }

      const rows = (data || []) as Array<{
        id: string;
        from_profile_id: string;
        label: string | null;
        emoji: string | null;
        token_cost: number | null;
        created_at: string;
        is_anonymous?: boolean | null;
        message?: string | null;
      }>;

      const actorIds = Array.from(
        new Set(
          rows
            .filter((row) => !row.is_anonymous)
            .map((row) => row.from_profile_id)
            .filter(Boolean),
        ),
      );

      const actorMap = new Map<string, string>();
      if (actorIds.length > 0) {
        const { data: actors, error: actorError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', actorIds);

        if (actorError) {
          console.error('Blad ladowania autorow prezentow:', actorError.message);
        } else {
          for (const actor of actors || []) {
            actorMap.set(actor.id as string, ((actor as { name?: string | null }).name || 'Ktos').trim() || 'Ktos');
          }
        }
      }

      setReceivedGifts(
        rows.map((row) => {
          const isAnonymous = Boolean(row.is_anonymous);
          const message = (row.message || '').trim();
          return {
            id: row.id,
            emoji: row.emoji || '🎁',
            label: row.label || 'Prezent',
            tokenCost: Number(row.token_cost || 0),
            fromName: isAnonymous ? 'Tajemniczy wielbiciel' : (actorMap.get(row.from_profile_id) || 'Ktos'),
            isAnonymous,
            message,
            createdAt: row.created_at,
          };
        }),
      );
    } catch (error) {
      console.error('Blad ladowania otrzymanych prezentow:', error);
      setReceivedGifts([]);
    } finally {
      setReceivedGiftsLoading(false);
    }
  }, [profileId]);

  const openGiftModal = useCallback(async () => {
    setGiftError(null);
    setGiftNotice(null);

    const senderProfileId = await resolveCurrentAuthorProfileId();
    if (!senderProfileId) {
      setGiftError('Zaloguj sie, aby wysylac prezenty.');
      return;
    }

    if (senderProfileId === profileId) {
      setGiftError('Nie mozesz wyslac prezentu samemu sobie.');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', senderProfileId)
      .maybeSingle();

    if (error) {
      const errorText = error.message.toLowerCase();
      if (errorText.includes('token_balance')) {
        setGiftError('Brak migracji systemu prezentow/tokenow. Uruchom SQL: supabase/gift_tokens_migration.sql');
      } else {
        setGiftError(`Nie udalo sie pobrac salda tokenow: ${error.message}`);
      }
      return;
    }

    const nextBalance = Number((data as { token_balance?: number | null } | null)?.token_balance ?? 0);
    setGiftBalance(Number.isFinite(nextBalance) ? nextBalance : 0);
    setIsGiftModalOpen(true);
  }, [profileId, resolveCurrentAuthorProfileId]);

  const handleSendGiftInteraction = useCallback(async (payload: GiftSelectionPayload): Promise<boolean> => {
    setGiftError(null);
    setGiftNotice(null);

    const senderProfileId = await resolveCurrentAuthorProfileId();
    if (!senderProfileId) {
      setGiftError('Zaloguj sie, aby wyslac prezent.');
      return false;
    }

    if (senderProfileId === profileId) {
      setGiftError('Nie mozesz wyslac prezentu samemu sobie.');
      return false;
    }

    setGiftSending(true);

    try {
      const { data, error } = await supabase.rpc('send_profile_gift', {
        p_to_profile_id: profileId,
        p_label: payload.label,
        p_emoji: payload.emoji,
        p_token_cost: payload.price,
        p_message: payload.message?.trim() || null,
        p_is_anonymous: payload.isAnonymous,
      });

      if (error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('send_profile_gift') || errorText.includes('token_balance') || errorText.includes('is_anonymous')) {
          setGiftError('Brak migracji systemu prezentow/tokenow. Uruchom SQL: supabase/gift_tokens_migration.sql');
          return false;
        }

        setGiftError(error.message || 'Nie udalo sie wyslac prezentu.');
        return false;
      }

      const row = Array.isArray(data)
        ? (data[0] as { new_balance?: number } | undefined)
        : (data as { new_balance?: number } | null);

      const nextBalance = Number(row?.new_balance);
      if (Number.isFinite(nextBalance)) {
        setGiftBalance(nextBalance);
      } else {
        const { data: balanceSnapshot } = await supabase
          .from('profiles')
          .select('token_balance')
          .eq('id', senderProfileId)
          .maybeSingle();

        const fallbackBalance = Number((balanceSnapshot as { token_balance?: number | null } | null)?.token_balance ?? giftBalance);
        if (Number.isFinite(fallbackBalance)) {
          setGiftBalance(fallbackBalance);
        }
      }

      setGiftNotice(`Prezent "${payload.label}" zostal wyslany.`);
      await loadReceivedGifts();
      return true;
    } catch (error) {
      console.error('Blad wysylania prezentu:', error);
      setGiftError('Nie udalo sie wyslac prezentu. Sprobuj ponownie.');
      return false;
    } finally {
      setGiftSending(false);
    }
  }, [giftBalance, loadReceivedGifts, profileId, resolveCurrentAuthorProfileId]);

  const handleDeleteGift = useCallback(async (gift: ReceivedGift) => {
    if (!canDeleteGift(gift) || deletingGiftId) return;

    const confirmationMessage = isViewerAdmin
      ? 'Usunac ten prezent jako administrator?'
      : 'Usunac ten prezent z niestosownym komentarzem?';

    const shouldDelete = window.confirm(confirmationMessage);
    if (!shouldDelete) return;

    setGiftError(null);
    setGiftNotice(null);
    setDeletingGiftId(gift.id);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setGiftError('Brak aktywnej sesji. Zaloguj sie ponownie.');
        return;
      }

      const response = await fetch('/api/gifts/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ giftId: gift.id }),
      });

      const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;

      if (!response.ok) {
        setGiftError(payload?.error || 'Nie udalo sie usunac prezentu.');
        return;
      }

      setGiftNotice(payload?.message || 'Prezent zostal usuniety.');
      await loadReceivedGifts();
    } catch (error) {
      console.error('Blad usuwania prezentu:', error);
      setGiftError('Nie udalo sie usunac prezentu. Sprobuj ponownie.');
    } finally {
      setDeletingGiftId(null);
    }
  }, [canDeleteGift, deletingGiftId, isViewerAdmin, loadReceivedGifts]);

  const handleAddGeneralComment = useCallback(async () => {
    const content = commentText.trim();
    if (!content || isSubmittingComment) return;

    if (content.length < 2) {
      setCommentsError('Komentarz musi miec minimum 2 znaki.');
      return;
    }

    if (content.length > 400) {
      setCommentsError('Komentarz moze miec maksymalnie 400 znakow.');
      return;
    }

    setCommentsError(null);
    setIsSubmittingComment(true);

    try {
      const senderProfileId = await resolveCurrentAuthorProfileId();
      if (!senderProfileId) {
        setCommentsError('Zaloguj sie, aby dodawac komentarze.');
        return;
      }

      const { error } = await supabase
        .from('profile_comments')
        .insert({
          profile_id: profileId,
          author_profile_id: senderProfileId,
          content,
        });

      if (error) {
        throw error;
      }

      setCommentText('');
      setGeneralCommentSuggestions([]);
      setShowGeneralCommentEmojiPicker(false);
      await loadGeneralComments();
    } catch (error) {
      console.error('Blad dodawania komentarza ogolnego:', error);
      const message =
        (error as { message?: string; code?: string } | null)?.message ||
        (error as { code?: string } | null)?.code ||
        'Nieznany blad';

      if (typeof message === 'string' && message.toLowerCase().includes('row-level security')) {
        setCommentsError('Brak uprawnien RLS do komentarzy tablicy. Uruchom SQL: supabase/fix_profile_comments_rls_profile_mapping.sql');
        return;
      }

      setCommentsError(`Nie udalo sie dodac komentarza: ${message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentText, isSubmittingComment, loadGeneralComments, profileId, resolveCurrentAuthorProfileId]);

  const handleAddPhotoComment = useCallback(async () => {
    const content = photoCommentText.trim();
    if (!content || isSubmittingPhotoComment || !photoCommentsTableAvailable) return;

    setCommentsError(null);
    setIsSubmittingPhotoComment(true);

    try {
      const senderProfileId = await resolveCurrentAuthorProfileId();
      if (!senderProfileId) {
        setCommentsError('Zaloguj sie, aby dodawac komentarze do zdjec.');
        return;
      }

      const { error } = await supabase
        .from('profile_photo_comments')
        .insert({
          profile_id: profileId,
          photo_index: activePhotoIndex,
          author_profile_id: senderProfileId,
          content,
        });

      if (error) {
        throw error;
      }

      setPhotoCommentText('');
      setPhotoCommentSuggestions([]);
      setShowPhotoCommentEmojiPicker(false);
      await loadPhotoComments(activePhotoIndex);
      photoCommentInputRef.current?.focus();
    } catch (error) {
      console.error('Blad dodawania komentarza do zdjecia:', error);
      const message =
        (error as { message?: string; code?: string } | null)?.message ||
        (error as { code?: string } | null)?.code ||
        'Nieznany blad';
      setCommentsError(`Nie udalo sie dodac komentarza do zdjecia: ${message}`);
    } finally {
      setIsSubmittingPhotoComment(false);
    }
  }, [
    activePhotoIndex,
    isSubmittingPhotoComment,
    loadPhotoComments,
    photoCommentText,
    photoCommentsTableAvailable,
    profileId,
    resolveCurrentAuthorProfileId,
  ]);

  const canDeleteComment = useCallback((commentAuthorProfileId: string) => {
    if (!authorProfileId) return false;
    return commentAuthorProfileId === authorProfileId || authorProfileId === profileId;
  }, [authorProfileId, profileId]);

  const handleDeleteGeneralComment = useCallback(async (comment: AppComment) => {
    if (!canDeleteComment(comment.author_profile_id)) return;

    const shouldDelete = window.confirm('Usunac ten komentarz z tablicy?');
    if (!shouldDelete) return;

    setCommentsError(null);
    setDeletingWallCommentId(comment.id);

    try {
      const { error } = await supabase
        .from('profile_comments')
        .delete()
        .eq('id', comment.id);

      if (error) {
        throw error;
      }

      await loadGeneralComments();
    } catch (error) {
      console.error('Blad usuwania komentarza z tablicy:', error);

      const message =
        (error as { message?: string; code?: string } | null)?.message ||
        (error as { code?: string } | null)?.code ||
        'Nieznany blad';

      if (typeof message === 'string' && message.toLowerCase().includes('row-level security')) {
        setCommentsError('Brak uprawnien usuwania komentarzy tablicy. Uruchom SQL: supabase/fix_comment_owner_delete_policies.sql');
        return;
      }

      setCommentsError(`Nie udalo sie usunac komentarza: ${message}`);
    } finally {
      setDeletingWallCommentId(null);
    }
  }, [canDeleteComment, loadGeneralComments]);

  const handleDeletePhotoComment = useCallback(async (comment: AppComment) => {
    if (!photoCommentsTableAvailable || !canDeleteComment(comment.author_profile_id)) return;

    const shouldDelete = window.confirm('Usunac ten komentarz do zdjecia?');
    if (!shouldDelete) return;

    setCommentsError(null);
    setDeletingPhotoCommentId(comment.id);

    try {
      const { error } = await supabase
        .from('profile_photo_comments')
        .delete()
        .eq('id', comment.id);

      if (error) {
        throw error;
      }

      await loadPhotoComments(activePhotoIndex);
    } catch (error) {
      console.error('Blad usuwania komentarza do zdjecia:', error);

      const message =
        (error as { message?: string; code?: string } | null)?.message ||
        (error as { code?: string } | null)?.code ||
        'Nieznany blad';

      if (typeof message === 'string' && message.toLowerCase().includes('row-level security')) {
        setCommentsError('Brak uprawnien usuwania komentarzy do zdjec. Uruchom SQL: supabase/fix_comment_owner_delete_policies.sql');
        return;
      }

      setCommentsError(`Nie udalo sie usunac komentarza do zdjecia: ${message}`);
    } finally {
      setDeletingPhotoCommentId(null);
    }
  }, [activePhotoIndex, canDeleteComment, loadPhotoComments, photoCommentsTableAvailable]);

  const updateGeneralCommentWithEmojiAssist = useCallback((rawValue: string, cursor: number | null) => {
    const next = processEmojiAssistInput(rawValue, cursor);
    setCommentText(next.value);
    setGeneralCommentSuggestions(next.suggestions);

    window.requestAnimationFrame(() => {
      const input = generalCommentInputRef.current;
      if (!input || document.activeElement !== input) return;
      input.setSelectionRange(next.cursor, next.cursor);
    });
  }, []);

  const updatePhotoCommentWithEmojiAssist = useCallback((rawValue: string, cursor: number | null) => {
    const next = processEmojiAssistInput(rawValue, cursor);
    setPhotoCommentText(next.value);
    setPhotoCommentSuggestions(next.suggestions);

    window.requestAnimationFrame(() => {
      const input = photoCommentInputRef.current;
      if (!input || document.activeElement !== input) return;
      input.setSelectionRange(next.cursor, next.cursor);
    });
  }, []);

  const handlePickGeneralCommentSuggestion = useCallback((suggestion: EmojiKeywordSuggestion) => {
    const input = generalCommentInputRef.current;
    const cursor = input?.selectionStart ?? commentText.length;
    const next = applyEmojiSuggestionAtCursor(commentText, cursor, suggestion);

    setCommentText(next.value);
    setGeneralCommentSuggestions(getEmojiSuggestionsAtCursor(next.value, next.cursor));

    window.requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      input.setSelectionRange(next.cursor, next.cursor);
    });
  }, [commentText]);

  const handlePickPhotoCommentSuggestion = useCallback((suggestion: EmojiKeywordSuggestion) => {
    const input = photoCommentInputRef.current;
    const cursor = input?.selectionStart ?? photoCommentText.length;
    const next = applyEmojiSuggestionAtCursor(photoCommentText, cursor, suggestion);

    setPhotoCommentText(next.value);
    setPhotoCommentSuggestions(getEmojiSuggestionsAtCursor(next.value, next.cursor));

    window.requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      input.setSelectionRange(next.cursor, next.cursor);
    });
  }, [photoCommentText]);

  const insertEmojiToGeneralComment = useCallback((emoji: string) => {
    const input = generalCommentInputRef.current;

    if (!input) {
      setCommentText((prev) => `${prev}${emoji}`);
      setGeneralCommentSuggestions([]);
      return;
    }

    const selectionStart = input.selectionStart ?? input.value.length;
    const selectionEnd = input.selectionEnd ?? input.value.length;

    setCommentText((prev) => {
      const safeStart = Math.min(selectionStart, prev.length);
      const safeEnd = Math.min(selectionEnd, prev.length);
      return `${prev.slice(0, safeStart)}${emoji}${prev.slice(safeEnd)}`;
    });

    setGeneralCommentSuggestions([]);

    window.requestAnimationFrame(() => {
      const caretPosition = selectionStart + emoji.length;
      input.focus();
      input.setSelectionRange(caretPosition, caretPosition);
    });
  }, []);

  const insertEmojiToPhotoComment = useCallback((emoji: string) => {
    const input = photoCommentInputRef.current;

    if (!input) {
      setPhotoCommentText((prev) => `${prev}${emoji}`);
      setPhotoCommentSuggestions([]);
      return;
    }

    const selectionStart = input.selectionStart ?? input.value.length;
    const selectionEnd = input.selectionEnd ?? input.value.length;

    setPhotoCommentText((prev) => {
      const safeStart = Math.min(selectionStart, prev.length);
      const safeEnd = Math.min(selectionEnd, prev.length);
      return `${prev.slice(0, safeStart)}${emoji}${prev.slice(safeEnd)}`;
    });

    setPhotoCommentSuggestions([]);

    window.requestAnimationFrame(() => {
      const caretPosition = selectionStart + emoji.length;
      input.focus();
      input.setSelectionRange(caretPosition, caretPosition);
    });
  }, []);

  const openPhotoCommentModal = useCallback((photoIndex: number) => {
    setActivePhotoIndex(photoIndex);
    setIsPhotoModalOpen(true);
    setPhotoCommentText('');
    setPhotoCommentSuggestions([]);
    setCommentsError(null);
    setShowGeneralCommentEmojiPicker(false);
    setShowPhotoCommentEmojiPicker(false);
  }, []);

  const openPhotoReportModal = useCallback((photoUrl: string, photoIndex: number) => {
    const profileLabel = profile?.name || 'User';
    const snapshot = `Niestosowne zdjecie nr ${photoIndex + 1} z profilu ${profileLabel} (${profileId}). URL: ${photoUrl}`;

    setReportModal({
      kind: 'photo-content',
      targetId: null,
      content: snapshot,
      authorId: profileId,
      contextLabel: `Zdjecie ${photoIndex + 1}`,
    });
  }, [profile?.name, profileId]);

  const closePhotoCommentModal = useCallback(() => {
    setIsPhotoModalOpen(false);
    setPhotoCommentSuggestions([]);
    setShowGeneralCommentEmojiPicker(false);
    setShowPhotoCommentEmojiPicker(false);
  }, []);

  const goToPhoto = useCallback((direction: 'prev' | 'next') => {
    if (allPhotos.length < 2) return;
    setActivePhotoIndex((prev) => {
      if (direction === 'prev') {
        return (prev - 1 + allPhotos.length) % allPhotos.length;
      }
      return (prev + 1) % allPhotos.length;
    });
  }, [allPhotos.length]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const viewerProfileId = await resolveCurrentAuthorProfileId();
        const targetProfile = await refreshTargetProfileSnapshot(viewerProfileId);

        if (!targetProfile) {
          setComments([]);
          setPhotoComments([]);
          setReceivedGifts([]);
          return;
        }

        await loadGeneralComments();

        const liked = await hasLikedProfile(profileId);
        setIsLiked(liked);

        const fs = await getFriendshipStatus(profileId);
        setFriendshipStatus(fs.status);
        setFriendshipId(fs.friendshipId);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [getFriendshipStatus, hasLikedProfile, loadGeneralComments, profileId, refreshTargetProfileSnapshot, resolveCurrentAuthorProfileId]);

  useEffect(() => {
    void loadReceivedGifts();
  }, [loadReceivedGifts]);

  useEffect(() => {
    const channel = supabase
      .channel(`profile-detail-gifts-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_interactions',
        },
        (payload) => {
          const rowNew = payload.new as { to_profile_id?: string; kind?: string } | null;
          const rowOld = payload.old as { to_profile_id?: string; kind?: string } | null;
          const affectsProfile = rowNew?.to_profile_id === profileId || rowOld?.to_profile_id === profileId;
          const isGiftRow = rowNew?.kind === 'gift' || rowOld?.kind === 'gift';
          if (!affectsProfile || !isGiftRow) return;
          void loadReceivedGifts();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [loadReceivedGifts, profileId]);

  useEffect(() => {
    const viewerId = viewerProfile?.id || null;
    const observedIds = Array.from(new Set([profileId, viewerId].filter(Boolean))) as string[];
    if (observedIds.length === 0) return;

    const channel = supabase
      .channel(`profile-detail-compat-live-${profileId}-${viewerId || 'guest'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updatedId = (payload.new as { id?: string } | null)?.id;
          if (!updatedId || !observedIds.includes(updatedId)) return;

          void (async () => {
            setCompatibilityLoading(true);
            try {
              if (updatedId === profileId) {
                await refreshTargetProfileSnapshot();
              }
              if (viewerId && updatedId === viewerId) {
                await refreshViewerProfileSnapshot(viewerId);
              }
            } finally {
              setCompatibilityLoading(false);
            }
          })();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profileId, refreshTargetProfileSnapshot, refreshViewerProfileSnapshot, viewerProfile?.id]);

  useEffect(() => {
    if (loggedProfileViewRef.current === profileId) return;

    let cancelled = false;

    const trackProfileView = async () => {
      const viewerProfileId = await resolveCurrentAuthorProfileId();

      if (cancelled) return;

      // Track only real visits to other profiles.
      if (!viewerProfileId || viewerProfileId === profileId) {
        loggedProfileViewRef.current = profileId;
        return;
      }

      const { error } = await supabase
        .from('profile_views')
        .insert({
          viewer_profile_id: viewerProfileId,
          viewed_profile_id: profileId,
        });

      if (error && !error.message.toLowerCase().includes('does not exist')) {
        console.error('Blad zapisu podgladu profilu:', error.message);
      }

      loggedProfileViewRef.current = profileId;
    };

    void trackProfileView();

    return () => {
      cancelled = true;
    };
  }, [profileId, resolveCurrentAuthorProfileId]);

  useEffect(() => {
    let cancelled = false;

    const loadProfileFriends = async () => {
      setFriendsLoading(true);
      try {
        const friends = await getFriendsForProfile(profileId);
        if (cancelled) return;
        setProfileFriends(friends);
        setFriendsExpanded(false);
      } catch (error) {
        console.error('Blad ladowania listy znajomych profilu:', error);
        if (cancelled) return;
        setProfileFriends([]);
      } finally {
        if (!cancelled) {
          setFriendsLoading(false);
        }
      }
    };

    void loadProfileFriends();

    return () => {
      cancelled = true;
    };
  }, [getFriendsForProfile, profileId]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (loading || !profile) return;

    const normalizedCommentsIntent = (deepLinkCommentsParam || '').trim().toLowerCase();
    const hasCommentsIntent =
      normalizedCommentsIntent.length > 0 &&
      normalizedCommentsIntent !== '0' &&
      normalizedCommentsIntent !== 'false' &&
      normalizedCommentsIntent !== 'off';

    if (!deepLinkPhotoParam && !hasCommentsIntent) return;

    const requestedIndex = deepLinkPhotoParam ? Number.parseInt(deepLinkPhotoParam, 10) : 0;
    if (Number.isNaN(requestedIndex) || requestedIndex < 0) return;

    const maxPhotoIndex = allPhotos.length > 0 ? allPhotos.length - 1 : 0;
    const safePhotoIndex = Math.min(requestedIndex, maxPhotoIndex);
    const deepLinkKey = `${profileId}:${safePhotoIndex}`;

    if (deepLinkHandledRef.current === deepLinkKey) return;

    deepLinkHandledRef.current = deepLinkKey;
    openPhotoCommentModal(safePhotoIndex);
  }, [
    allPhotos.length,
    deepLinkCommentsParam,
    deepLinkPhotoParam,
    loading,
    openPhotoCommentModal,
    profile,
    profileId,
  ]);

  useEffect(() => {
    if (!isPhotoModalOpen) return;
    if (activePhotoIndex >= allPhotos.length && allPhotos.length > 0) {
      setActivePhotoIndex(0);
      return;
    }

    void loadPhotoComments(activePhotoIndex);
  }, [activePhotoIndex, allPhotos.length, isPhotoModalOpen, loadPhotoComments]);

  useEffect(() => {
    if (!isPhotoModalOpen) return;

    const focusTimer = window.setTimeout(() => {
      photoCommentInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(focusTimer);
  }, [activePhotoIndex, isPhotoModalOpen]);

  useEffect(() => {
    if (!isClient) return;

    if (isPhotoModalOpen) {
      document.body.classList.add('photo-modal-open');
    } else {
      document.body.classList.remove('photo-modal-open');
    }

    return () => {
      document.body.classList.remove('photo-modal-open');
    };
  }, [isClient, isPhotoModalOpen]);

  if (loading) {
    return (
      <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto animate-pulse">
        <div className="h-12 w-40 rounded-full bg-white/8 mb-8" />
        <div className="grid lg:grid-cols-10 gap-8">
          <aside className="lg:col-span-3 space-y-6">
            <div className="glass rounded-[2rem] h-80 border border-white/10 bg-white/5" />
            <div className="glass rounded-[2rem] h-72 border border-white/10 bg-white/5" />
            <div className="glass rounded-[2rem] h-64 border border-white/10 bg-white/5" />
          </aside>
          <section className="lg:col-span-7 space-y-8">
            <div className="glass rounded-[3rem] aspect-[3/4] md:aspect-[4/5] border border-white/10 bg-white/5" />
            <div className="glass-panel mx-auto h-20 w-full max-w-lg rounded-full border border-white/10 bg-white/5" />
            <div className="glass rounded-[2rem] h-72 border border-white/10 bg-white/5" />
          </section>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="pt-28 text-center text-cyan-400">Profil nie znaleziony</div>;
  }

  const profileRaw = profile as Profile & {
    occupation?: string | null;
    zodiac?: string | null;
    smoking?: string | null;
    drinking?: string | null;
    pets?: string | null;
    children?: string | null;
    sexual_orientation?: string | null;
    looking_for?: string | null;
  };

  const occupationLabel = (profile.details?.occupation || profileRaw.occupation || '').trim();
  const zodiacLabel = (profile.details?.zodiac || profileRaw.zodiac || '').trim();
  const drinkingLabel = (profile.details?.drinking || profileRaw.drinking || '').trim();
  const petsLabel = (profile.details?.pets || profileRaw.pets || '').trim();
  const childrenLabel = (profile.details?.children || profileRaw.children || '').trim();
  const smokingRaw = (profile.details?.smoking || profileRaw.smoking || '').trim();
  const normalizedSmoking = smokingRaw.toLowerCase();
  const smokingLabel =
    normalizedSmoking === 'nie'
      ? 'Nie pali'
      : normalizedSmoking === 'tak'
      ? 'Pali'
      : smokingRaw;

  const rawLookingFor = (profile.details?.looking_for || profileRaw.looking_for || '').trim();
  const normalizedLookingFor = rawLookingFor.toLowerCase();
  const lookingForLabel =
    normalizedLookingFor === 'miłość' || normalizedLookingFor === 'milosc'
      ? 'Miłość'
      : normalizedLookingFor === 'przyjaźń' || normalizedLookingFor === 'przyjazn'
      ? 'Przyjaźń'
      : normalizedLookingFor === 'przygoda'
      ? 'Przygoda'
      : rawLookingFor || 'Nie podano';

  const rawOrientation = (profile.details?.sexual_orientation || profileRaw.sexual_orientation || '').trim();
  const normalizedOrientation = rawOrientation.toLowerCase();
  const orientationLabel =
    normalizedOrientation === 'hetero'
      ? 'Heteroseksualna/y'
      : normalizedOrientation === 'homo'
      ? 'Homoseksualna/y'
      : normalizedOrientation === 'bi'
      ? 'Biseksualna/y'
      : normalizedOrientation === 'pan'
      ? 'Panseksualna/y'
      : normalizedOrientation === 'other'
      ? 'Inna'
      : rawOrientation;

  const genderLabel =
    profile.gender === 'K'
      ? 'Kobieta'
      : profile.gender === 'M'
      ? 'Mężczyzna'
      : '';

  const seekingGenderLabel =
    profile.seeking_gender === 'K'
      ? 'Kobiety'
      : profile.seeking_gender === 'M'
      ? 'Mężczyźni'
      : '';

  const zodiacOption = zodiacLabel
    ? ZODIAC_SIGNS.find((item) => item.value.toLowerCase() === zodiacLabel.toLowerCase())
    : undefined;
  const zodiacDisplayValue = zodiacOption?.value || zodiacLabel;
  const zodiacSymbol = (zodiacOption?.label || zodiacLabel).match(/[\u2648-\u2653]/u)?.[0] || '✦';
  const zodiacColorClass = zodiacOption?.color || 'text-yellow-300';

  const hasSeekingAgeRange = typeof profile.seeking_age_min === 'number' && typeof profile.seeking_age_max === 'number';
  const hasBasicsTraits = Boolean(genderLabel || orientationLabel || occupationLabel || zodiacLabel);
  const hasLifestyleTraits = Boolean(smokingLabel || drinkingLabel || petsLabel || childrenLabel);
  const hasLookingForTraits = Boolean(seekingGenderLabel || hasSeekingAgeRange || rawLookingFor);
  const hasProfileTraits = Boolean(
    occupationLabel ||
    zodiacLabel ||
    smokingLabel ||
    drinkingLabel ||
    petsLabel ||
    childrenLabel ||
    orientationLabel ||
    genderLabel ||
    seekingGenderLabel ||
    rawLookingFor ||
    hasSeekingAgeRange,
  );

  return (
    <>
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto">
      {/* SVG Gradient Definition for Circular Progress */}
      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="magenta-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff00ff" />
            <stop offset="100%" stopColor="#00ffff" />
          </linearGradient>
        </defs>
      </svg>

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="glass rounded-full px-5 py-2 inline-flex items-center gap-2 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all font-medium mb-8 border border-cyan-500/30"
      >
        <ArrowLeft size={20} /> Wróć do odkrywania
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Left Column: Compatibility, Gallery & Comments */}
        <aside className="lg:col-span-5 flex flex-col gap-8">
          {/* Compatibility Widget */}
          <div className="glass rounded-[2rem] p-6 flex items-center gap-5 relative overflow-hidden border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-colors">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-white/80"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="circle-chart__circle"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="url(#magenta-cyan)"
                  strokeWidth="3"
                  strokeDasharray={`${compatibilityLoading ? 18 : compatibility.matchScore}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                {compatibilityLoading ? (
                  <span className="text-sm font-semibold text-cyan-200/80 leading-none animate-pulse">...</span>
                ) : !viewerProfile ? (
                  <span className="text-sm font-semibold text-cyan-200/80 leading-none">--</span>
                ) : (
                  <span className="text-lg font-bold text-white leading-none">
                    {compatibility.matchScore}<span className="text-[10px] text-fuchsia-400">%</span>
                  </span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium text-lg leading-tight">Idealny match</h4>
              <p className="text-xs text-cyan-400 font-light mt-1 flex items-center gap-1">
                <Sparkle size={12} weight="fill" className="text-cyan-400" /> {compatibilityTraitsLabel}
              </p>
              <p className="text-[11px] text-white/45 mt-1">
                {compatibilityLoading
                  ? 'Porownuje zajawki i dane profilowe...'
                  : viewerProfile
                  ? `${compatibility.sharedInterests} wspolnych zajawek`
                  : 'Po zalogowaniu wynik odswieza sie automatycznie.'}
              </p>
            </div>
          </div>

          {/* Gallery */}
          <div className="glass rounded-[2rem] p-6">
            <h3 className="text-base font-medium text-cyan-300/70 tracking-wider uppercase flex items-center gap-2 mb-5">
              <Images size={20} weight="duotone" className="text-cyan-400" /> Galeria
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {allPhotos.length > 0 ? allPhotos.slice(0, 6).map((photo, i) => (
                <div
                  key={`${photo}-${i}`}
                  onClick={() => openPhotoCommentModal(i)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openPhotoCommentModal(i);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`gallery-item relative aspect-square rounded-2xl cursor-pointer overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                >
                  <Image
                    src={photo}
                    alt={`${profile.name} - galeria ${i + 1}`}
                    fill
                    sizes={i === 0 ? DETAIL_GALLERY_FEATURED_SIZES : DETAIL_GALLERY_THUMB_SIZES}
                    quality={70}
                    className="object-cover"
                  />
                  <span className="absolute right-2 bottom-2 w-7 h-7 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-cyan-300">
                    <Quotes size={14} weight="fill" />
                  </span>
                </div>
              )) : (
                <>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`gallery-item aspect-square rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/10 ${i === 0 ? 'col-span-2 row-span-2' : ''}`} />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Friends Preview */}
          <div className="glass rounded-[1.6rem] p-5 border border-white/10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-xs font-medium text-cyan-300/70 tracking-wider uppercase flex items-center gap-2">
                <UserPlus size={16} weight="duotone" className="text-green-400" />
                Znajomi
                <span className="bg-white/10 text-[11px] px-2 py-0.5 rounded-full text-white">
                  {profileFriends.length}
                </span>
              </h3>

              {hasMoreProfileFriends && (
                <button
                  onClick={() => setFriendsExpanded((prev) => !prev)}
                  className="text-xs text-cyan-300/80 hover:text-cyan-200 transition-colors px-2.5 py-1 rounded-full border border-cyan-500/20 hover:border-cyan-400/40"
                >
                  {friendsExpanded ? 'Zwin liste' : 'Zobacz wszystko'}
                </button>
              )}
            </div>

            {friendsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="h-14 rounded-xl bg-white/5 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : profileFriends.length === 0 ? (
              <p className="text-sm text-cyan-400/60">Ten profil nie ma jeszcze dodanych znajomych.</p>
            ) : (
              <>
                <div className={`grid gap-2 ${friendsExpanded ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {visibleProfileFriends.map((friend) => {
                    const friendMeta = [
                      typeof friend.age === 'number' ? `${friend.age} l.` : null,
                      friend.city || null,
                    ].filter(Boolean).join(' • ');

                    return (
                      <button
                        key={friend.id}
                        onClick={() => router.push(`/profile/${encodeURIComponent(friend.id)}`)}
                        className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] hover:border-cyan-500/30 transition-colors text-left"
                      >
                        <Image
                          src={friend.image_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
                          alt={friend.name}
                          width={36}
                          height={36}
                          sizes="36px"
                          quality={64}
                          className="w-9 h-9 rounded-full object-cover border border-white/15 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{friend.name}</p>
                          <p className="text-[11px] text-cyan-300/60 truncate">{friendMeta || 'Profil publiczny'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!friendsExpanded && hasMoreProfileFriends && (
                  <p className="text-xs text-white/45 mt-3">+{profileFriends.length - visibleProfileFriends.length} wiecej</p>
                )}
              </>
            )}
          </div>

          {/* Comments/Tablica */}
          <div className="glass rounded-[2rem] p-6 lg:p-8 flex flex-col relative overflow-hidden bg-[#0a0710]/80 max-h-[500px]">
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-cyan-500/20 shrink-0">
              <button
                onClick={() => generalCommentInputRef.current?.focus()}
                className="text-base font-medium text-cyan-300/70 tracking-wider uppercase flex items-center gap-2 hover:text-cyan-300 transition-colors"
              >
                <Quotes size={20} weight="fill" className="text-cyan-400" /> Tablica
                <span className="bg-white/10 text-sm px-3 py-1 rounded-full ml-1 text-white">{comments.length}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 pl-2">
              {comments.length === 0 ? (
                <div className="text-center text-sm text-cyan-400/70 pt-6">
                  Brak komentarzy. Napisz pierwszy cytat na tablicy.
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[9px] top-3 bottom-3 w-px bg-gradient-to-b from-cyan-400/60 via-cyan-500/25 to-transparent pointer-events-none" />
                  {comments.map((comment) => {
                    const canDelete = canDeleteComment(comment.author_profile_id);
                    const canReport = comment.author_profile_id !== authorProfileId;

                    return (
                    <div key={comment.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {/* Timeline dot */}
                      <div className="shrink-0 mt-2 z-10 pl-[3px]">
                        <div className="w-[11px] h-[11px] rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(0,255,255,0.55)] ring-2 ring-[#0a0710]" />
                      </div>
                      {/* Avatar + content */}
                      <div className="flex gap-3 flex-1">
                        <Image
                          src={comment.author.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
                          alt={comment.author.name}
                          width={32}
                          height={32}
                          sizes="32px"
                          quality={64}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-cyan-500/20 shadow-[0_0_6px_rgba(0,255,255,0.15)]"
                        />
                        <div className="flex-1 bg-white/[0.04] backdrop-blur-sm rounded-2xl rounded-tl-none px-4 py-2.5 border border-white/[0.07]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white leading-none">{comment.author.name}</span>
                            <span className="text-[11px] text-cyan-500/55 leading-none">{formatRelativeTime(comment.created_at)}</span>
                            <span className="text-[10px] text-white/35 leading-none">{formatCommentDateTime(comment.created_at)}</span>
                            {(canDelete || canReport) && (
                              <div className="ml-auto inline-flex items-center gap-2">
                                {canDelete && (
                                  <button
                                    onClick={() => void handleDeleteGeneralComment(comment)}
                                    disabled={deletingWallCommentId === comment.id}
                                    className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-amber-200 disabled:opacity-45 disabled:cursor-not-allowed transition-colors p-0.5 rounded"
                                    title="Usuń komentarz"
                                  >
                                    {deletingWallCommentId === comment.id ? 'Usuwanie...' : 'Usun'}
                                  </button>
                                )}
                                {canReport && (
                                  <button
                                    onClick={() => setReportModal({
                                      kind: 'wall-comment',
                                      targetId: comment.id,
                                      content: comment.content,
                                      authorId: comment.author_profile_id,
                                      contextLabel: 'Komentarz na tablicy',
                                    })}
                                    className="inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-red-300 transition-colors p-0.5 rounded"
                                    title="Zgłoś komentarz"
                                  >
                                    <Flag size={11} weight="regular" /> Zglos
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-[13.5px] text-cyan-200/65 font-light leading-snug">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="pt-5 mt-4 shrink-0 border-t border-cyan-500/20">
              {commentsError && (
                <p className="text-sm text-red-300 mb-3">{commentsError}</p>
              )}
              <div className="relative group border-glow-cyan rounded-full transition-all">
                <EmojiKeywordSuggestions
                  suggestions={generalCommentSuggestions}
                  onSelect={handlePickGeneralCommentSuggestion}
                  className="absolute left-2 right-2 bottom-full mb-2"
                />
                <input
                  ref={generalCommentInputRef}
                  type="text"
                  placeholder="Dodaj komentarz..."
                  value={commentText}
                  onChange={(e) => updateGeneralCommentWithEmojiAssist(e.target.value, e.target.selectionStart)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddGeneralComment();
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setGeneralCommentSuggestions([]), 120);
                  }}
                  className="w-full bg-black/40 border border-cyan-500/20 rounded-full py-3.5 pl-6 pr-24 text-base text-white placeholder-cyan-400/40 outline-none backdrop-blur-md transition-all focus:bg-black/60 focus:border-cyan-500/50 shadow-[inset_0_0_10px_rgba(0,255,255,0.05)]"
                />
                <HoverHintIconButton
                  ref={generalCommentEmojiButtonRef}
                  onClick={() => {
                    setShowPhotoCommentEmojiPicker(false);
                    setShowGeneralCommentEmojiPicker((prev) => !prev);
                  }}
                  tooltip="Wstaw emoji"
                  regularIcon={<Smiley size={18} weight="regular" />}
                  filledIcon={<Smiley size={18} weight="fill" />}
                  variant="cyan"
                  wrapperClassName="absolute right-14 top-1/2 -translate-y-1/2"
                />
                <HoverHintIconButton
                  onClick={() => void handleAddGeneralComment()}
                  disabled={isSubmittingComment || !commentText.trim()}
                  tooltip="Wyślij komentarz"
                  regularIcon={<PaperPlaneTilt size={18} weight="regular" />}
                  filledIcon={<PaperPlaneTilt size={18} weight="fill" />}
                  variant="cyan"
                  wrapperClassName="absolute right-2 top-1/2 -translate-y-1/2"
                />
              </div>
              <EmojiPopover
                open={showGeneralCommentEmojiPicker}
                anchorRef={generalCommentEmojiButtonRef}
                onClose={() => setShowGeneralCommentEmojiPicker(false)}
                onSelect={insertEmojiToGeneralComment}
                searchPlaceholder="Szukaj emoji do komentarza"
              />
            </div>
          </div>
        </aside>

        {/* Right Column: Main Photo, Dock, Bio */}
        <section className="lg:col-span-7 flex flex-col gap-8 relative">
          {/* Main Photo */}
          <div className={`relative w-full aspect-[3/4] md:aspect-[4/5] rounded-[3rem] p-1 bg-gradient-to-br ${isDetailPopular ? 'from-yellow-400/60 via-yellow-300/20 to-yellow-400/60' : 'from-cyan-500/40 via-white/5 to-fuchsia-500/40'} double-glow z-10 group overflow-hidden`}>
            <Image
              src={profile.image_url || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1400&q=80'}
              alt={profile.name}
              fill
              priority
              fetchPriority="high"
              sizes={DETAIL_HERO_IMAGE_SIZES}
              quality={74}
              className="object-cover rounded-[2.8rem] shadow-inner relative z-10 transform transition-transform duration-1000 group-hover:scale-105"
              onClick={() => openPhotoCommentModal(0)}
            />
            <div className="absolute inset-1 bg-gradient-to-t from-[#07050f] via-transparent to-transparent rounded-[2.8rem] z-20 pointer-events-none opacity-90 transition-opacity group-hover:opacity-70"></div>
            {isDetailPopular && (
              <div className="popular-profile-frame popular-profile-frame--detail absolute inset-1 pointer-events-none z-[25]"></div>
            )}

            {/* Float Tags */}
            <div className="absolute top-8 right-8 z-30 flex items-center gap-2.5">
              {isDetailPopular && (
                <FloatingBadgeTooltip content={detailPopularTooltip}>
                  <div className="popular-bolt-badge !w-9 !h-9">
                    <Lightning size={16} weight="fill" className="popular-bolt-icon" />
                  </div>
                </FloatingBadgeTooltip>
              )}
              {profile.isVerified && (
                <FloatingBadgeTooltip content="Profil zweryfikowany">
                  <div className="w-9 h-9 rounded-full border border-cyan-400/50 bg-black/40 backdrop-blur-md inline-flex items-center justify-center cursor-default flex-shrink-0">
                    <SealCheck size={17} weight="fill" className="text-cyan-400" />
                  </div>
                </FloatingBadgeTooltip>
              )}
              {isDetailRecentlyActive && (
                <FloatingBadgeTooltip content="Aktywny teraz (ostatnie 15 min)">
                  <div className="w-9 h-9 rounded-full border border-green-400/50 bg-black/40 backdrop-blur-md inline-flex items-center justify-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </FloatingBadgeTooltip>
              )}
            </div>

            {/* Profile Info at Bottom */}
            <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-30">
                <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white flex items-baseline gap-4 mb-2 drop-shadow-2xl">
                  {profile.name}
                  <span className="text-3xl md:text-5xl text-white font-extralight opacity-80">• {profile.age}</span>
                </h1>
              <p className="text-xl text-cyan-300 font-light mb-6 drop-shadow-lg flex items-center gap-2">
                <HeartStraight size={20} weight="fill" className="text-pink-400" /> Szuka: {lookingForLabel} <MapPin size={18} weight="duotone" className="text-fuchsia-400" /> {profile.city}
              </p>
            </div>
          </div>

          {/* Interaction Dock */}
          <div className="glass-panel mx-auto w-full max-w-lg px-6 py-2 rounded-full flex justify-between items-center border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(255,255,255,0.05)] relative -mt-12 z-40 backdrop-blur-xl">
            <button
              onClick={async () => {
                const nextLikedState = !isLiked;
                setIsLiked(nextLikedState);

                if (nextLikedState) {
                  setLikeBurstTick((prev) => prev + 1);
                  setLikePopTick((prev) => prev + 1);
                }

                try {
                  if (nextLikedState) {
                    await likeProfile(profileId);
                  } else {
                    await unlikeProfile(profileId);
                  }
                } catch (error) {
                  console.error('Blad aktualizacji polubienia profilu:', error);
                  setIsLiked(!nextLikedState);
                }
              }}
              className="cta-dock-btn flex flex-col items-center justify-center gap-1 p-2 group w-16"
            >
              <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-inner relative ${
                isLiked
                  ? 'bg-red-500/20 border-red-500/55'
                  : 'bg-white/10 border-cyan-500/20 group-hover:bg-red-500/20 group-hover:border-red-500/50'
              }`}>
                {isLiked && (
                  <div key={`like-burst-${likeBurstTick}`} className="like-heart-burst" aria-hidden="true">
                    {HEART_BURST_PARTICLES.map((particle, index) => {
                      const style: CSSProperties = {
                        fontSize: `${particle.sizePx}px`,
                        animationDelay: `${particle.delayMs}ms`,
                        ['--burst-x' as string]: `${particle.x}px`,
                        ['--burst-y' as string]: `${particle.y}px`,
                      };

                      return (
                        <span key={`particle-${likeBurstTick}-${index}`} className="like-heart-particle" style={style}>
                          ❤
                        </span>
                      );
                    })}
                  </div>
                )}
                <Heart
                  key={`heart-icon-${likePopTick}-${isLiked ? 'liked' : 'idle'}`}
                  size={20}
                  weight={isLiked ? 'fill' : 'regular'}
                  className={`${isLiked ? 'text-red-500 like-heart-core-pop' : 'text-cyan-400'} group-hover:text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0)] group-hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.8)] transition-all`}
                />
              </div>
              <span className="text-[10px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1">
                Polub
              </span>
            </button>

            <button
              onClick={() => void openGiftModal()}
              title="Wyslij prezent"
              className="cta-dock-btn flex flex-col items-center justify-center gap-1 p-2 group w-16"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:border-amber-500/50 transition-all shadow-inner">
                <Gift size={20} className="text-cyan-400 group-hover:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0)] group-hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] transition-all" />
              </div>
              <span className="text-[10px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1">
                Prezent
              </span>
            </button>

            {/* Friend Request Button */}
            <button
              disabled={friendshipLoading}
              onClick={async () => {
                setFriendshipLoading(true);
                try {
                  if (friendshipStatus === 'none' || friendshipStatus === 'declined') {
                    await sendFriendRequest(profileId);
                    setFriendshipStatus('pending_sent');
                  } else if (friendshipStatus === 'pending_received' && friendshipId) {
                    await acceptFriendRequest(friendshipId);
                    setFriendshipStatus('accepted');
                  } else if (friendshipStatus === 'accepted' && friendshipId) {
                    await removeFriendship(friendshipId);
                    setFriendshipStatus('none');
                    setFriendshipId(null);
                  }
                } catch (err) {
                  console.error('Friendship action error:', err);
                } finally {
                  setFriendshipLoading(false);
                }
              }}
              className="cta-dock-btn flex flex-col items-center justify-center gap-1 p-2 group w-16 disabled:opacity-50"
            >
              <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-inner ${
                friendshipStatus === 'accepted'
                  ? 'bg-green-500/20 border-green-500/50'
                  : friendshipStatus === 'pending_sent'
                  ? 'bg-yellow-500/20 border-yellow-500/50'
                  : friendshipStatus === 'pending_received'
                  ? 'bg-blue-500/20 border-blue-500/50'
                  : 'bg-white/10 border-cyan-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/50'
              }`}>
                {friendshipStatus === 'accepted' ? (
                  <UserCheck size={20} className="text-green-400" />
                ) : friendshipStatus === 'pending_sent' ? (
                  <UserCheck size={20} className="text-yellow-400" />
                ) : friendshipStatus === 'pending_received' ? (
                  <UserPlus size={20} className="text-blue-400" />
                ) : (
                  <UserPlus size={20} className="text-cyan-400 group-hover:text-blue-400 transition-all" />
                )}
              </div>
              <span className="text-[10px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1">
                {friendshipStatus === 'accepted' ? 'Znajomy' :
                 friendshipStatus === 'pending_sent' ? 'Wysłano' :
                 friendshipStatus === 'pending_received' ? 'Akceptuj' : 'Znajomi'}
              </span>
            </button>

            {/* Main CTA Button */}
            <button
              onClick={() => router.push(`/messages?user=${encodeURIComponent(profileId)}`)}
              className="cta-dock-btn flex flex-col items-center justify-center group relative z-50 -mt-14 w-20"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 p-[2px] shadow-[0_10px_30px_rgba(0,255,255,0.4)] group-hover:shadow-[0_10px_40px_rgba(0,255,255,0.6)] transition-all transform group-hover:-translate-y-2">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center border-2 border-[#110a22]">
                  <ChatCircle size={30} weight="fill" className="text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider text-glow-cyan absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity">
                Napisz
              </span>
            </button>

            <button
              onClick={() => openPhotoCommentModal(0)}
              className="cta-dock-btn flex flex-col items-center justify-center gap-1 p-2 group w-16"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all shadow-inner">
                <Quotes size={20} weight="fill" className="text-cyan-400 group-hover:text-cyan-300 drop-shadow-[0_0_8px_rgba(0,255,255,0)] group-hover:drop-shadow-[0_0_12px_rgba(0,255,255,0.8)] transition-all" />
              </div>
              <span className="text-[10px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1">
                Komentarz
              </span>
            </button>
          </div>

          {(giftError || giftNotice) && (
            <div className={`mx-auto w-full max-w-lg rounded-xl border px-4 py-2 text-sm ${
              giftError
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            }`}>
              {giftError || giftNotice}
            </div>
          )}

          {/* Bio Card */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden">
            <h2 className="text-2xl font-light text-white mb-6 flex items-center gap-3">
              O mnie <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
            </h2>

            <div className="border-l-2 border-cyan-400/50 pl-5 mb-8">
              <p className="text-lg leading-relaxed text-white font-light drop-shadow-sm">{profile.bio}</p>
            </div>

            {hasProfileTraits && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Kim jestem</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                  {hasBasicsTraits && (
                    <div className="rounded-2xl border border-cyan-500/25 bg-black/30 backdrop-blur-md p-4">
                      <h4 className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80 mb-3">Podstawowe informacje</h4>
                      <div className="space-y-2.5">
                        {genderLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Płeć</span>
                            <span className="text-white font-medium">{genderLabel}</span>
                          </div>
                        )}
                        {orientationLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Orientacja</span>
                            <span className="text-white font-medium text-right">{orientationLabel}</span>
                          </div>
                        )}
                        {occupationLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Zawód</span>
                            <span className="text-white font-medium text-right">{occupationLabel}</span>
                          </div>
                        )}
                        {zodiacLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Zodiak</span>
                            <span className="text-white font-medium inline-flex items-center gap-1.5">
                              <span className={zodiacColorClass}>{zodiacSymbol}</span>
                              {zodiacDisplayValue}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {hasLifestyleTraits && (
                    <div className="rounded-2xl border border-fuchsia-500/25 bg-black/30 backdrop-blur-md p-4">
                      <h4 className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-300/80 mb-3">Styl życia</h4>
                      <div className="space-y-2.5">
                        {smokingLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Palenie</span>
                            <span className="text-white font-medium text-right">{smokingLabel}</span>
                          </div>
                        )}
                        {drinkingLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Alkohol</span>
                            <span className="text-white font-medium text-right">{drinkingLabel}</span>
                          </div>
                        )}
                        {petsLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Zwierzęta</span>
                            <span className="text-white font-medium text-right">{petsLabel}</span>
                          </div>
                        )}
                        {childrenLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Dzieci</span>
                            <span className="text-white font-medium text-right">{childrenLabel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {hasLookingForTraits && (
                    <div className="rounded-2xl border border-emerald-500/25 bg-black/30 backdrop-blur-md p-4">
                      <h4 className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80 mb-3">Kogo szukam</h4>
                      <div className="space-y-2.5">
                        {seekingGenderLabel && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Płeć partnera</span>
                            <span className="text-white font-medium text-right">{seekingGenderLabel}</span>
                          </div>
                        )}
                        {hasSeekingAgeRange && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Zakres wieku</span>
                            <span className="text-white font-medium text-right">{profile.seeking_age_min} - {profile.seeking_age_max}</span>
                          </div>
                        )}
                        {rawLookingFor && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-white/65">Relacja</span>
                            <span className={`font-medium text-right ${
                              normalizedLookingFor === 'miłość' || normalizedLookingFor === 'milosc'
                                ? 'text-pink-300'
                                : normalizedLookingFor === 'przygoda'
                                ? 'text-cyan-300'
                                : normalizedLookingFor === 'przyjaźń' || normalizedLookingFor === 'przyjazn'
                                ? 'text-blue-300'
                                : 'text-white'
                            }`}>
                              {lookingForLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-widest mb-4">Moje zajawki</h3>

            <div className="flex flex-wrap gap-3">
              {profile.interests?.map((interest) => {
                const interestData = ALL_INTERESTS.find((i) => i.value === interest);
                const IconComponent = interestData?.icon;
                const iconColor = interestData?.color || 'text-fuchsia-400';
                return (
                  <span
                    key={interest}
                    className="px-5 py-2.5 rounded-full border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/10 to-transparent backdrop-blur-md shadow-[0_0_15px_rgba(255,0,255,0.05)] hover:shadow-[0_0_20px_rgba(255,0,255,0.2)] hover:border-fuchsia-400 transition-all cursor-default text-sm tracking-wide text-white flex items-center gap-2"
                  >
                    {IconComponent
                      ? <IconComponent size={16} weight="duotone" className={iconColor} />
                      : <Sparkle size={16} weight="fill" className="text-fuchsia-400" />}
                    {interest}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Received Gifts Widget */}
          <div className="glass rounded-[2rem] p-6 relative z-10 overflow-visible">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-base font-medium text-cyan-300/70 tracking-wider uppercase flex items-center gap-2">
                <Gift size={20} weight="duotone" className="text-amber-400" /> Otrzymane prezenty
              </h3>
              <span className="text-xs text-white/55">{receivedGifts.length}</span>
            </div>

            {receivedGiftsLoading ? (
              <div className="text-sm text-cyan-300/70">Ladowanie prezentow...</div>
            ) : receivedGifts.length === 0 ? (
              <div className="text-sm text-cyan-300/70">Brak otrzymanych prezentow.</div>
            ) : (
              <div className="relative grid grid-cols-4 gap-4 overflow-visible">
                {receivedGifts.map((gift) => {
                  const canModerateGift = canDeleteGift(gift);
                  const deletingThisGift = deletingGiftId === gift.id;

                  return (
                    <div
                      key={gift.id}
                      className="relative z-0 group glass rounded-2xl aspect-square flex items-center justify-center text-4xl cursor-pointer border border-white/5 transition-transform hover:scale-105 hover:z-20 hover:border-amber-500/30"
                    >
                      <span>{gift.emoji}</span>

                      {canModerateGift && (
                        <button
                          onClick={() => void handleDeleteGift(gift)}
                          disabled={deletingThisGift}
                          className="absolute top-1 right-1 z-[80] inline-flex items-center justify-center min-w-6 h-6 rounded-full border border-red-400/40 bg-red-500/15 px-1.5 text-[10px] text-red-100 hover:bg-red-500/25 transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
                          title={isViewerAdmin ? 'Usun prezent (admin)' : 'Usun prezent z niestosownym komentarzem'}
                        >
                          {deletingThisGift ? '...' : 'Usun'}
                        </button>
                      )}

                      <div className="absolute -top-2 left-1/2 z-[70] -translate-x-1/2 -translate-y-full rounded-lg border border-amber-500/20 bg-black/90 px-3 py-2 text-xs whitespace-nowrap text-white opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-md transition-opacity pointer-events-none group-hover:opacity-100">
                        <div className="font-medium">{gift.fromName}</div>
                        <div className="text-amber-400 text-[10px]">{gift.label} • {gift.tokenCost} monet</div>
                        {gift.message && (
                          <div className="text-[10px] text-cyan-200/80 mt-1 max-w-[180px] whitespace-normal">"{gift.message}"</div>
                        )}
                        <div className="text-[10px] text-white/45 mt-1">{formatCommentDateTime(gift.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {isClient && isPhotoModalOpen && createPortal(
        <div
          className="photo-modal-overlay fixed inset-0 z-[220] bg-black/95 backdrop-blur-md transition-opacity duration-300"
          onClick={closePhotoCommentModal}
        >
          <div
            className="photo-modal-shell w-full h-full glass border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="photo-modal-media relative bg-black/45 flex items-center justify-center p-3 md:p-6 lg:p-8">
              <button
                type="button"
                onClick={() => {
                  const activePhotoUrl = allPhotos[activePhotoIndex] || profile.image_url || '';
                  if (!activePhotoUrl) return;
                  openPhotoReportModal(activePhotoUrl, activePhotoIndex);
                }}
                className="absolute top-3 left-3 md:top-4 md:left-4 z-20 w-10 h-10 rounded-full bg-black/60 border border-red-500/35 flex items-center justify-center text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors"
                title="Zglos to zdjecie"
                aria-label="Zglos to zdjecie"
              >
                <Flag size={16} weight="fill" />
              </button>

              <button
                onClick={closePhotoCommentModal}
                className="absolute top-3 right-3 md:top-4 md:right-4 z-20 w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:text-cyan-300 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>

              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => goToPhoto('prev')}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:text-cyan-300 transition-colors"
                  >
                    <CaretLeft size={18} weight="bold" />
                  </button>
                  <button
                    onClick={() => goToPhoto('next')}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:text-cyan-300 transition-colors"
                  >
                    <CaretRight size={18} weight="bold" />
                  </button>
                </>
              )}

              <div className="relative h-full w-full max-h-full max-w-full">
                <Image
                  src={allPhotos[activePhotoIndex] || profile.image_url || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1400&q=80'}
                  alt={`${profile.name} - foto ${activePhotoIndex + 1}`}
                  fill
                  sizes={DETAIL_MODAL_IMAGE_SIZES}
                  quality={76}
                  className="object-contain rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
                  onClick={() => photoCommentInputRef.current?.focus()}
                />
              </div>

              <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-xs text-white">
                Zdjęcie {Math.min(activePhotoIndex + 1, Math.max(allPhotos.length, 1))} / {Math.max(allPhotos.length, 1)}
              </div>
            </div>

            <div className="photo-modal-comments p-4 md:p-6 lg:p-8 flex flex-col bg-[#0a0710]/92">
              <h3 className="text-base font-medium text-cyan-300/80 tracking-wider uppercase flex items-center gap-2 pb-4 border-b border-cyan-500/20">
                <Quotes size={20} weight="fill" className="text-cyan-400" /> Komentarze do zdjęcia
              </h3>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mt-5">
                {photoCommentsLoading ? (
                  <div className="text-sm text-cyan-300/70">Ładowanie komentarzy...</div>
                ) : !photoCommentsTableAvailable ? (
                  <div className="text-sm text-amber-300/80">
                    Funkcja komentarzy zdjęć wymaga migracji SQL (`supabase/migration_photo_comments.sql`).
                  </div>
                ) : photoComments.length === 0 ? (
                  <div className="text-sm text-cyan-300/70">Brak komentarzy do tego zdjęcia. Dodaj pierwszy cytat.</div>
                ) : (
                  photoComments.map((comment) => {
                    const canDelete = canDeleteComment(comment.author_profile_id);
                    const canReport = comment.author_profile_id !== authorProfileId;

                    return (
                    <div key={comment.id} className="flex gap-3">
                      <Image
                        src={comment.author.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
                        alt={comment.author.name}
                        width={32}
                        height={32}
                        sizes="32px"
                        quality={64}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{comment.author.name}</span>
                          <span className="text-cyan-500/60 text-xs">{formatRelativeTime(comment.created_at)}</span>
                          <span className="text-[10px] text-white/35">{formatCommentDateTime(comment.created_at)}</span>
                          {(canDelete || canReport) && (
                            <div className="ml-auto inline-flex items-center gap-2">
                              {canDelete && (
                                <button
                                  onClick={() => void handleDeletePhotoComment(comment)}
                                  disabled={deletingPhotoCommentId === comment.id}
                                  className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-amber-200 disabled:opacity-45 disabled:cursor-not-allowed transition-colors p-0.5 rounded"
                                  title="Usuń komentarz"
                                >
                                  {deletingPhotoCommentId === comment.id ? 'Usuwanie...' : 'Usun'}
                                </button>
                              )}
                              {canReport && (
                                <button
                                  onClick={() => setReportModal({
                                    kind: 'photo-comment',
                                    targetId: comment.id,
                                    content: comment.content,
                                    authorId: comment.author_profile_id,
                                    contextLabel: `Komentarz pod zdjeciem ${activePhotoIndex + 1}`,
                                  })}
                                  className="inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-red-300 transition-colors p-0.5 rounded"
                                  title="Zgłoś komentarz"
                                >
                                  <Flag size={11} weight="regular" /> Zglos
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-cyan-300/80 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>

              {commentsError && (
                <p className="text-sm text-red-300 mt-3">{commentsError}</p>
              )}

              <div className="pt-4 mt-4 border-t border-cyan-500/20">
                <div className="relative border-glow-cyan rounded-full transition-all">
                  <EmojiKeywordSuggestions
                    suggestions={photoCommentSuggestions}
                    onSelect={handlePickPhotoCommentSuggestion}
                    className="absolute left-2 right-2 bottom-full mb-2"
                  />
                  <input
                    ref={photoCommentInputRef}
                    type="text"
                    placeholder="Dodaj komentarz do zdjęcia..."
                    value={photoCommentText}
                    onChange={(e) => updatePhotoCommentWithEmojiAssist(e.target.value, e.target.selectionStart)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddPhotoComment();
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setPhotoCommentSuggestions([]), 120);
                    }}
                    disabled={!photoCommentsTableAvailable}
                    className="w-full bg-black/40 border border-cyan-500/20 rounded-full py-3 pl-5 pr-20 text-sm text-white placeholder-cyan-400/40 outline-none focus:border-cyan-500/50 transition-all disabled:opacity-50"
                  />
                  <HoverHintIconButton
                    ref={photoCommentEmojiButtonRef}
                    onClick={() => {
                      setShowGeneralCommentEmojiPicker(false);
                      setShowPhotoCommentEmojiPicker((prev) => !prev);
                    }}
                    disabled={!photoCommentsTableAvailable}
                    tooltip="Wstaw emoji"
                    regularIcon={<Smiley size={16} weight="regular" />}
                    filledIcon={<Smiley size={16} weight="fill" />}
                    variant="cyan"
                    size="sm"
                    wrapperClassName="absolute right-10 top-1/2 -translate-y-1/2"
                  />
                  <HoverHintIconButton
                    onClick={() => void handleAddPhotoComment()}
                    disabled={isSubmittingPhotoComment || !photoCommentText.trim() || !photoCommentsTableAvailable}
                    tooltip="Wyślij komentarz"
                    regularIcon={<PaperPlaneTilt size={16} weight="regular" />}
                    filledIcon={<PaperPlaneTilt size={16} weight="fill" />}
                    variant="cyan"
                    size="sm"
                    wrapperClassName="absolute right-2 top-1/2 -translate-y-1/2"
                  />
                </div>
                <EmojiPopover
                  open={showPhotoCommentEmojiPicker}
                  anchorRef={photoCommentEmojiButtonRef}
                  onClose={() => setShowPhotoCommentEmojiPicker(false)}
                  onSelect={insertEmojiToPhotoComment}
                  searchPlaceholder="Szukaj emoji do komentarza zdjęcia"
                />
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>

    <GiftModal
      isOpen={isGiftModalOpen}
      onClose={() => {
        if (giftSending) return;
        setIsGiftModalOpen(false);
      }}
      onSend={handleSendGiftInteraction}
      recipientName={profile.name}
      currentBalance={giftBalance}
      sending={giftSending}
      errorMessage={giftError}
      onTopUp={() => {
        setIsGiftModalOpen(false);
        router.push('/wallet');
      }}
    />

    {/* Report Comment Modal */}
    {reportModal && (
      <ReportCommentModal
        open={true}
        onClose={() => setReportModal(null)}
        reportKind={reportModal.kind}
        targetId={reportModal.targetId}
        targetContent={reportModal.content}
        targetAuthorId={reportModal.authorId}
        contextLabel={reportModal.contextLabel}
        reporterProfileId={authorProfileId}
      />
    )}
    </>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type NotificationKind = 'gift' | 'like' | 'poke' | 'verification' | 'comment' | 'friend_request' | 'profile_view';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  friendshipId?: string;
  actorName?: string;
  actorImageUrl?: string;
  actorProfileId?: string;
  message: string;
  createdAt: string;
  href: string;
};

const DISMISSED_STORAGE_PREFIX = 'zl_notifications_dismissed';
const DISMISSED_SYNC_EVENT = 'zl:notifications-dismissed-sync';
const DISMISSED_IDS_LIMIT = 500;

type UseNotificationsOptions = {
  userId: string | null;
  targetProfileIds?: string[];
  isAdmin?: boolean;
  profileIsVerified?: boolean;
  profileCreatedAt?: string | null;
  autoLoad?: boolean;
};

function buildProfileHref(profileId?: string, fallbackHref = '/notifications'): string {
  return profileId ? `/profile/${encodeURIComponent(profileId)}` : fallbackHref;
}

function buildPhotoCommentHref(
  profileId?: string,
  photoIndex?: number | null,
  fallbackHref = '/notifications',
): string {
  const profileHref = buildProfileHref(profileId, fallbackHref);

  if (typeof photoIndex !== 'number' || Number.isNaN(photoIndex) || photoIndex < 0) {
    return profileHref;
  }

  const safePhotoIndex = Math.floor(photoIndex);
  return `${profileHref}?photo=${safePhotoIndex}&comments=1`;
}

export function notificationTimestamp(value?: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

export function formatNotificationTime(timestamp: string): string {
  const ts = notificationTimestamp(timestamp);
  if (!ts) return 'Przed chwila';

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

export function useNotifications({
  userId,
  targetProfileIds,
  isAdmin = false,
  profileIsVerified = false,
  profileCreatedAt = null,
  autoLoad = true,
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dismissedIdsRef = useRef<Set<string>>(new Set());

  const profileTargets = useMemo(() => {
    const candidates = [
      ...(targetProfileIds ?? []),
      userId,
    ].filter(Boolean) as string[];

    return Array.from(new Set(candidates));
  }, [targetProfileIds, userId]);

  const dismissedStorageKey = useMemo(() => {
    if (userId) return `${DISMISSED_STORAGE_PREFIX}:${userId}`;
    if (profileTargets.length > 0) {
      return `${DISMISSED_STORAGE_PREFIX}:${profileTargets.join('|')}`;
    }
    return null;
  }, [profileTargets, userId]);

  const persistDismissedIds = useCallback((next: Set<string>) => {
    if (typeof window === 'undefined' || !dismissedStorageKey) return;

    const serialized = Array.from(next).slice(-DISMISSED_IDS_LIMIT);
    window.localStorage.setItem(dismissedStorageKey, JSON.stringify(serialized));
    window.dispatchEvent(
      new CustomEvent(DISMISSED_SYNC_EVENT, {
        detail: {
          key: dismissedStorageKey,
          ids: serialized,
        },
      }),
    );
  }, [dismissedStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!dismissedStorageKey) {
      setDismissedIds(new Set());
      return;
    }

    const raw = window.localStorage.getItem(dismissedStorageKey);
    if (!raw) {
      setDismissedIds(new Set());
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.filter((value): value is string => typeof value === 'string');
        setDismissedIds(new Set(normalized));
      } else {
        setDismissedIds(new Set());
      }
    } catch {
      setDismissedIds(new Set());
    }
  }, [dismissedStorageKey]);

  useEffect(() => {
    dismissedIdsRef.current = dismissedIds;
    setNotifications((prev) => prev.filter((item) => !dismissedIds.has(item.id)));
  }, [dismissedIds]);

  useEffect(() => {
    if (typeof window === 'undefined' || !dismissedStorageKey) return;

    const handleDismissedSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string; ids?: string[] }>;
      if (customEvent.detail?.key !== dismissedStorageKey) return;
      if (!Array.isArray(customEvent.detail?.ids)) return;

      const ids = customEvent.detail.ids.filter((value): value is string => typeof value === 'string');
      setDismissedIds(new Set(ids));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== dismissedStorageKey) return;

      if (!event.newValue) {
        setDismissedIds(new Set());
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue);
        if (!Array.isArray(parsed)) return;
        const ids = parsed.filter((value): value is string => typeof value === 'string');
        setDismissedIds(new Set(ids));
      } catch {
        setDismissedIds(new Set());
      }
    };

    window.addEventListener(DISMISSED_SYNC_EVENT, handleDismissedSync as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(DISMISSED_SYNC_EVENT, handleDismissedSync as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [dismissedStorageKey]);

  const dismissNotification = useCallback((notificationId: string) => {
    if (!notificationId) return;

    setDismissedIds((prev) => {
      if (prev.has(notificationId)) return prev;

      const next = new Set(prev);
      next.add(notificationId);
      persistDismissedIds(next);
      return next;
    });

    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
  }, [persistDismissedIds]);

  const refresh = useCallback(async () => {
    if (profileTargets.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [likesRes, interactionsRes, commentsRes, photoCommentsRes, friendRequestsRes, profileViewsRes] = await Promise.all([
        supabase
          .from('likes')
          .select('id, from_profile_id, created_at')
          .in('to_profile_id', profileTargets)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profile_interactions')
          .select('id, from_profile_id, kind, label, emoji, created_at')
          .in('to_profile_id', profileTargets)
          .in('kind', ['gift', 'poke'])
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profile_comments')
          .select('id, author_profile_id, content, created_at')
          .in('profile_id', profileTargets)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profile_photo_comments')
          .select('id, profile_id, photo_index, author_profile_id, content, created_at')
          .in('profile_id', profileTargets)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('friendships')
          .select('id, requester_id, created_at')
          .in('addressee_id', profileTargets)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('profile_views')
          .select('id, viewer_profile_id, created_at')
          .in('viewed_profile_id', profileTargets)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (likesRes.error) {
        console.error('Blad ladowania polubien do powiadomien:', likesRes.error.message);
      }

      if (
        interactionsRes.error &&
        !interactionsRes.error.message.toLowerCase().includes('does not exist')
      ) {
        console.error('Blad ladowania zaczepien/prezentow do powiadomien:', interactionsRes.error.message);
      }

      if (
        commentsRes.error &&
        !commentsRes.error.message.toLowerCase().includes('does not exist')
      ) {
        console.error('Blad ladowania komentarzy do powiadomien:', commentsRes.error.message);
      }

      if (
        photoCommentsRes.error &&
        !photoCommentsRes.error.message.toLowerCase().includes('does not exist')
      ) {
        console.error('Blad ladowania komentarzy do zdjec w powiadomieniach:', photoCommentsRes.error.message);
      }

      if (
        friendRequestsRes.error &&
        !friendRequestsRes.error.message.toLowerCase().includes('does not exist')
      ) {
        console.error('Blad ladowania zaproszen znajomych do powiadomien:', friendRequestsRes.error.message);
      }

      if (
        profileViewsRes.error &&
        !profileViewsRes.error.message.toLowerCase().includes('does not exist')
      ) {
        console.error('Blad ladowania odwiedzin profilu do powiadomien:', profileViewsRes.error.message);
      }

      type LikeRow = { id: string; from_profile_id: string; created_at: string };
      type InteractionRow = {
        id: string;
        from_profile_id: string;
        kind: 'gift' | 'poke' | 'emote';
        label?: string | null;
        emoji?: string | null;
        created_at: string;
      };
      type CommentRow = {
        id: string;
        author_profile_id: string;
        content: string;
        created_at: string;
      };
      type PhotoCommentRow = {
        id: string;
        profile_id: string;
        photo_index: number;
        author_profile_id: string;
        content: string;
        created_at: string;
      };
      type FriendRequestRow = {
        id: string;
        requester_id: string;
        created_at: string;
      };
      type ProfileViewRow = {
        id: string;
        viewer_profile_id: string;
        created_at: string;
      };
      const likes = (likesRes.data as LikeRow[] | null) ?? [];
      const interactions = interactionsRes.error
        ? []
        : ((interactionsRes.data as InteractionRow[] | null) ?? []);
      const comments = commentsRes.error
        ? []
        : (((commentsRes.data as CommentRow[] | null) ?? []).filter(
            (row) => !profileTargets.includes(row.author_profile_id),
          ));
      const photoComments = photoCommentsRes.error
        ? []
        : (((photoCommentsRes.data as PhotoCommentRow[] | null) ?? []).filter(
            (row) => !profileTargets.includes(row.author_profile_id),
          ));
      const friendRequests = friendRequestsRes.error
        ? []
        : ((friendRequestsRes.data as FriendRequestRow[] | null) ?? []);
      const profileViews = profileViewsRes.error
        ? []
        : (((profileViewsRes.data as ProfileViewRow[] | null) ?? []).filter(
            (row) => !profileTargets.includes(row.viewer_profile_id),
          ));

      const actorIds = Array.from(
        new Set([
          ...likes.map((row) => row.from_profile_id),
          ...interactions.map((row) => row.from_profile_id),
          ...comments.map((row) => row.author_profile_id),
          ...photoComments.map((row) => row.author_profile_id),
          ...friendRequests.map((row) => row.requester_id),
          ...profileViews.map((row) => row.viewer_profile_id),
        ]),
      );

      const actorMap = new Map<string, { name?: string | null; image_url?: string | null }>();

      if (actorIds.length > 0) {
        const { data: actors, error: actorsError } = await supabase
          .from('profiles')
          .select('id, name, image_url')
          .in('id', actorIds);

        if (actorsError) {
          console.error('Blad ladowania autorow powiadomien:', actorsError.message);
        } else {
          for (const actor of actors ?? []) {
            actorMap.set(actor.id as string, {
              name: (actor as { name?: string | null }).name,
              image_url: (actor as { image_url?: string | null }).image_url,
            });
          }
        }
      }

      const nextNotifications: NotificationItem[] = [];

      for (const like of likes) {
        const actor = actorMap.get(like.from_profile_id);
        const actorName = actor?.name || 'Ktos';

        nextNotifications.push({
          id: `like-${like.id}`,
          kind: 'like',
          actorName,
          actorImageUrl: actor?.image_url || undefined,
          actorProfileId: like.from_profile_id,
          message: `${actorName} polubil Twoj profil. Sprawdz, czy to match!`,
          createdAt: like.created_at,
          href: '/friends?tab=favorites',
        });
      }

      for (const interaction of interactions) {
        const actor = actorMap.get(interaction.from_profile_id);
        const actorName = actor?.name || 'Ktos';

        if (interaction.kind === 'gift') {
          const giftLabel = interaction.label ? ` (${interaction.label})` : '';
          const giftEmoji = interaction.emoji ? ` ${interaction.emoji}` : '';

          nextNotifications.push({
            id: `gift-${interaction.id}`,
            kind: 'gift',
            actorName,
            actorImageUrl: actor?.image_url || undefined,
            actorProfileId: interaction.from_profile_id,
            message: `${actorName} wyslal Ci prezent${giftLabel}!${giftEmoji}`,
            createdAt: interaction.created_at,
            href: buildProfileHref(interaction.from_profile_id),
          });
        }

        if (interaction.kind === 'poke') {
          nextNotifications.push({
            id: `poke-${interaction.id}`,
            kind: 'poke',
            actorName,
            actorImageUrl: actor?.image_url || undefined,
            actorProfileId: interaction.from_profile_id,
            message: `${actorName} zaczepil Cie. Odpowiesz?`,
            createdAt: interaction.created_at,
            href: buildProfileHref(interaction.from_profile_id),
          });
        }
      }

      for (const comment of comments) {
        const actor = actorMap.get(comment.author_profile_id);
        const actorName = actor?.name || 'Ktos';
        const snippet = comment.content.length > 90
          ? `${comment.content.slice(0, 90)}...`
          : comment.content;

        nextNotifications.push({
          id: `comment-${comment.id}`,
          kind: 'comment',
          actorName,
          actorImageUrl: actor?.image_url || undefined,
          actorProfileId: comment.author_profile_id,
          message: `${actorName} skomentowal Twoj profil: "${snippet}"`,
          createdAt: comment.created_at,
          href: isAdmin ? '/notifications' : '/myprofile',
        });
      }

      for (const comment of photoComments) {
        const actor = actorMap.get(comment.author_profile_id);
        const actorName = actor?.name || 'Ktos';
        const snippet = comment.content.length > 90
          ? `${comment.content.slice(0, 90)}...`
          : comment.content;
        const photoCommentFallbackHref = isAdmin ? '/notifications' : '/myprofile';

        nextNotifications.push({
          id: `photo-comment-${comment.id}`,
          kind: 'comment',
          actorName,
          actorImageUrl: actor?.image_url || undefined,
          actorProfileId: comment.author_profile_id,
          message: `${actorName} skomentowal Twoje zdjecie: "${snippet}"`,
          createdAt: comment.created_at,
          href: buildPhotoCommentHref(comment.profile_id, comment.photo_index, photoCommentFallbackHref),
        });
      }

      for (const req of friendRequests) {
        const actor = actorMap.get(req.requester_id);
        const actorName = actor?.name || 'Ktos';

        nextNotifications.push({
          id: `friend_request-${req.id}`,
          kind: 'friend_request',
          friendshipId: req.id,
          actorName,
          actorImageUrl: actor?.image_url || undefined,
          actorProfileId: req.requester_id,
          message: `${actorName} wyslal Ci zaproszenie do znajomych!`,
          createdAt: req.created_at,
          href: buildProfileHref(req.requester_id),
        });
      }

      for (const view of profileViews) {
        const actor = actorMap.get(view.viewer_profile_id);
        const actorName = actor?.name || 'Ktos';

        nextNotifications.push({
          id: `profile-view-${view.id}`,
          kind: 'profile_view',
          actorName,
          actorImageUrl: actor?.image_url || undefined,
          actorProfileId: view.viewer_profile_id,
          message: `${actorName} odwiedzil Twoj profil.`,
          createdAt: view.created_at,
          href: buildProfileHref(view.viewer_profile_id),
        });
      }

      if (profileIsVerified) {
        nextNotifications.push({
          id: `verification-${userId}`,
          kind: 'verification',
          message: 'Twoj profil zostal pomyslnie zweryfikowany.',
          createdAt: profileCreatedAt || new Date().toISOString(),
          href: isAdmin ? '/notifications' : '/myprofile',
        });
      }

      nextNotifications.sort((a, b) => notificationTimestamp(b.createdAt) - notificationTimestamp(a.createdAt));
      const visibleNotifications = nextNotifications
        .filter((item) => !dismissedIdsRef.current.has(item.id))
        .slice(0, 40);

      setNotifications(visibleNotifications);
    } catch (error) {
      console.error('Blad ladowania centrum powiadomien:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, profileCreatedAt, profileIsVerified, profileTargets, userId]);

  useEffect(() => {
    if (!autoLoad) return;
    void refresh();
  }, [autoLoad, refresh]);

  return {
    notifications,
    loading,
    refresh,
    dismissNotification,
  };
}
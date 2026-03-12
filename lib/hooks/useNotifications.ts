'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type NotificationKind = 'gift' | 'like' | 'poke' | 'verification' | 'comment';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  actorName?: string;
  actorImageUrl?: string;
  actorProfileId?: string;
  message: string;
  createdAt: string;
  href: string;
};

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

  const profileTargets = useMemo(() => {
    const candidates = [
      ...(targetProfileIds ?? []),
      userId,
    ].filter(Boolean) as string[];

    return Array.from(new Set(candidates));
  }, [targetProfileIds, userId]);

  const refresh = useCallback(async () => {
    if (profileTargets.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [likesRes, interactionsRes, commentsRes] = await Promise.all([
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

      const likes = (likesRes.data as LikeRow[] | null) ?? [];
      const interactions = interactionsRes.error
        ? []
        : ((interactionsRes.data as InteractionRow[] | null) ?? []);
      const comments = commentsRes.error
        ? []
        : (((commentsRes.data as CommentRow[] | null) ?? []).filter(
            (row) => !profileTargets.includes(row.author_profile_id),
          ));

      const actorIds = Array.from(
        new Set([
          ...likes.map((row) => row.from_profile_id),
          ...interactions.map((row) => row.from_profile_id),
          ...comments.map((row) => row.author_profile_id),
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
          href: buildProfileHref(like.from_profile_id),
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
      setNotifications(nextNotifications.slice(0, 40));
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
  };
}
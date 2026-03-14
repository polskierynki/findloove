'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Bell, Check, Eye, Gift, Heart, MessageCircle, RefreshCw, Trash2, UserPlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { resolveProfileIdForAuthUser } from '@/lib/profileAuth';
import { formatNotificationTime, NotificationItem, useNotifications } from '@/lib/hooks/useNotifications';
import { useFriends } from '@/lib/hooks/useFriends';

type NotificationProfile = {
  role?: string | null;
  is_verified?: boolean | null;
  created_at?: string | null;
};

interface NewNotificationsViewProps {
  isAdmin?: boolean;
}

const NOTIFICATION_AVATAR_SIZES = '44px';

export default function NewNotificationsView({ isAdmin: isAdminFromApp = false }: NewNotificationsViewProps) {
  const router = useRouter();
  const adminEmail = 'lio1985lodz@gmail.com';
  const { acceptFriendRequest, removeFriendship } = useFriends();
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<NotificationProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [friendActionBusyKey, setFriendActionBusyKey] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        setUserId(user?.id || null);
        setUserEmail(user?.email?.trim().toLowerCase() || null);

        if (user?.id) {
          const resolvedProfileId = await resolveProfileIdForAuthUser(user);
          setProfileId(resolvedProfileId);

          const { data } = await supabase
            .from('profiles')
            .select('role, is_verified, created_at')
            .eq('id', resolvedProfileId || user.id)
            .maybeSingle();

          setProfile((data as NotificationProfile | null) ?? null);
        } else {
          setProfileId(null);
          setProfile(null);
        }
      } finally {
        setAuthLoading(false);
      }
    };

    void loadUser();
  }, []);

  const isAdmin =
    isAdminFromApp ||
    userEmail === adminEmail ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin';

  const notificationTargets = useMemo(
    () => Array.from(new Set([userId, profileId].filter(Boolean))) as string[],
    [profileId, userId],
  );

  const { notifications, loading, refresh, dismissNotification } = useNotifications({
    userId,
    targetProfileIds: notificationTargets,
    isAdmin,
    profileIsVerified: Boolean(profile?.is_verified),
    profileCreatedAt: profile?.created_at ?? null,
  });

  const openInviterProfile = (notification: NotificationItem) => {
    if (!notification.actorProfileId) return;
    router.push(`/profile/${encodeURIComponent(notification.actorProfileId)}`);
  };

  const handleAcceptFriendRequest = async (notification: NotificationItem) => {
    if (!notification.friendshipId) return;

    const busyKey = `accept-${notification.id}`;
    setFriendActionBusyKey(busyKey);

    try {
      await acceptFriendRequest(notification.friendshipId);
      dismissNotification(notification.id);
      await refresh();
    } catch (error) {
      console.error('Blad akceptacji zaproszenia:', error);
    } finally {
      setFriendActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  };

  const handleRejectFriendRequest = async (notification: NotificationItem) => {
    if (!notification.friendshipId) return;

    const busyKey = `reject-${notification.id}`;
    setFriendActionBusyKey(busyKey);

    try {
      await removeFriendship(notification.friendshipId);
      dismissNotification(notification.id);
      await refresh();
    } catch (error) {
      console.error('Blad odrzucenia zaproszenia:', error);
    } finally {
      setFriendActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  };

  const counters = useMemo(() => {
    return notifications.reduce(
      (acc, item) => {
        acc[item.kind] += 1;
        return acc;
      },
      {
        gift: 0,
        like: 0,
        poke: 0,
        verification: 0,
        comment: 0,
        friend_request: 0,
        profile_view: 0,
      } as Record<'gift' | 'like' | 'poke' | 'verification' | 'comment' | 'friend_request' | 'profile_view', number>,
    );
  }, [notifications]);

  useEffect(() => {
    if (!userId) return;

    void refresh();

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void refresh();
      }
    }, 25000);

    return () => window.clearInterval(interval);
  }, [refresh, userId]);

  useEffect(() => {
    if (!userId || notificationTargets.length === 0) return;

    const channel = supabase
      .channel(`notifications-center-live-${notificationTargets.join('_')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'likes',
      }, (payload) => {
        const row = payload.new as { to_profile_id?: string };
        if (!row.to_profile_id || !notificationTargets.includes(row.to_profile_id)) return;
        void refresh();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profile_interactions',
      }, (payload) => {
        const row = payload.new as { to_profile_id?: string };
        if (!row.to_profile_id || !notificationTargets.includes(row.to_profile_id)) return;
        void refresh();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profile_comments',
      }, (payload) => {
        const row = payload.new as { profile_id?: string };
        if (!row.profile_id || !notificationTargets.includes(row.profile_id)) return;
        void refresh();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profile_photo_comments',
      }, (payload) => {
        const row = payload.new as { profile_id?: string };
        if (!row.profile_id || !notificationTargets.includes(row.profile_id)) return;
        void refresh();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friendships',
      }, (payload) => {
        const row = payload.new as { addressee_id?: string; status?: string };
        if (!row.addressee_id || !notificationTargets.includes(row.addressee_id) || row.status !== 'pending') return;
        void refresh();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'friendships',
      }, (payload) => {
        const row = payload.new as { addressee_id?: string };
        const previous = payload.old as { addressee_id?: string };
        const targetId = row.addressee_id || previous.addressee_id;
        if (!targetId || !notificationTargets.includes(targetId)) return;
        void refresh();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'friendships',
      }, (payload) => {
        const row = payload.old as { addressee_id?: string };
        if (!row.addressee_id || !notificationTargets.includes(row.addressee_id)) return;
        void refresh();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profile_views',
      }, (payload) => {
        const row = payload.new as { viewed_profile_id?: string };
        if (!row.viewed_profile_id || !notificationTargets.includes(row.viewed_profile_id)) return;
        void refresh();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [notificationTargets, refresh, userId]);

  if (authLoading) {
    return (
      <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[1600px] mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="h-10 w-32 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-3">
              <div className="h-10 w-72 max-w-full rounded-full bg-white/10 animate-pulse" />
              <div className="h-4 w-[32rem] max-w-full rounded-full bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="h-12 w-32 rounded-full bg-white/10 animate-pulse" />
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="glass rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="h-3 w-20 rounded-full bg-white/10 animate-pulse" />
              <div className="h-8 w-12 rounded-full bg-white/5 animate-pulse" />
            </div>
          ))}
        </section>

        <section className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
          <div className="p-5 border-b border-white/10 bg-black/20 flex items-center justify-between gap-4">
            <div className="h-6 w-48 rounded-full bg-white/10 animate-pulse" />
            <div className="h-4 w-16 rounded-full bg-white/5 animate-pulse" />
          </div>
          <div className="p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="h-11 w-11 shrink-0 rounded-full bg-white/10 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-4/5 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[1400px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center space-y-5 border border-white/10">
          <Bell size={48} className="mx-auto text-fuchsia-400" />
          <h1 className="text-3xl font-light text-white">Zaloguj się, aby zobaczyć powiadomienia</h1>
          <p className="text-white/70">Centrum powiadomień działa tylko dla zalogowanych użytkowników.</p>
          <button
            onClick={() => router.push('/auth')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-6 py-3 rounded-full text-white font-medium hover:from-fuchsia-500 hover:to-cyan-500 transition-all"
          >
            Przejdź do logowania
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[1600px] mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="glass rounded-full px-5 py-2 inline-flex items-center gap-2 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all font-medium border border-cyan-500/30"
          >
            <ArrowLeft size={18} /> Wróć
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-light text-white flex items-center gap-3">
              <Bell size={34} className="text-fuchsia-400" /> Centrum powiadomień
            </h1>
            <p className="text-cyan-300/70 mt-2">W jednym miejscu zobaczysz polubienia, prezenty, zaczepienia, komentarze, zaproszenia znajomych i status weryfikacji.</p>
          </div>
        </div>

        <button
          onClick={() => void refresh()}
          className="inline-flex items-center justify-center gap-2 glass rounded-full px-5 py-3 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
        >
          <RefreshCw size={16} /> Odśwież
        </button>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="glass rounded-2xl p-4 border border-red-500/20">
          <div className="text-xs uppercase tracking-wider text-red-300/70">Polubienia</div>
          <div className="text-3xl text-white mt-2">{counters.like}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-amber-500/20">
          <div className="text-xs uppercase tracking-wider text-amber-300/70">Prezenty</div>
          <div className="text-3xl text-white mt-2">{counters.gift}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-cyan-500/20">
          <div className="text-xs uppercase tracking-wider text-cyan-300/70">Zaczepki</div>
          <div className="text-3xl text-white mt-2">{counters.poke}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-blue-500/20">
          <div className="text-xs uppercase tracking-wider text-blue-300/70">Weryfikacja</div>
          <div className="text-3xl text-white mt-2">{counters.verification}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-white/10">
          <div className="text-xs uppercase tracking-wider text-white/60">Komentarze</div>
          <div className="text-3xl text-white mt-2">{counters.comment}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-green-500/20">
          <div className="text-xs uppercase tracking-wider text-green-300/70">Znajomi</div>
          <div className="text-3xl text-white mt-2">{counters.friend_request}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-indigo-500/20">
          <div className="text-xs uppercase tracking-wider text-indigo-300/70">Odwiedziny</div>
          <div className="text-3xl text-white mt-2">{counters.profile_view}</div>
        </div>
      </section>

      <section className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="p-5 border-b border-white/10 bg-black/20 flex items-center justify-between gap-4">
          <h2 className="text-white font-medium text-xl">Wszystkie powiadomienia</h2>
          <span className="text-sm text-cyan-300/70">{notifications.length} wpisów</span>
        </div>

        <div className="max-h-[900px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="h-11 w-11 shrink-0 rounded-full bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-4/5 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center text-white/60">Brak powiadomień.</div>
          ) : (
            notifications.map((notification, idx) => {
              const isLast = idx === notifications.length - 1;

              return (
                <div
                  key={notification.id}
                  onClick={() => router.push(notification.href)}
                  className={`p-5 ${isLast ? '' : 'border-b border-white/5'} hover:bg-white/5 transition-colors cursor-pointer flex gap-4 items-start`}
                >
                  {notification.kind === 'gift' && (
                    <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      <Gift size={20} className="text-amber-400" />
                    </div>
                  )}

                  {notification.kind === 'like' && (
                    <div className="w-11 h-11 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                      <Heart size={20} className="text-red-500 fill-red-500" />
                    </div>
                  )}

                  {notification.kind === 'verification' && (
                    <div className="w-11 h-11 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      <BadgeCheck size={20} className="text-blue-400" />
                    </div>
                  )}

                  {notification.kind === 'poke' && (
                    <div className="w-11 h-11 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                      <MessageCircle size={20} className="text-cyan-300" />
                    </div>
                  )}

                  {notification.kind === 'comment' && notification.actorImageUrl && (
                    <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <Image
                        src={notification.actorImageUrl}
                        alt={notification.actorName || 'Komentarz'}
                        fill
                        sizes={NOTIFICATION_AVATAR_SIZES}
                        className="object-cover"
                      />
                    </div>
                  )}

                  {notification.kind === 'comment' && !notification.actorImageUrl && (
                    <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                      <MessageCircle size={18} className="text-cyan-300" />
                    </div>
                  )}

                  {notification.kind === 'friend_request' && notification.actorImageUrl && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openInviterProfile(notification);
                      }}
                      title="Zobacz profil osoby zapraszajacej"
                      className="relative h-11 w-11 shrink-0 rounded-full overflow-hidden"
                    >
                      <Image
                        src={notification.actorImageUrl}
                        alt={notification.actorName || 'Zaproszenie'}
                        fill
                        sizes={NOTIFICATION_AVATAR_SIZES}
                        className="rounded-full border border-green-500/30 object-cover shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                      />
                    </button>
                  )}

                  {notification.kind === 'friend_request' && !notification.actorImageUrl && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openInviterProfile(notification);
                      }}
                      title="Zobacz profil osoby zapraszajacej"
                      className="w-11 h-11 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                    >
                      <UserPlus size={20} className="text-green-400" />
                    </button>
                  )}

                  {notification.kind === 'profile_view' && notification.actorImageUrl && (
                    <div className="relative w-11 h-11 rounded-full overflow-hidden border border-indigo-500/30 shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                      <Image
                        src={notification.actorImageUrl}
                        alt={notification.actorName || 'Odwiedziny profilu'}
                        fill
                        sizes={NOTIFICATION_AVATAR_SIZES}
                        className="object-cover"
                      />
                    </div>
                  )}

                  {notification.kind === 'profile_view' && !notification.actorImageUrl && (
                    <div className="w-11 h-11 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                      <Eye size={20} className="text-indigo-300" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white leading-relaxed">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">{formatNotificationTime(notification.createdAt)}</p>
                      </div>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        title="Usuń to powiadomienie"
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-red-500/35 hover:bg-red-500/10 flex items-center justify-center text-white/40 hover:text-red-300 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {notification.kind === 'friend_request' && notification.friendshipId && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleAcceptFriendRequest(notification);
                          }}
                          disabled={friendActionBusyKey === `accept-${notification.id}` || friendActionBusyKey === `reject-${notification.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/20 px-3 py-1.5 text-xs text-green-200 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Check size={13} /> Akceptuj
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRejectFriendRequest(notification);
                          }}
                          disabled={friendActionBusyKey === `accept-${notification.id}` || friendActionBusyKey === `reject-${notification.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:text-red-200 hover:bg-red-500/10 hover:border-red-500/35 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <X size={13} /> Odrzuc
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
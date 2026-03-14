'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { resolveProfileIdForAuthUser } from '@/lib/profileAuth';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Bell, MessageCircle, Shield, Menu, X, Gift, Heart, BadgeCheck, LogIn, LogOut, UserPlus, Eye, Users, Check, Trash2 } from 'lucide-react';
import { useNotifications, type NotificationItem } from '@/lib/hooks/useNotifications';
import { useFriends } from '@/lib/hooks/useFriends';

type HeaderProfile = {
  role?: string | null;
  is_verified?: boolean | null;
  created_at?: string | null;
};

function toTimestamp(value?: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function formatNotificationTime(timestamp: string): string {
  const ts = toTimestamp(timestamp);
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

export default function NewHeader() {
  const adminEmail = 'lio1985lodz@gmail.com';
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [lastReadAt, setLastReadAt] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [friendActionBusyKey, setFriendActionBusyKey] = useState<string | null>(null);
  const { acceptFriendRequest, removeFriendship } = useFriends();

  const unreadTargetIds = useMemo(
    () => Array.from(new Set([user?.id, profileId].filter(Boolean))) as string[],
    [profileId, user?.id],
  );
  
  // Determine active nav item based on current pathname
  const getActiveNav = (path: string) => {
    if (path === '/') return 'home';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/messages')) return 'messages';
    if (path.startsWith('/friends') || path.startsWith('/likes')) return 'friends';
    if (path.startsWith('/myprofile')) return 'profile';
    return null;
  };
  
  const activeNav = getActiveNav(pathname);

  const loadProfile = useCallback(async (resolvedProfileId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_verified, created_at')
      .eq('id', resolvedProfileId)
      .maybeSingle();

    setProfile((data as HeaderProfile | null) ?? null);
  }, []);

  const loadUnreadMessagesCount = useCallback(async () => {
    if (!user || unreadTargetIds.length === 0) {
      setUnreadMessagesCount(0);
      return;
    }
    try {
      const stored = localStorage.getItem('messages_opened_at');
      let query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('to_profile_id', unreadTargetIds);
      if (stored) {
        const ts = parseInt(stored, 10);
        if (!isNaN(ts)) {
          query = query.gt('created_at', new Date(ts).toISOString());
        }
      }
      const { count } = await query;
      setUnreadMessagesCount(count ?? 0);
    } catch {
      // ignore network errors
    }
  }, [unreadTargetIds, user]);

  const isAdmin =
    user?.email?.trim().toLowerCase() === adminEmail ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin';

  const {
    notifications,
    loading: notificationsLoading,
    refresh: loadNotifications,
    dismissNotification,
    dismissAllNotifications,
  } = useNotifications({
    userId: user?.id || null,
    targetProfileIds: unreadTargetIds,
    isAdmin,
    profileIsVerified: Boolean(profile?.is_verified),
    profileCreatedAt: profile?.created_at ?? null,
  });

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        const resolvedProfileId = await resolveProfileIdForAuthUser(sessionUser);
        setProfileId(resolvedProfileId);
        if (resolvedProfileId) {
          await loadProfile(resolvedProfileId);
        } else {
          setProfile(null);
        }
      } else {
        setProfileId(null);
        setProfile(null);
      }
    };

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        void (async () => {
          const resolvedProfileId = await resolveProfileIdForAuthUser(sessionUser);
          setProfileId(resolvedProfileId);
          if (resolvedProfileId) {
            await loadProfile(resolvedProfileId);
          } else {
            setProfile(null);
          }
        })();
      } else {
        setProfileId(null);
        setProfile(null);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!user) {
      setLastReadAt(0);
      setUnreadMessagesCount(0);
      return;
    }
    const stored = localStorage.getItem('notifications_read_at');
    if (stored) {
      const ts = parseInt(stored, 10);
      if (!isNaN(ts)) setLastReadAt(ts);
    }
  }, [user]);

  useEffect(() => {
    if (!notificationsOpen || !user) return;

    void loadNotifications();

    const refreshTimer = window.setInterval(() => {
      void loadNotifications();
    }, 20000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadNotifications, notificationsOpen, user]);

  useEffect(() => {
    if (!user || unreadTargetIds.length === 0) {
      setUnreadMessagesCount(0);
      return;
    }
    void loadUnreadMessagesCount();
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadUnreadMessagesCount();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [loadUnreadMessagesCount, unreadTargetIds, user]);

  useEffect(() => {
    if (!user || unreadTargetIds.length === 0) return;

    const channel = supabase
      .channel(`header-message-notifications-${unreadTargetIds.join('_')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const nextMessage = payload.new as { to_profile_id?: string };
          if (!nextMessage.to_profile_id || !unreadTargetIds.includes(nextMessage.to_profile_id)) return;

          if (!pathname.startsWith('/messages')) {
            void loadUnreadMessagesCount();
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [loadUnreadMessagesCount, pathname, unreadTargetIds, user]);

  useEffect(() => {
    if (pathname.startsWith('/messages')) {
      localStorage.setItem('messages_opened_at', String(Date.now()));
      setUnreadMessagesCount(0);
    }
  }, [pathname]);

  const unreadNotificationsCount = useMemo(() => {
    if (!lastReadAt) return notifications.length;

    return notifications.filter((notification) => toTimestamp(notification.createdAt) > lastReadAt).length;
  }, [lastReadAt, notifications]);

  const markAllNotificationsAsRead = useCallback(() => {
    const now = Date.now();
    setLastReadAt(now);
    localStorage.setItem('notifications_read_at', String(now));
  }, []);

  const clearAllNotifications = useCallback(() => {
    if (notifications.length === 0) return;

    dismissAllNotifications();

    const now = Date.now();
    setLastReadAt(now);
    localStorage.setItem('notifications_read_at', String(now));
  }, [dismissAllNotifications, notifications.length]);

  const openNotification = useCallback(
    (href: string) => {
      router.push(href);
      setNotificationsOpen(false);
    },
    [router],
  );

  const openInviterProfile = useCallback((notification: NotificationItem) => {
    if (!notification.actorProfileId) return;
    openNotification(`/profile/${encodeURIComponent(notification.actorProfileId)}`);
  }, [openNotification]);

  const handleAcceptFriendRequest = useCallback(async (notification: NotificationItem) => {
    if (!notification.friendshipId) return;

    const busyKey = `accept-${notification.id}`;
    setFriendActionBusyKey(busyKey);

    try {
      await acceptFriendRequest(notification.friendshipId);
      dismissNotification(notification.id);
      await loadNotifications();
    } catch (error) {
      console.error('Blad akceptacji zaproszenia ze skrótu powiadomien:', error);
    } finally {
      setFriendActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  }, [acceptFriendRequest, dismissNotification, loadNotifications]);

  const handleRejectFriendRequest = useCallback(async (notification: NotificationItem) => {
    if (!notification.friendshipId) return;

    const busyKey = `reject-${notification.id}`;
    setFriendActionBusyKey(busyKey);

    try {
      await removeFriendship(notification.friendshipId);
      dismissNotification(notification.id);
      await loadNotifications();
    } catch (error) {
      console.error('Blad odrzucenia zaproszenia ze skrótu powiadomien:', error);
    } finally {
      setFriendActionBusyKey((prev) => (prev === busyKey ? null : prev));
    }
  }, [dismissNotification, loadNotifications, removeFriendship]);

  const toggleNotifications = useCallback(() => {
    const nextOpenState = !notificationsOpen;
    setNotificationsOpen(nextOpenState);

    if (nextOpenState) {
      markAllNotificationsAsRead();
    }
  }, [markAllNotificationsAsRead, notificationsOpen]);

  const handleAuthAction = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Blad podczas wylogowania:', error.message);
      return;
    }

    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  return (
    <>
      {/* Fixed Top Header */}
      <header id="main-header" className="fixed top-0 w-full h-20 glass-panel z-50 flex items-center justify-between px-4 lg:px-8 xl:px-16 transition-all duration-300 gap-4 border-b border-white/5">
        {/* Logo */}
        <div
          className="flex-shrink-0 flex items-center gap-2 cursor-pointer group z-10"
          onClick={() => router.push('/')}
        >
          <span className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400 group-hover:text-glow-magenta transition-all duration-300">
            findloove.pl
          </span>
        </div>

        {/* Main Navigation (Hidden on mobile, centered) */}
        <nav className="hidden lg:flex flex-1 justify-center items-center gap-6 xl:gap-10 z-0">
          <button
            onClick={() => router.push('/')}
            className={`nav-item relative text-gray-300 hover:text-white font-medium transition-colors pb-1 whitespace-nowrap ${
              activeNav === 'home' ? 'active' : ''
            }`}
          >
            Odkrywaj
          </button>
          <button
            onClick={() => router.push('/search')}
            className={`nav-item relative text-gray-300 hover:text-white font-medium transition-colors pb-1 whitespace-nowrap ${
              activeNav === 'search' ? 'active' : ''
            }`}
          >
            Szukaj
          </button>
          <button
            onClick={() => router.push('/messages')}
            className={`nav-item relative text-gray-300 hover:text-white font-medium transition-colors pb-1 whitespace-nowrap ${
              activeNav === 'messages' ? 'active' : ''
            }`}
          >
            Wiadomości
          </button>
          <button
            onClick={() => router.push('/friends')}
            className={`nav-item relative text-gray-300 hover:text-white font-medium transition-colors pb-1 flex items-center gap-1.5 whitespace-nowrap ${
              activeNav === 'friends' ? 'active' : ''
            }`}
          >
            <Users size={16} className="text-emerald-400" />
            Znajomi
          </button>
          {!isAdmin && (
            <button
              onClick={() => router.push('/myprofile')}
              className={`nav-item relative text-gray-300 hover:text-white font-medium transition-colors pb-1 flex items-center gap-1.5 whitespace-nowrap ${
                activeNav === 'profile' ? 'active' : ''
              }`}
            >
              Mój profil
            </button>
          )}
        </nav>

        {/* Right Side Icons & Avatar/Login */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 sm:gap-4 z-10">
          {/* Admin Panel */}
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              title="Panel Administratora"
              className="relative text-red-500 hover:text-white hover:bg-red-500 transition-all duration-300 flex items-center justify-center drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] bg-red-500/10 w-10 h-10 rounded-full border border-red-500/30 group"
            >
              <Shield size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Messages */}
          <div className="relative group">
            <button
              onClick={() => router.push('/messages')}
              title="Wiadomości"
              className="relative text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 duration-300 w-10 h-10 flex items-center justify-center rounded-full hover:shadow-[0_0_15px_rgba(0,255,255,0.6)]"
            >
              <MessageCircle size={26} />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-0 min-w-[18px] h-[18px] px-1 bg-cyan-500 rounded-full text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(0,255,255,0.8)] text-black border-2 border-[#110a22]">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 translate-y-1 rounded-full bg-black/85 border border-cyan-500/30 px-3 py-1 text-xs text-cyan-100 whitespace-nowrap opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 hidden lg:block">
              Wiadomości
            </span>
          </div>

          {/* Notifications */}
          <div className="relative group" id="notification-wrapper">
            <button
              onClick={toggleNotifications}
              title="Powiadomienia"
              className="relative text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 duration-300 w-10 h-10 flex items-center justify-center rounded-full hover:shadow-[0_0_15px_rgba(0,255,255,0.6)]"
              id="bell-btn"
            >
              <Bell size={26} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-1.5 w-2.5 h-2.5 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(255,0,255,0.8)] border-2 border-[#110a22]"></span>
              )}
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 translate-y-1 rounded-full bg-black/85 border border-fuchsia-500/30 px-3 py-1 text-xs text-fuchsia-100 whitespace-nowrap opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 hidden lg:block">
              Powiadomienia
            </span>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute top-full right-0 mt-4 w-80 sm:w-96 glass-modal rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[100] transform opacity-100 scale-100 transition-all duration-300 origin-top-right">
                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-black/20 flex justify-between items-center">
                  <h3 className="text-white font-medium flex items-center gap-2 text-lg">
                    <Bell size={20} className="text-fuchsia-400" /> Powiadomienia
                    {unreadNotificationsCount > 0 && (
                      <span className="ml-1 inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-xs text-fuchsia-300">
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={clearAllNotifications}
                    disabled={notifications.length === 0}
                    className="inline-flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 transition-colors bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={12} /> Usun wszystkie
                  </button>
                </div>

                {/* Notifications List */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {notificationsLoading ? (
                    <div className="p-8 text-center text-sm text-cyan-300/80">Ladowanie powiadomien...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-400">Brak nowych powiadomien.</div>
                  ) : (
                    notifications.map((notification, idx) => {
                      const isLast = idx === notifications.length - 1;

                      return (
                        <div
                          key={notification.id}
                          className={`p-4 ${isLast ? '' : 'border-b border-white/5'} hover:bg-white/5 transition-colors cursor-pointer flex gap-4`}
                          onClick={() => openNotification(notification.href)}
                        >
                          {notification.kind === 'gift' && (
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                              <Gift size={20} className="text-amber-400" />
                            </div>
                          )}

                          {notification.kind === 'like' && (
                            <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                              <Heart size={20} className="text-red-500 fill-red-500" />
                            </div>
                          )}

                          {notification.kind === 'verification' && (
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                              <BadgeCheck size={20} className="text-blue-400" />
                            </div>
                          )}

                          {notification.kind === 'poke' && (
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                              <MessageCircle size={20} className="text-cyan-300" />
                            </div>
                          )}

                          {notification.kind === 'comment' && notification.actorImageUrl && (
                            <img
                              src={notification.actorImageUrl}
                              className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                              alt={notification.actorName || 'Komentarz'}
                            />
                          )}

                          {notification.kind === 'comment' && !notification.actorImageUrl && (
                            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
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
                              className="shrink-0 rounded-full"
                            >
                              <img
                                src={notification.actorImageUrl}
                                className="w-10 h-10 rounded-full object-cover border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                                alt={notification.actorName || 'Zaproszenie'}
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
                              className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                            >
                              <UserPlus size={18} className="text-green-400" />
                            </button>
                          )}

                          {notification.kind === 'profile_view' && notification.actorImageUrl && (
                            <img
                              src={notification.actorImageUrl}
                              className="w-10 h-10 rounded-full object-cover border border-indigo-500/30 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                              alt={notification.actorName || 'Odwiedziny profilu'}
                            />
                          )}

                          {notification.kind === 'profile_view' && !notification.actorImageUrl && (
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                              <Eye size={18} className="text-indigo-300" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm text-gray-200">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatNotificationTime(notification.createdAt)}</p>
                              </div>

                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  dismissNotification(notification.id);
                                }}
                                title="Usuń to powiadomienie"
                                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-red-500/35 hover:bg-red-500/10 flex items-center justify-center text-white/40 hover:text-red-300 transition-colors shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {notification.kind === 'friend_request' && notification.friendshipId && (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleAcceptFriendRequest(notification);
                                  }}
                                  disabled={friendActionBusyKey === `accept-${notification.id}` || friendActionBusyKey === `reject-${notification.id}`}
                                  className="inline-flex items-center gap-1 rounded-md border border-green-500/40 bg-green-500/20 px-2.5 py-1 text-[11px] text-green-200 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Check size={12} /> Akceptuj
                                </button>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleRejectFriendRequest(notification);
                                  }}
                                  disabled={friendActionBusyKey === `accept-${notification.id}` || friendActionBusyKey === `reject-${notification.id}`}
                                  className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] text-white/75 hover:text-red-200 hover:border-red-500/35 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <X size={12} /> Odrzuc
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-black/40 text-center">
                  <button
                    onClick={() => openNotification('/notifications')}
                    className="text-sm text-gray-400 hover:text-white transition-colors py-1 px-4 rounded-full hover:bg-white/5"
                  >
                    Zobacz wszystkie
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-[1px] bg-white/20 mx-1 sm:mx-2 hidden sm:block"></div>

          {/* Desktop auth button (fixed width, dynamic label) */}
          <button
            onClick={handleAuthAction}
            className={`group relative hidden sm:flex min-w-[132px] items-center justify-center gap-2 px-5 lg:px-6 py-2.5 rounded-full font-medium text-sm text-white transition-all active:scale-95 overflow-hidden ${
              user
                ? 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 shadow-[0_0_15px_rgba(148,163,184,0.25)] hover:shadow-[0_0_25px_rgba(148,163,184,0.35)]'
                : 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)]'
            }`}
            title={user ? 'Wyloguj się' : 'Zaloguj się'}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>

            {user ? (
              <LogOut size={18} className="relative z-10 group-hover:scale-110 transition-transform" />
            ) : (
              <LogIn size={18} className="relative z-10 group-hover:scale-110 transition-transform" />
            )}
            <span className="relative z-10">{user ? 'Wyloguj' : 'Zaloguj'}</span>

            <span className="absolute inset-0 rounded-full bg-cyan-400/20 scale-100 group-hover:scale-110 opacity-0 group-hover:opacity-100 blur-md transition-all duration-300"></span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-cyan-400 hover:text-cyan-300"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="fixed top-20 left-0 right-0 bg-black/90 backdrop-blur-lg border-b border-cyan-500/10 z-40 lg:hidden">
          <nav className="flex flex-col p-6 gap-4">
            <button
              onClick={() => {
                router.push('/');
                setMobileMenuOpen(false);
              }}
              className={`text-left px-4 py-2 rounded-lg transition-colors ${
                activeNav === 'home'
                  ? 'text-cyan-300 bg-cyan-500/10 font-medium'
                  : 'text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              Odkrywaj
            </button>
            <button
              onClick={() => {
                router.push('/search');
                setMobileMenuOpen(false);
              }}
              className={`text-left px-4 py-2 rounded-lg transition-colors ${
                activeNav === 'search'
                  ? 'text-cyan-300 bg-cyan-500/10 font-medium'
                  : 'text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              Szukaj
            </button>
            <button
              onClick={() => {
                router.push('/messages');
                setMobileMenuOpen(false);
              }}
              className={`text-left px-4 py-2 rounded-lg transition-colors ${
                activeNav === 'messages'
                  ? 'text-cyan-300 bg-cyan-500/10 font-medium'
                  : 'text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              Wiadomości
            </button>
            <button
              onClick={() => {
                router.push('/friends');
                setMobileMenuOpen(false);
              }}
              className={`text-left px-4 py-2 rounded-lg transition-colors ${
                activeNav === 'friends'
                  ? 'text-cyan-300 bg-cyan-500/10 font-medium'
                  : 'text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              Znajomi
            </button>
            {!isAdmin && (
              <button
                onClick={() => {
                  router.push('/myprofile');
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-4 py-2 rounded-lg transition-colors ${
                  activeNav === 'profile'
                    ? 'text-cyan-300 bg-cyan-500/10 font-medium'
                    : 'text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                Mój profil
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  router.push('/admin');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-4 py-2 text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 rounded-lg transition-colors"
              >
                Panel Admina
              </button>
            )}
            
            {/* Mobile auth actions */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <button
                onClick={async () => {
                  if (!user) {
                    router.push('/auth');
                  } else {
                    await handleAuthAction();
                  }
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full font-medium text-white active:scale-95 transition-all ${
                  user
                    ? 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 shadow-[0_0_15px_rgba(148,163,184,0.25)]'
                    : 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 shadow-[0_0_15px_rgba(255,0,255,0.3)]'
                }`}
              >
                {user ? <LogOut size={18} /> : <LogIn size={18} />}
                {user ? 'Wyloguj' : 'Zaloguj'}
              </button>

              {!user && (
                <button
                  onClick={() => {
                    router.push('/register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 rounded-full font-medium text-cyan-200 hover:bg-cyan-500/20 transition-all"
                >
                  <UserPlus size={18} />
                  Załóż konto
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

    </>
  );
}

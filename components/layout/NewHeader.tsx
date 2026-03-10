'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Bell, MessageCircle, Shield, Menu, X, Gift, Heart, BadgeCheck, LogIn, LogOut, UserPlus } from 'lucide-react';

type HeaderProfile = {
  role?: string | null;
  is_verified?: boolean | null;
  created_at?: string | null;
};

type NotificationKind = 'gift' | 'like' | 'poke' | 'verification' | 'comment';

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  actorName?: string;
  actorImageUrl?: string;
  message: string;
  createdAt: string;
  href: string;
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
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Determine active nav item based on current pathname
  const getActiveNav = (path: string) => {
    if (path === '/') return 'home';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/messages')) return 'messages';
    if (path.startsWith('/myprofile')) return 'profile';
    return null;
  };
  
  const activeNav = getActiveNav(pathname);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_verified, created_at')
      .eq('id', userId)
      .maybeSingle();

    setProfile((data as HeaderProfile | null) ?? null);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);

    try {
      const myProfileId = user.id;

      const [likesRes, interactionsRes, commentsRes] = await Promise.all([
        supabase
          .from('likes')
          .select('id, from_profile_id, created_at')
          .eq('to_profile_id', myProfileId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profile_interactions')
          .select('id, from_profile_id, kind, label, emoji, created_at')
          .eq('to_profile_id', myProfileId)
          .in('kind', ['gift', 'poke'])
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profile_comments')
          .select('id, author_profile_id, content, created_at')
          .eq('profile_id', myProfileId)
          .neq('author_profile_id', myProfileId)
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
        : ((commentsRes.data as CommentRow[] | null) ?? []);

      const actorIds = Array.from(
        new Set([
          ...likes.map((row) => row.from_profile_id),
          ...interactions.map((row) => row.from_profile_id),
          ...comments.map((row) => row.author_profile_id),
        ]),
      );

      const actorMap = new Map<string, { id: string; name?: string | null; image_url?: string | null }>();

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
              id: actor.id as string,
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
          message: `${actorName} polubil Twoj profil. Sprawdz, czy to match!`,
          createdAt: like.created_at,
          href: `/profile/${encodeURIComponent(like.from_profile_id)}`,
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
            message: `${actorName} wyslal Ci prezent${giftLabel}!${giftEmoji}`,
            createdAt: interaction.created_at,
            href: `/profile/${encodeURIComponent(interaction.from_profile_id)}`,
          });
        }

        if (interaction.kind === 'poke') {
          nextNotifications.push({
            id: `poke-${interaction.id}`,
            kind: 'poke',
            actorName,
            actorImageUrl: actor?.image_url || undefined,
            message: `${actorName} zaczepil Cie. Odpowiesz?`,
            createdAt: interaction.created_at,
            href: `/profile/${encodeURIComponent(interaction.from_profile_id)}`,
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
          message: `${actorName} skomentowal Twoj profil: "${snippet}"`,
          createdAt: comment.created_at,
          href: '/myprofile',
        });
      }

      if (profile?.is_verified) {
        nextNotifications.push({
          id: `verification-${myProfileId}`,
          kind: 'verification',
          message: 'Twoj profil zostal pomyslnie zweryfikowany.',
          createdAt: profile.created_at || new Date().toISOString(),
          href: '/myprofile',
        });
      }

      nextNotifications.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
      setNotifications(nextNotifications.slice(0, 40));
    } catch (error) {
      console.error('Blad ladowania centrum powiadomien:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [profile?.created_at, profile?.is_verified, user]);

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
        await loadProfile(sessionUser.id);
      } else {
        setProfile(null);
      }
    };

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        void loadProfile(sessionUser.id);
      } else {
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
      setNotifications([]);
      setLastReadAt(0);
      return;
    }

    void loadNotifications();
  }, [loadNotifications, user]);

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

  const unreadNotificationsCount = useMemo(() => {
    if (!lastReadAt) return notifications.length;

    return notifications.filter((notification) => toTimestamp(notification.createdAt) > lastReadAt).length;
  }, [lastReadAt, notifications]);

  const markAllNotificationsAsRead = useCallback(() => {
    setLastReadAt(Date.now());
  }, []);

  const openNotification = useCallback(
    (href: string) => {
      router.push(href);
      setNotificationsOpen(false);
    },
    [router],
  );

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

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <>
      {/* Floating Particles Background */}
      <div className="particles-container" id="particles"></div>

      {/* Fixed Top Header */}
      <header className="fixed top-0 w-full h-20 glass-panel z-50 flex items-center justify-between px-4 lg:px-8 xl:px-16 transition-all duration-300 gap-4 border-b border-white/5">
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
            onClick={() => router.push('/myprofile')}
            className={`nav-item relative text-gray-300 hover:text-white font-medium transition-colors pb-1 flex items-center gap-1.5 whitespace-nowrap ${
              activeNav === 'profile' ? 'active' : ''
            }`}
          >
            Mój profil
          </button>
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
          <button
            onClick={() => router.push('/messages')}
            className="relative text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 duration-300 w-10 h-10 flex items-center justify-center rounded-full hover:shadow-[0_0_15px_rgba(0,255,255,0.6)]"
          >
            <MessageCircle size={26} />
            <span className="absolute top-1 right-0 w-[18px] h-[18px] bg-cyan-500 rounded-full text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(0,255,255,0.8)] text-black border-2 border-[#110a22]">
              3
            </span>
          </button>

          {/* Notifications */}
          <div className="relative" id="notification-wrapper">
            <button
              onClick={toggleNotifications}
              className="relative text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 duration-300 w-10 h-10 flex items-center justify-center rounded-full hover:shadow-[0_0_15px_rgba(0,255,255,0.6)]"
              id="bell-btn"
            >
              <Bell size={26} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-1.5 w-2.5 h-2.5 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(255,0,255,0.8)] border-2 border-[#110a22]"></span>
              )}
            </button>

            {/* Notification Dropdown - Enhanced with 4 notification types */}
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
                    onClick={markAllNotificationsAsRead}
                    disabled={notifications.length === 0}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Oznacz przeczytane
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

                          <div>
                            <p className="text-sm text-gray-200">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatNotificationTime(notification.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-black/40 text-center">
                  <button
                    onClick={() => openNotification('/myprofile')}
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

      <style jsx>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
        }
      `}</style>
      <script>{`
        document.addEventListener("DOMContentLoaded", () => {
          const container = document.getElementById('particles');
          if (!container) return;
          const colors = ['rgba(255, 0, 255, 0.4)', 'rgba(0, 255, 255, 0.4)', 'rgba(255, 215, 0, 0.2)'];
          for (let i = 0; i < 35; i++) {
            let p = document.createElement('div');
            p.className = 'particle';
            p.style.width = p.style.height = Math.random() * 3 + 1 + 'px';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.animationDuration = Math.random() * 15 + 10 + 's';
            p.style.animationDelay = Math.random() * 10 + 's';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.boxShadow = '0 0 ' + (Math.random() * 10 + 2) + 'px ' + p.style.backgroundColor;
            container.appendChild(p);
          }
        });
      `}</script>
    </>
  );
}

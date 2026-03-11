'use client';

import { useCallback, useEffect, useState } from 'react';
import { Heart, Home, MessageCircle, HeartHandshake, User, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AppView, ViewType } from '@/lib/types';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: ViewType | 'myprofile') => void;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
}

const NAV_ITEMS: { id: ViewType | 'myprofile'; icon: React.ReactNode; label: string; path: string }[] = [
  { id: 'home', icon: <Home size={20} />, label: 'Start', path: '/' },
  { id: 'discover', icon: <HeartHandshake size={22} />, label: 'Randki', path: '/discover' },
  { id: 'search', icon: <Search size={20} />, label: 'Szukaj', path: '/search' },
  { id: 'messages', icon: <MessageCircle size={22} />, label: 'Poczta', path: '/messages' },
  { id: 'likes', icon: <Heart size={20} />, label: 'Ulubione', path: '/likes' },
  { id: 'myprofile', icon: <User size={22} />, label: 'Profil', path: '/myprofile' },
];

async function resolveProfileIdForAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const normalizedEmail = user.email?.trim().toLowerCase() || null;

  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!byIdError && byId?.id) {
    return byId.id as string;
  }

  if (normalizedEmail) {
    const { data: byEmail, error: byEmailError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!byEmailError && byEmail?.id) {
      return byEmail.id as string;
    }
  }

  const fallbackName =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
    'Uzytkownik';

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: normalizedEmail,
        name: fallbackName,
        age: 30,
        city: 'Nieznane',
        bio: '',
        interests: [],
        image_url: '',
      },
      { onConflict: 'id' },
    )
    .select('id')
    .maybeSingle();

  if (createError) {
    console.error('Nie udalo sie utworzyc/finalizowac profilu dla dolnej nawigacji:', createError.message);
    return null;
  }

  return (created?.id as string | undefined) || user.id;
}

export default function BottomNav({ currentView, onNavigate, isLoggedIn = false, isAdmin = false }: BottomNavProps) {
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!isLoggedIn && item.id === 'messages') return false;
    if (isAdmin && item.id === 'myprofile') return false;
    return true;
  });
  
  const pathname = usePathname();
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const loadUnreadMessagesCount = useCallback(async () => {
    if (!isLoggedIn || !profileId) {
      setUnreadMessagesCount(0);
      return;
    }

    try {
      const stored = localStorage.getItem('messages_opened_at');
      let query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('to_profile_id', profileId);

      if (stored) {
        const ts = parseInt(stored, 10);
        if (!Number.isNaN(ts)) {
          query = query.gt('created_at', new Date(ts).toISOString());
        }
      }

      const { count } = await query;
      setUnreadMessagesCount(count ?? 0);
    } catch {
      // ignore transient network issues
    }
  }, [isLoggedIn, profileId]);

  useEffect(() => {
    let active = true;

    const syncProfileId = async () => {
      if (!isLoggedIn) {
        if (!active) return;
        setProfileId(null);
        setUnreadMessagesCount(0);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        setProfileId(null);
        setUnreadMessagesCount(0);
        return;
      }

      const resolvedProfileId = await resolveProfileIdForAuthUser(user);
      if (!active) return;
      setProfileId(resolvedProfileId);
    };

    void syncProfileId();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;

      if (!sessionUser) {
        setProfileId(null);
        setUnreadMessagesCount(0);
        return;
      }

      void (async () => {
        const resolvedProfileId = await resolveProfileIdForAuthUser(sessionUser);
        setProfileId(resolvedProfileId);
      })();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (pathname.startsWith('/messages')) {
      localStorage.setItem('messages_opened_at', String(Date.now()));
      setUnreadMessagesCount(0);
      return;
    }

    void loadUnreadMessagesCount();

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadUnreadMessagesCount();
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadUnreadMessagesCount, pathname]);
  
  const getActiveItem = (path: string) => {
    if (path === '/') return 'home';
    if (path.startsWith('/discover')) return 'discover';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/messages')) return 'messages';
    if (path.startsWith('/likes')) return 'likes';
    if (path.startsWith('/myprofile')) return 'myprofile';
    // /profile/[id] (cudze profile) nie podświetlają żadnej zakładki
    return null;
  };
  
  const activeItem = getActiveItem(pathname);

  return (
    <nav data-app-nav="bottom" className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] z-50 pb-safe md:py-0">
      <div className="max-w-2xl mx-auto flex justify-around items-center px-2 py-1 md:py-2 min-h-[56px] md:min-h-0">
        {visibleNavItems.map((item) => {
          const active = activeItem === item.id;
          const isSpeedDating = item.id === 'discover';
          const isProfileTab = item.id === 'myprofile';
          
          const handleClick = () => {
            if (!isLoggedIn && item.id === 'myprofile') {
              router.push('/auth');
            } else {
              router.push(item.path);
              onNavigate(item.id);
            }
          };

          return (
            <button
              key={item.id}
              onClick={handleClick}
              title={isProfileTab ? 'Moj profil' : item.label}
              className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all px-1.5 py-1 rounded-xl active:scale-95 min-w-[44px] md:min-w-[52px] touch-manipulation ${
                isSpeedDating
                  ? active
                    ? 'text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                    : 'text-white/60 hover:text-amber-300 hover:bg-amber-500/10'
                  : active
                  ? 'text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <div
                className={`relative transition-all ${
                  isSpeedDating
                    ? active
                      ? 'bg-amber-500/20 p-1.5 md:p-2 rounded-xl scale-105 border border-amber-400/40'
                      : 'p-1.5 md:p-1.5'
                    : active
                    ? 'bg-cyan-500/20 p-1.5 md:p-2 rounded-xl scale-105 border border-cyan-400/40'
                    : 'p-1.5 md:p-1.5'
                }`}
              >
                {item.icon}
                {item.id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-black shadow-[0_0_10px_rgba(34,211,238,0.6)] border border-[#110a22]">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
                {isProfileTab && isLoggedIn && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(255,0,255,0.5)]">
                    i
                  </span>
                )}
              </div>
              <span className="hidden md:block text-[10px] font-bold uppercase tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import { Heart, Home, MessageCircle, HeartHandshake, User, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { AppView, ViewType } from '@/lib/types';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: ViewType | 'myprofile') => void;
  isLoggedIn?: boolean;
}

const NAV_ITEMS: { id: ViewType | 'myprofile'; icon: React.ReactNode; label: string; path: string }[] = [
  { id: 'home', icon: <Home size={20} />, label: 'Start', path: '/' },
  { id: 'discover', icon: <HeartHandshake size={22} />, label: 'Randki', path: '/discover' },
  { id: 'search', icon: <Search size={20} />, label: 'Szukaj', path: '/search' },
  { id: 'messages', icon: <MessageCircle size={22} />, label: 'Poczta', path: '/messages' },
  { id: 'likes', icon: <Heart size={20} />, label: 'Lubię', path: '/likes' },
  { id: 'myprofile', icon: <User size={22} />, label: 'Profil', path: '/myprofile' },
];

export default function BottomNav({ currentView, onNavigate, isLoggedIn = false }: BottomNavProps) {
  const visibleNavItems = isLoggedIn
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.id !== 'messages');
  
  const pathname = usePathname();
  const router = useRouter();
  
  const getActiveItem = (path: string) => {
    if (path === '/') return 'home';
    if (path.startsWith('/discover')) return 'discover';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/messages')) return 'messages';
    if (path.startsWith('/likes')) return 'likes';
    if (path.startsWith('/myprofile') || path.startsWith('/profile')) return 'myprofile';
    return null;
  };
  
  const activeItem = getActiveItem(pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] z-50 pb-safe md:py-0">
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

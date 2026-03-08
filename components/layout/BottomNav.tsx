'use client';

import { Heart, Home, MessageCircle, HeartHandshake, User, Search } from 'lucide-react';
import { AppView, ViewType } from '@/lib/types';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: ViewType | 'myprofile') => void;
  isLoggedIn?: boolean;
}

const NAV_ITEMS: { id: ViewType | 'myprofile'; icon: React.ReactNode; label: string }[] = [
  { id: 'home', icon: <Home size={20} />, label: 'Start' },
  { id: 'discover', icon: <HeartHandshake size={22} />, label: 'Randki' },
  { id: 'search', icon: <Search size={20} />, label: 'Szukaj' },
  { id: 'messages', icon: <MessageCircle size={22} />, label: 'Poczta' },
  { id: 'likes', icon: <Heart size={20} />, label: 'Lubię' },
  { id: 'myprofile', icon: <User size={20} />, label: 'Profil' },
];

export default function BottomNav({ currentView, onNavigate, isLoggedIn = false }: BottomNavProps) {
  const visibleNavItems = isLoggedIn
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.id !== 'messages');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-50 pb-safe md:py-0">
      <div className="max-w-2xl mx-auto flex justify-around items-center px-2 py-1 md:py-2 min-h-[56px] md:min-h-0">
        {visibleNavItems.map((item) => (
          (() => {
            const active = currentView === item.id;
            const isSpeedDating = item.id === 'discover';

            return (
          <button
            key={item.id}
            onClick={() => {
              const targetView: ViewType | 'myprofile' = !isLoggedIn && item.id === 'myprofile' ? 'auth' : item.id;
              onNavigate(targetView);
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all px-1.5 py-1 rounded-xl active:scale-95 min-w-[44px] md:min-w-[52px] touch-manipulation ${
              isSpeedDating
                ? active
                  ? 'text-amber-600'
                  : 'text-amber-500 hover:bg-amber-50'
                : active
                ? 'text-rose-500'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <div
              className={`transition-all ${
                isSpeedDating
                  ? active
                    ? 'bg-amber-100 p-1.5 md:p-2 rounded-xl scale-105'
                    : 'p-1.5 md:p-1.5'
                  : active
                  ? 'bg-rose-50 p-1.5 md:p-2 rounded-xl scale-105'
                  : 'p-1.5 md:p-1.5'
              }`}
            >
              {item.icon}
            </div>
            <span className="hidden md:block text-[10px] font-bold uppercase tracking-tight leading-none">{item.label}</span>
          </button>
            );
          })()
        ))}
      </div>
    </nav>
  );
}

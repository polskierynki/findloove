
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Home, Search, MessageCircle, LogIn, LogOut, HeartHandshake, User, Crown, Bot } from 'lucide-react';
import { useLogout } from '@/lib/hooks/useLogout';
import { AppView, ViewType } from '@/lib/types';

const NAV_ITEMS: { id: ViewType | 'myprofile'; icon: React.ReactNode; label: string }[] = [
  { id: 'home',     icon: <Home size={20} />,         label: 'Start' },
  { id: 'discover', icon: <HeartHandshake size={20} />, label: 'Szybkie Randki' },
  { id: 'search',   icon: <Search size={20} />,        label: 'Szukaj' },
  { id: 'messages', icon: <MessageCircle size={20} />, label: 'Poczta' },
  { id: 'myprofile', icon: <User size={20} />,         label: 'Moj profil' },
];

interface HeaderProps {
  onAssistantClick: () => void;
  currentView: AppView;
  onNavigate: (view: ViewType | 'admin' | 'myprofile') => void;
  assistantOpen: boolean;
  isLoggedIn?: boolean;
  tokens?: number;
  userName?: string;
  isAdmin?: boolean;
}

export default function Header({ onAssistantClick, currentView, onNavigate, assistantOpen, isLoggedIn, tokens, userName, isAdmin }: HeaderProps) {
  const logout = useLogout();
  const visibleNavItems = isLoggedIn
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.id !== 'messages' && item.id !== 'myprofile');

  // Auto-hide header on mobile scroll
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when scrolling up or at top
      if (currentScrollY < lastScrollY || currentScrollY < 20) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // Hide when scrolling down (only on mobile)
        if (window.innerWidth < 768) {
          setIsVisible(false);
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header className={`bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}`}>
      <div className="max-w-6xl mx-auto px-3 md:px-6 h-14 md:h-14 flex items-center gap-2 md:gap-6">
        {/* Logo - smaller on mobile */}
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 group shrink-0 cursor-pointer">
          <Image
            src="/logo/logo.jpg"
            alt="findloove.pl"
            width={120}
            height={32}
            className="h-6 md:h-8 w-auto object-contain"
            priority
          />
        </button>
        <div className="w-px h-4 md:h-6 bg-slate-200 shrink-0 hidden md:block" />
        {/* Nawigacja — środek, tylko ikony, tooltip na hover - hide on very small screens */}
        <nav className="hidden sm:flex items-center flex-1 justify-center gap-1 md:gap-2 min-w-0">
          {visibleNavItems.map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative group flex flex-col items-center justify-center px-1.5 md:px-2 h-12 md:h-14 w-10 md:w-12 cursor-pointer transition-all border-b-2
                  ${active ? 'border-rose-500 text-rose-500 bg-rose-50' : 'border-transparent text-slate-500 hover:text-rose-500 hover:bg-rose-50/60'}`}
                title={item.label}
              >
                <span className="scale-90 md:scale-100">{item.icon}</span>
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg hidden md:block">
                  <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800" aria-hidden="true" />
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        {/* Prawa strona — user info, akcje */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-auto sm:ml-0">
          {isLoggedIn ? (
            <div className="flex items-center gap-1 md:gap-2">
              {/* Użytkownik: serduszka, profil, asystent, wyloguj */}
              {!isAdmin && <>
                <div className="flex items-center gap-1 md:gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-bold">
                  <span className="text-sm md:text-base">💛</span>
                  <span className="hidden md:inline">{tokens ?? 0} Serduszek</span>
                  <span className="md:hidden">{tokens ?? 0}</span>
                </div>
                <button
                  onClick={() => onNavigate('myprofile')}
                  className="relative flex items-center gap-1 md:gap-1.5 bg-slate-100 border border-slate-300 text-slate-700 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Moj profil"
                >
                  <User size={14} className="md:w-4 md:h-4" />
                  <span className="hidden lg:inline">Moj profil</span>
                  <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    i
                  </span>
                </button>
                <button
                  onClick={onAssistantClick}
                  className={`flex items-center gap-1 md:gap-1.5 bg-rose-50 border border-rose-200 text-rose-500 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold hover:bg-rose-100 transition-colors cursor-pointer ${assistantOpen ? 'bg-rose-500 text-white' : ''}`}
                  title="Asystent AI"
                >
                  <Bot size={14} className="md:w-4 md:h-4" />
                  <span className="hidden lg:inline">Asystent</span>
                </button>
              </>}
              {/* Admin: panel admina i wyloguj */}
              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="flex items-center gap-1 md:gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold hover:bg-yellow-100 transition-colors cursor-pointer"
                  title="Panel administratora"
                >
                  <Crown size={14} className="md:w-4 md:h-4" />
                  <span className="hidden lg:inline">Panel admina</span>
                </button>
              )}
              {/* Przycisk wylogowania */}
              <button
                onClick={logout}
                className="flex items-center gap-1 md:gap-1.5 bg-slate-100 border border-slate-300 text-slate-700 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                title="Wyloguj się"
              >
                <LogOut size={13} className="md:w-[15px] md:h-[15px]" />
                <span className="hidden lg:inline">Wyloguj</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              className="flex items-center gap-1 md:gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-2.5 md:px-4 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              title="Zaloguj się"
            >
              <LogIn size={16} className="md:w-[18px]" />
              <span>Zaloguj</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}



'use client';

import Image from 'next/image';
import { Heart, Search, MessageCircle, ShieldCheck, LogIn, LogOut, HeartHandshake, User, Crown, UserRound, Settings, Bot, BadgeCheck } from 'lucide-react';
import { useLogout } from '@/lib/hooks/useLogout';
import { AppView, ViewType } from '@/lib/types';

const NAV_ITEMS: { id: ViewType; icon: React.ReactNode; label: string }[] = [
  { id: 'home',     icon: <Heart size={20} />,         label: 'Start' },
  { id: 'discover', icon: <HeartHandshake size={20} />, label: 'Szybkie Randki' },
  { id: 'search',   icon: <Search size={20} />,        label: 'Szukaj' },
  { id: 'messages', icon: <MessageCircle size={20} />, label: 'Poczta' },
  { id: 'safety',   icon: <ShieldCheck size={20} />,   label: 'Bezpiecznie' },
];

interface HeaderProps {
  onAssistantClick: () => void;
  currentView: AppView;
  onNavigate: (view: ViewType | 'admin') => void;
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
    : NAV_ITEMS.filter((item) => item.id !== 'messages');

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 group shrink-0 cursor-pointer">
          <Image
            src="/logo/logo.jpg"
            alt="findloove.pl"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </button>
        <div className="w-px h-6 bg-slate-200 shrink-0" />
        {/* Nawigacja — środek, tylko ikony, tooltip na hover */}
        <nav className="flex items-center flex-1 justify-center gap-2 min-w-0">
          {visibleNavItems.map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative group flex flex-col items-center justify-center px-2 h-14 w-12 cursor-pointer transition-all border-b-2
                  ${active ? 'border-rose-500 text-rose-500 bg-rose-50' : 'border-transparent text-slate-500 hover:text-rose-500 hover:bg-rose-50/60'}`}
                title={item.label}
              >
                {item.icon}
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                  <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800" aria-hidden="true" />
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        {/* Prawa strona — user info, akcje */}
        <div className="flex items-center gap-2 shrink-0">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              {/* Użytkownik: serduszka, profil, asystent, wyloguj */}
              {!isAdmin && <>
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1.5 rounded-lg text-sm font-bold">
                  <span>💛</span>
                  <span className="hidden md:inline">{tokens ?? 0} Serduszek</span>
                </div>
                <button
                  onClick={() => onNavigate('profile')}
                  className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Mój profil"
                >
                  <User size={16} />
                  <span className="hidden md:inline">Mój profil</span>
                </button>
                <button
                  onClick={onAssistantClick}
                  className={`flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-500 px-2.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-colors cursor-pointer ${assistantOpen ? 'bg-rose-500 text-white' : ''}`}
                  title="Asystent AI"
                >
                  <Bot size={16} />
                  <span className="hidden md:inline">Asystent</span>
                </button>
              </>}
              {/* Admin: panel admina i wyloguj */}
              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 px-2.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-yellow-100 transition-colors cursor-pointer"
                  title="Panel administratora"
                >
                  <Crown size={16} />
                  <span className="hidden md:inline">Panel admina</span>
                </button>
              )}
              {/* Przycisk wylogowania */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                title="Wyloguj się"
              >
                <LogOut size={15} />
                <span className="hidden md:inline">Wyloguj</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              title="Zaloguj się"
            >
              <LogIn size={18} />
              <span className="hidden md:inline">Zaloguj się</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}


'use client';

import { Search, MessageCircle, Star, ShieldCheck, Bolt, User } from 'lucide-react';
import { ViewType } from '@/lib/types';

interface BottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const NAV_ITEMS = [
  { id: 'home' as ViewType, icon: <Search size={24} />, label: 'Start' },
  { id: 'discover' as ViewType, icon: <Bolt size={24} />, label: 'Randki' },
  { id: 'messages' as ViewType, icon: <MessageCircle size={24} />, label: 'Poczta' },
  { id: 'likes' as ViewType, icon: <Star size={24} />, label: 'Polubienia' },
  { id: 'safety' as ViewType, icon: <ShieldCheck size={24} />, label: 'Tarcza' },
  { id: 'myprofile', icon: <User size={24} />, label: 'Mój profil' },
];

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-100 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] px-4 py-3 z-50">
      <div className="max-w-2xl mx-auto flex justify-around items-center">
        {NAV_ITEMS.map((item) => (
          (() => {
            const active = currentView === item.id;
            const isSpeedDating = item.id === 'discover';

            return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 transition-all px-3 ${
              isSpeedDating
                ? active
                  ? 'text-amber-600 scale-105'
                  : 'text-amber-500'
                : active
                ? 'text-rose-500 scale-105'
                : 'text-slate-400'
            }`}
          >
            <div
              className={`${
                isSpeedDating
                  ? active
                    ? 'bg-amber-100 p-2 rounded-xl'
                    : 'bg-amber-50 p-2 rounded-xl'
                  : active
                  ? 'bg-rose-50 p-2 rounded-xl'
                  : 'p-2'
              }`}
            >
              {item.icon}
            </div>
            <span className="text-xs font-bold uppercase tracking-tight">{item.label}</span>
          </button>
            );
          })()
        ))}
      </div>
    </nav>
  );
}

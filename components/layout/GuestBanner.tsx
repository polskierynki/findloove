'use client';

import { X, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface GuestBannerProps {
  onRegister: () => void;
  clickCount: number;
  maxClicks: number;
}

export default function GuestBanner({ onRegister, clickCount, maxClicks }: GuestBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible) return null;

  const remaining = Math.max(0, maxClicks - clickCount);

  return (
    <div className="fixed bottom-[58px] md:bottom-0 left-0 right-0 z-40 px-2 pb-2 md:px-0 md:pb-0 animate-in slide-in-from-bottom duration-500">
      <div className="glass-panel border border-white/10">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-2.5 md:py-4 flex items-center gap-3">
          <button onClick={() => setIsVisible(false)} className="text-white/70 hover:text-white" aria-label="Zamknij baner">
            <X size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="font-medium text-white text-sm md:text-base truncate">Załóż konto i odblokuj pełny dostęp</p>
            <p className="text-cyan-300/80 text-[11px] md:text-sm truncate">
              {remaining > 0 ? `Pozostało ${remaining} kliknięć dla gościa` : 'Limit gościa wykorzystany'}
            </p>
          </div>

          <button
            onClick={onRegister}
            className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white px-3 md:px-5 py-2 rounded-lg md:rounded-xl font-medium text-xs md:text-sm inline-flex items-center gap-1.5"
          >
            <Sparkles size={14} /> Dołącz
          </button>
        </div>
      </div>
    </div>
  );
}

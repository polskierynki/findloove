'use client';

import { X, Heart, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface GuestBannerProps {
  onRegister: () => void;
  clickCount: number;
  maxClicks: number;
}

export default function GuestBanner({ onRegister, clickCount, maxClicks }: GuestBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const remaining = maxClicks - clickCount;

  return (
    <div className="fixed bottom-[58px] md:bottom-0 left-0 right-0 z-40 px-2 pb-2 md:px-0 md:pb-0 animate-in slide-in-from-bottom duration-500">
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 text-white shadow-2xl rounded-xl md:rounded-none border border-white/20 md:border-0">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-2.5 md:py-4">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/80 hover:text-white transition-colors shrink-0 p-1 md:p-0"
              aria-label="Zamknij baner"
            >
              <X size={18} className="md:w-5 md:h-5" />
            </button>

            {/* Content */}
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 md:w-12 md:h-12 bg-white/20 backdrop-blur rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                <Heart size={18} className="md:w-6 md:h-6" fill="white" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-bold text-sm md:text-lg leading-tight truncate">
                  Załóż darmowe konto już dziś!
                </p>
                <p className="text-white/90 text-[11px] md:text-sm leading-tight truncate">
                  {remaining > 0
                    ? `Pozostało ${remaining} ${remaining === 1 ? 'kliknięcie' : 'kliknięcia'} do limitu`
                    : 'Poznaj wszystkie profile bez limitu'
                  }
                </p>
              </div>

              {/* Stats */}
              <div className="hidden lg:flex items-center gap-4 ml-auto mr-4">
                <div className="text-center">
                  <div className="text-xl font-bold">1524+</div>
                  <div className="text-xs text-white/80">Członków</div>
                </div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center">
                  <div className="text-xl font-bold">87</div>
                  <div className="text-xs text-white/80">Par w tym miesiącu</div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onRegister}
              className="bg-white text-rose-600 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-base hover:bg-rose-50 transition-all shadow-lg flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0 group"
            >
              <Sparkles size={14} className="md:w-[18px] md:h-[18px] group-hover:rotate-12 transition-transform" />
              <span className="md:hidden">Dołącz</span>
              <span className="hidden md:inline">Dołącz za darmo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

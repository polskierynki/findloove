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
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-500">
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/80 hover:text-white transition-colors shrink-0"
            >
              <X size={20} />
            </button>

            {/* Content */}
            <div className="flex flex-col md:flex-row items-center gap-3 flex-1 text-center md:text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0">
                  <Heart size={24} fill="white" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">
                    Załóż darmowe konto już dziś!
                  </p>
                  <p className="text-white/90 text-sm">
                    {remaining > 0 
                      ? `Jeszcze ${remaining} ${remaining === 1 ? 'kliknięcie' : 'kliknięcia'} do limitu`
                      : 'Poznaj wszystkie profile bez ograniczeń'
                    }
                  </p>
                </div>
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
              className="bg-white text-rose-600 px-6 py-3 rounded-xl font-bold hover:bg-rose-50 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap shrink-0 group"
            >
              <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
              Dołącz za darmo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

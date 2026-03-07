'use client';

import { useState } from 'react';
import { ChevronLeft, Heart, Lock, LogIn } from 'lucide-react';
import { Profile } from '@/lib/types';

interface LikesViewProps {
  profiles: Profile[];
  onBack: () => void;
  onMessage: (profile: Profile) => void;
  isLoggedIn?: boolean;
  isPremium?: boolean;
  tokens?: number;
  onSpendToken?: () => boolean;
  onUnlockLikes?: () => void;
  unlockedLikes?: boolean;
  onLoginRequest?: () => void;
}

const FREE_PREVIEW_COUNT = 3;

export default function LikesView({
  profiles,
  onBack,
  onMessage,
  isLoggedIn = false,
  isPremium = false,
  tokens = 0,
  onSpendToken,
  onUnlockLikes,
  unlockedLikes = false,
  onLoginRequest,
}: LikesViewProps) {
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const hasPremiumAccess = isPremium || unlockedLikes;
  const hasMoreProfiles = profiles.length > FREE_PREVIEW_COUNT;
  const isLocked = !hasPremiumAccess && hasMoreProfiles;

  const handleUnlock = () => {
    if (!isLoggedIn) {
      setShowUnlockModal(false);
      onLoginRequest?.();
      return;
    }
    if (onSpendToken?.()) {
      onUnlockLikes?.();
      setShowUnlockModal(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      {/* ── UNLOCK MODAL ── */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-md shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-rose-100 p-4 rounded-full">
                <Lock size={40} className="text-rose-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">Odkryj wszystkich fanów!</h3>
            <p className="text-slate-600 text-center mb-6">
              W pakiecie Premium możesz zobaczyć wszystkie osoby, którym się podobasz.
            </p>

            <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-700 text-center">
                {isLoggedIn
                  ? `Masz ${tokens} 💛 Serduszek. Płatna dostęp kosztuje 2 Serduszka.`
                  : 'Zaloguj się, aby odblokować dostęp do wszystkich profili.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUnlockModal(false)}
                className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                Cofnij
              </button>
              <button
                onClick={handleUnlock}
                disabled={isLoggedIn && tokens < 2}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                  isLoggedIn && tokens >= 2
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : isLoggedIn
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {!isLoggedIn ? (
                  <>
                    <LogIn size={18} /> Zaloguj się
                  </>
                ) : tokens >= 2 ? (
                  <>
                    <Heart size={18} fill="currentColor" /> Wydaj 2 💛
                  </>
                ) : (
                  <>
                    <Lock size={18} /> Brak Serduszek
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={onBack} className="flex items-center gap-2 text-rose-500 font-bold text-xl">
        <ChevronLeft /> Wróć
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-serif font-bold text-slate-800">Tym osobom się podobasz!</h2>
        {isPremium ? (
          <div className="bg-emerald-50 px-4 py-2 rounded-full border-2 border-emerald-200 flex items-center gap-2">
            <Heart size={18} className="text-emerald-600" fill="currentColor" />
            <span className="text-sm font-bold text-emerald-700">Premium aktywne</span>
          </div>
        ) : isLocked && (
          <div className="bg-rose-50 px-4 py-2 rounded-full border-2 border-rose-200 flex items-center gap-2">
            <Lock size={18} className="text-rose-500" />
            <span className="text-sm font-bold text-rose-700">{profiles.length - FREE_PREVIEW_COUNT} ukryte</span>
          </div>
        )}
      </div>

      <p className="text-xl text-slate-600">
        Oni kliknęli serce przy Twoim zdjęciu w findloove.pl. Możesz do nich napisać.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {profiles.map((p, index) => {
          const isVisible = index < FREE_PREVIEW_COUNT || hasPremiumAccess;

          return (
            <div
              key={p.id}
              className={`bg-white p-6 rounded-[3rem] shadow-md border-2 border-rose-100 flex flex-col items-center text-center relative ${
                !isVisible ? 'opacity-100' : ''
              }`}
            >
              {/* Blurred background for locked profiles */}
              {!isVisible && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-[3rem] flex items-center justify-center z-10">
                  <button
                    onClick={() => setShowUnlockModal(true)}
                    className="bg-rose-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-600 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Lock size={20} />
                    Odkryj (2 💛)
                  </button>
                </div>
              )}

              <div className="relative mb-4">
                <img
                  src={p.image}
                  className={`w-32 h-32 rounded-full object-cover border-4 border-white shadow-md ${
                    !isVisible ? 'blur-md' : ''
                  }`}
                  alt={p.name}
                />
                <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-2 rounded-full shadow-lg">
                  <Heart size={20} fill="currentColor" />
                </div>
              </div>

              <h4 className={`text-2xl font-bold ${!isVisible ? 'blur-sm' : ''}`}>
                {p.name}, {p.age}
              </h4>
              <p className={`text-slate-500 mb-4 ${!isVisible ? 'blur-sm' : ''}`}>{p.city}</p>

              <button
                onClick={() => onMessage(p)}
                disabled={!isVisible}
                className={`w-full py-3 rounded-2xl font-bold shadow-md transition-all ${
                  isVisible
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isVisible ? 'Odezwij się' : 'Zablokowane'}
              </button>
            </div>
          );
        })}
      </div>

      {isLocked && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200 rounded-[2rem] p-8 text-center">
          <h3 className="text-2xl font-bold text-rose-700 mb-2">Pakiet Premium — Wszystkie fany!</h3>
          <p className="text-slate-600 mb-6">
            Odblokowaj listę wszystkich osób, którym się podobasz. Wydaj zaledwie 2 Serduszka!
          </p>
          <button
            onClick={() => setShowUnlockModal(true)}
            className="bg-rose-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-600 transition-colors"
          >
            Odkryj wszystko teraz
          </button>
        </div>
      )}
    </div>
  );
}

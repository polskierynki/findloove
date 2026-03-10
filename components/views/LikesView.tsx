'use client';

import { Lock, LogIn } from 'lucide-react';
import { ChatCircle } from '@phosphor-icons/react';
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

export default function LikesView({
  profiles,
  onMessage,
  isLoggedIn = false,
  tokens = 0,
  onUnlockLikes,
  unlockedLikes = false,
  onLoginRequest,
}: LikesViewProps) {
  const liked = profiles.slice(0, 12);

  if (!isLoggedIn) {
    return (
      <div className="glass rounded-3xl p-10 text-center space-y-4">
        <LogIn className="mx-auto text-cyan-300" size={36} />
        <h2 className="text-2xl text-white">Zaloguj się, aby zobaczyć polubienia</h2>
        <button
          onClick={onLoginRequest}
          className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-6 py-3 rounded-xl text-white"
        >
          Przejdź do logowania
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-white font-light">Osoby, które Cię polubiły</h1>
        <span className="text-cyan-300 text-sm">Saldo: {tokens} serduszek</span>
      </div>

      {!unlockedLikes && (
        <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4">
          <p className="text-white/80 text-sm">Odblokuj pełną listę polubień i zobacz wszystkich zainteresowanych.</p>
          <button
            onClick={onUnlockLikes}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-400/40 text-cyan-200 bg-cyan-500/10"
          >
            <Lock size={16} /> Odblokuj
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {liked.map((profile, idx) => {
          const hidden = !unlockedLikes && idx >= 3;
          return (
            <article key={profile.id} className="glass rounded-2xl overflow-hidden border border-white/10 relative">
              <div className="relative aspect-[3/4]">
                <img
                  src={profile.image_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=80'}
                  alt={profile.name}
                  className={`w-full h-full object-cover ${hidden ? 'blur-md scale-105' : ''}`}
                />
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <h3 className="text-white text-lg">{hidden ? 'Ukryty profil' : `${profile.name}, ${profile.age ?? '?'}`}</h3>
                  <p className="text-cyan-300 text-sm">{hidden ? 'Odblokuj aby zobaczyć' : profile.city || 'Nieznana lokalizacja'}</p>
                </div>
              </div>
              {!hidden && (
                <div className="p-3">
                  <button
                    onClick={() => onMessage(profile)}
                    className="w-full rounded-xl py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white inline-flex items-center justify-center gap-2"
                  >
                    <ChatCircle size={16} weight="fill" /> Napisz wiadomość
                  </button>
                </div>
              )}
              {hidden && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Lock size={32} className="text-white/80" />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

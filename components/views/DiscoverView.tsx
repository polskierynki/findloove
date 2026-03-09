'use client';

import { Crown, Heart, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Profile } from '@/lib/types';

interface DiscoverViewProps {
  profiles: Profile[];
  discoverIndex: number;
  onNext: () => void;
  onLike: (profile: Profile) => void;
  onViewProfile: (profile: Profile) => void;
  onOpenMessages: (profile: Profile) => void;
  onOpenPremium: () => void;
  isPremium: boolean;
  canStartSpeedDate: () => boolean;
  registerSpeedDate: () => void;
}

export default function DiscoverView({
  profiles,
  discoverIndex,
  onNext,
  onLike,
  onViewProfile,
  onOpenMessages,
  onOpenPremium,
  isPremium,
  canStartSpeedDate,
  registerSpeedDate,
}: DiscoverViewProps) {
  if (!profiles.length) {
    return <div className="glass rounded-3xl p-8 text-center text-cyan-300">Brak profili do odkrycia.</div>;
  }

  const profile = profiles[Math.abs(discoverIndex) % profiles.length];

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-cyan-300 hover:text-white"
      >
        <RefreshCw size={16} /> Losuj kolejny profil
      </button>

      <div className="glass rounded-[2rem] overflow-hidden border border-white/10">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[420px]">
            <img
              src={profile.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80'}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07050f] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-3xl text-white font-medium">
                {profile.name}, {profile.age ?? '?'}
              </h2>
              <p className="text-cyan-300 text-sm">{profile.city || 'Nieznana lokalizacja'}</p>
            </div>
          </div>

          <div className="p-6 lg:p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-cyan-300/70">Szybkie randki</span>
              <span
                className={`text-xs px-3 py-1 rounded-full border ${
                  isPremium
                    ? 'border-amber-400/40 text-amber-300 bg-amber-500/10'
                    : 'border-cyan-400/30 text-cyan-300 bg-cyan-500/10'
                }`}
              >
                {isPremium ? 'Premium' : 'Standard'}
              </span>
            </div>

            <p className="text-white/80 leading-relaxed">
              {profile.bio || 'Poznaj tę osobę i sprawdź, czy nadajecie na tych samych falach.'}
            </p>

            <div className="flex flex-wrap gap-2">
              {(profile.interests || []).slice(0, 6).map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1.5 rounded-full text-sm bg-white/5 border border-white/10 text-cyan-200"
                >
                  {interest}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-auto">
              <button
                onClick={() => onLike(profile)}
                className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 rounded-xl py-3 text-white font-medium flex items-center justify-center gap-2"
              >
                <Heart size={18} /> Polub
              </button>
              <button
                onClick={() => onOpenMessages(profile)}
                className="glass border border-white/20 rounded-xl py-3 text-white font-medium flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} /> Napisz
              </button>
              <button
                onClick={() => onViewProfile(profile)}
                className="glass border border-cyan-500/30 rounded-xl py-3 text-cyan-300 col-span-2"
              >
                Zobacz pełny profil
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-white/70">Tryb szybkich randek działa bezpośrednio na Twoim aktywnym koncie.</p>
        <button
          onClick={() => {
            if (!canStartSpeedDate()) {
              onOpenPremium();
              return;
            }
            registerSpeedDate();
          }}
          className="inline-flex items-center justify-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 rounded-xl px-4 py-2.5 text-cyan-200"
        >
          <Sparkles size={16} /> Uruchom szybką randkę {isPremium && <Crown size={14} className="text-amber-300" />}
        </button>
      </div>
    </section>
  );
}

'use client';

import { ChevronLeft, Crown, MessageCircle, Sparkles, Zap } from 'lucide-react';

interface PremiumViewProps {
  isPremium: boolean;
  onBack: () => void;
  onActivatePremium: () => void;
}

export default function PremiumView({ isPremium, onBack, onActivatePremium }: PremiumViewProps) {
  return (
    <section className="max-w-5xl mx-auto space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-cyan-300 hover:text-white">
        <ChevronLeft size={18} /> Wróć
      </button>

      <div className="glass rounded-[2rem] p-8 border border-cyan-500/20">
        <p className="text-xs uppercase tracking-wider text-cyan-300 mb-2">findloove premium</p>
        <h1 className="text-4xl text-white font-light mb-3">Odblokuj pełne możliwości</h1>
        <p className="text-white/70 max-w-3xl">Więcej rozmów, priorytetowe dopasowania i rozszerzone funkcje profilu w jednym planie.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 border border-white/10">
          <Sparkles className="text-cyan-300 mb-3" size={20} />
          <h3 className="text-white mb-1">Lepsze dopasowania</h3>
          <p className="text-sm text-white/60">Algorytm premium podnosi trafność rekomendacji.</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/10">
          <MessageCircle className="text-cyan-300 mb-3" size={20} />
          <h3 className="text-white mb-1">Więcej czatów</h3>
          <p className="text-sm text-white/60">Większe limity wiadomości i szybsze odpowiedzi.</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/10">
          <Zap className="text-amber-300 mb-3" size={20} />
          <h3 className="text-white mb-1">Wyróżnienie profilu</h3>
          <p className="text-sm text-white/60">Twoje konto częściej pojawia się w odkrywaniu.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border border-amber-500/30 text-center">
        {isPremium ? (
          <>
            <p className="text-amber-300 inline-flex items-center gap-2"><Crown size={16} /> Premium jest aktywne</p>
            <p className="text-white/70 mt-2">Masz odblokowane wszystkie funkcje premium.</p>
          </>
        ) : (
          <>
            <p className="text-white text-xl mb-2">Aktywuj Premium (demo)</p>
            <p className="text-white/65 mb-5">Jedno kliknięcie aktywuje pełny dostęp testowy.</p>
            <button onClick={onActivatePremium} className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold px-6 py-3 rounded-xl">
              Włącz Premium
            </button>
          </>
        )}
      </div>
    </section>
  );
}

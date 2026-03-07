'use client';

import { ChevronLeft, Crown, Sparkles, MessageCircle, HeartHandshake, ShieldCheck } from 'lucide-react';

interface PremiumViewProps {
  isPremium: boolean;
  onBack: () => void;
  onActivatePremium: () => void;
}

export default function PremiumView({ isPremium, onBack, onActivatePremium }: PremiumViewProps) {
  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-300">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
        >
          <ChevronLeft size={20} />
          Wroc
        </button>
        <div className="bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 border border-amber-200 rounded-3xl p-8">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-amber-700 mb-3">
            <Crown size={14} /> Plan Premium
          </p>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-3">Odblokuj pelna wersje findloove.pl</h1>
          <p className="text-slate-700 text-lg max-w-3xl">
            Premium daje wiecej rozmow, brak limitow i Asystenta AI podczas szybkich randek.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 font-bold mb-3">
            <Sparkles size={16} /> Asystent AI
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Inteligentne podpowiedzi wiadomosci w anonimowym czacie.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600 font-bold mb-3">
            <MessageCircle size={16} /> Bez limitu rozmow
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Napisz do wiekszej liczby nowych osob bez dziennych ograniczen.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 font-bold mb-3">
            <HeartHandshake size={16} /> Nielimitowane randki
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Szybkie randki bez limitu 3 na godzine i wiecej okazji do dopasowan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">Miesieczny</p>
          <p className="text-3xl font-bold text-slate-900 mb-2">39 zl / mies.</p>
          <p className="text-sm text-slate-500">Elastyczny plan bez dlugiego zobowiazania.</p>
        </div>

        <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 shadow-md relative overflow-hidden">
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest bg-amber-400 text-slate-900 px-2 py-1 rounded-full">
            Najczesciej wybierany
          </span>
          <p className="text-xs uppercase tracking-widest font-bold text-amber-700 mb-2">3 miesiace</p>
          <p className="text-3xl font-bold text-slate-900 mb-2">99 zl / 3 mies.</p>
          <p className="text-sm text-slate-600">Najlepsza cena i komplet funkcji premium.</p>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-3xl p-8 text-center">
        <div className="inline-flex items-center gap-2 text-amber-300 font-bold mb-3">
          <ShieldCheck size={16} /> Tryb wdrozenia (demo)
        </div>
        {isPremium ? (
          <>
            <p className="text-xl font-bold mb-2">Premium jest juz aktywne</p>
            <p className="text-slate-300 mb-6">Masz odblokowane funkcje premium w tej sesji aplikacji.</p>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors"
            >
              Wroc do aplikacji
            </button>
          </>
        ) : (
          <>
            <p className="text-xl font-bold mb-2">Aktywuj Premium testowo jednym kliknieciem</p>
            <p className="text-slate-300 mb-6">Na tym etapie to bezplatna aktywacja demonstracyjna, bez platnosci.</p>
            <button
              onClick={onActivatePremium}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-slate-900 font-bold hover:bg-amber-500 transition-colors"
            >
              <Crown size={16} /> Aktywuj Premium (demo)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

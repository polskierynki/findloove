'use client';

import { ChevronLeft } from 'lucide-react';

interface CookiesViewProps {
  onBack: () => void;
}

export default function CookiesView({ onBack }: CookiesViewProps) {
  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-cyan-300 hover:text-white">
        <ChevronLeft size={18} /> Wróć
      </button>
      <div className="glass rounded-[2rem] p-8 border border-white/10">
        <h1 className="text-3xl text-white font-light mb-4">Polityka cookies</h1>
        <div className="space-y-3 text-white/75 leading-relaxed">
          <p>Używamy cookies do sesji logowania, bezpieczeństwa i utrzymania preferencji użytkownika.</p>
          <p>Możesz zarządzać cookies w ustawieniach swojej przeglądarki.</p>
          <p>Wyłączenie niektórych cookies może ograniczyć działanie części funkcji aplikacji.</p>
        </div>
      </div>
    </section>
  );
}

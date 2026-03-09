'use client';

import { ChevronLeft, ShieldCheck } from 'lucide-react';

interface SafetyViewProps {
  onBack: () => void;
}

export default function SafetyView({ onBack }: SafetyViewProps) {
  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-cyan-300 hover:text-white">
        <ChevronLeft size={18} /> Wróć
      </button>

      <div className="glass rounded-[2rem] p-8 border border-cyan-500/20">
        <h1 className="text-3xl text-white font-light mb-3 inline-flex items-center gap-2">
          <ShieldCheck size={24} className="text-cyan-300" /> Bezpieczeństwo
        </h1>
        <p className="text-white/70">Dbaj o swoje dane, nie wysyłaj pieniędzy obcym i wybieraj pierwsze spotkania w miejscach publicznych.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {[
          'Nie udostępniaj danych osobowych na starcie rozmowy.',
          'Zgłaszaj profile budzące podejrzenia.',
          'Weryfikuj konto i dodaj aktualne zdjęcia.',
          'Ustalaj spotkania tylko w publicznych lokalizacjach.',
        ].map((tip) => (
          <article key={tip} className="glass rounded-2xl p-5 border border-white/10 text-white/80">
            {tip}
          </article>
        ))}
      </div>
    </section>
  );
}

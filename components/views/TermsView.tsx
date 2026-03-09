'use client';

import { ChevronLeft } from 'lucide-react';

interface TermsViewProps {
  onBack: () => void;
}

export default function TermsView({ onBack }: TermsViewProps) {
  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-cyan-300 hover:text-white">
        <ChevronLeft size={18} /> Wróć
      </button>
      <div className="glass rounded-[2rem] p-8 border border-white/10">
        <h1 className="text-3xl text-white font-light mb-4">Regulamin findloove.pl</h1>
        <div className="space-y-3 text-white/75 leading-relaxed">
          <p>Korzystając z serwisu akceptujesz zasady społeczności i warunki bezpieczeństwa.</p>
          <p>Zakazane są treści obraźliwe, oszustwa, spam i podszywanie się pod inne osoby.</p>
          <p>Administracja może moderować treści oraz blokować konta naruszające regulamin.</p>
          <p>Pełna wersja dokumentu prawnego jest dostępna u operatora serwisu.</p>
        </div>
      </div>
    </section>
  );
}

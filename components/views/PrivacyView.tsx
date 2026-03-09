'use client';

import { ChevronLeft } from 'lucide-react';

interface PrivacyViewProps {
  onBack: () => void;
}

export default function PrivacyView({ onBack }: PrivacyViewProps) {
  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-cyan-300 hover:text-white">
        <ChevronLeft size={18} /> Wróć
      </button>
      <div className="glass rounded-[2rem] p-8 border border-white/10">
        <h1 className="text-3xl text-white font-light mb-4">Polityka prywatności</h1>
        <div className="space-y-3 text-white/75 leading-relaxed">
          <p>Przetwarzamy dane wyłącznie w celu działania platformy i poprawy jakości usług.</p>
          <p>Masz prawo do wglądu, poprawiania oraz usunięcia swoich danych.</p>
          <p>Dane logowania i sesji są chronione przez mechanizmy Supabase i szyfrowanie transportu.</p>
          <p>W sprawach RODO skontaktuj się z administratorem serwisu.</p>
        </div>
      </div>
    </section>
  );
}

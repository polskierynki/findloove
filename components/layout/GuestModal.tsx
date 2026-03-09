'use client';

import { Lock, Sparkles, X } from 'lucide-react';

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  onLogin: () => void;
  variant?: 'clicks' | 'timeout' | 'feature';
  featureName?: string;
  remainingTime?: number;
}

export default function GuestModal({
  isOpen,
  onClose,
  onRegister,
  onLogin,
  variant = 'clicks',
  featureName,
  remainingTime = 0,
}: GuestModalProps) {
  if (!isOpen) return null;

  const title =
    variant === 'timeout'
      ? 'Limit czasu gościa'
      : variant === 'feature'
      ? `${featureName || 'Ta funkcja'} wymaga konta`
      : 'Limit przeglądania osiągnięty';

  const desc =
    variant === 'timeout'
      ? remainingTime > 0
        ? `Kolejna sesja za ${remainingTime}s lub odblokuj pełny dostęp po rejestracji.`
        : 'Czas gościa się skończył. Załóż konto, aby kontynuować bez limitów.'
      : 'Dołącz za darmo, aby odblokować wiadomości, polubienia i pełny podgląd profili.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-modal w-full max-w-md rounded-[2rem] p-7 border border-cyan-500/30">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
            <Lock size={24} className="text-cyan-300" />
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <h2 className="text-2xl text-white font-light mb-2">{title}</h2>
        <p className="text-white/70 text-sm leading-relaxed mb-6">{desc}</p>

        <div className="space-y-3">
          <button
            onClick={onRegister}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-medium inline-flex items-center justify-center gap-2"
          >
            <Sparkles size={16} /> Załóż darmowe konto
          </button>
          <button
            onClick={onLogin}
            className="w-full py-2.5 rounded-xl border border-white/20 text-white/90 hover:bg-white/5"
          >
            Mam już konto - zaloguj
          </button>
        </div>
      </div>
    </div>
  );
}

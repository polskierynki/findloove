'use client';

import { X, Heart, Users, Sparkles, Lock } from 'lucide-react';

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  onLogin: () => void;
  variant?: 'clicks' | 'timeout' | 'feature';
  featureName?: string;
}

export default function GuestModal({ 
  isOpen, 
  onClose, 
  onRegister, 
  onLogin,
  variant = 'clicks',
  featureName 
}: GuestModalProps) {
  if (!isOpen) return null;

  const content = {
    clicks: {
      icon: <Sparkles size={48} className="text-rose-500" />,
      title: 'Poznaj więcej osób!',
      description: 'Osiągnąłeś limit przeglądania. Załóż darmowe konto aby odkryć wszystkie profile i funkcje portalu.',
      benefits: [
        'Przeglądaj nieograniczoną liczbę profili',
        'Wysyłaj wiadomości do osób które Cię zainteresowały',
        'Zobacz kto polubił Twój profil',
        'Otrzymuj powiadomienia o nowych dopasowaniach',
      ],
    },
    timeout: {
      icon: <Lock size={48} className="text-amber-500" />,
      title: 'Czas się skończył',
      description: 'Wykorzystałeś dostępny czas przeglądania. Utwórz konto aby kontynuować bez ograniczeń.',
      benefits: [
        'Nieograniczony dostęp 24/7',
        'Pełna kontrola nad profilem',
        'Zabezpieczone wiadomości',
        'Darmowa weryfikacja tożsamości',
      ],
    },
    feature: {
      icon: <Heart size={48} className="text-rose-500" fill="currentColor" />,
      title: `${featureName || 'Ta funkcja'} wymaga konta`,
      description: 'Ta funkcja jest dostępna tylko dla zarejestrowanych użytkowników. Dołącz do nas za darmo!',
      benefits: [
        'Polub profile które Cię zainteresowały',
        'Napisz bezpośrednią wiadomość',
        'Poznaj swoje dopasowania',
        'Buduj prawdziwe relacje',
      ],
    },
  };

  const { icon, title, description, benefits } = content[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative p-8 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4">
              {icon}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
            <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="px-8 pb-6">
          <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl p-5 border border-rose-100">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Co zyskujesz?</p>
            <ul className="space-y-2.5">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <span className="leading-snug">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social proof */}
        <div className="px-8 pb-6">
          <div className="flex items-center justify-center gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-rose-600">1 524</div>
              <div className="text-xs text-slate-400">Członków</div>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div>
              <div className="text-2xl font-bold text-rose-600">87</div>
              <div className="text-xs text-slate-400">Par w tym miesiącu</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 space-y-3">
          <button
            onClick={onRegister}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
          >
            <Users size={20} />
            Załóż darmowe konto
            <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
          </button>
          
          <button
            onClick={onLogin}
            className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
          >
            Mam już konto - Zaloguj się
          </button>

          <p className="text-center text-xs text-slate-400 leading-relaxed pt-2">
            Rejestracja jest w 100% darmowa i zajmuje mniej niż 2 minuty
          </p>
        </div>
      </div>
    </div>
  );
}

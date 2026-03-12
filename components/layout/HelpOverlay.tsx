'use client';

import { HelpCircle } from 'lucide-react';
import { ViewType } from '@/lib/types';

interface HelpOverlayProps {
  currentView: ViewType;
  onClose: () => void;
}

const HELP_TEXTS: Record<ViewType, string> = {
  home: "To jest Twój ekran główny portalu findloove.pl. Tutaj widzisz polecane osoby oraz rady, jak bezpiecznie korzystać z serwisu.",
    discover: "To zakładka Szybkie Randki. Najpierw odpowiadasz anonimowo na 3 pytania, potem masz 3 minuty rozmowy i na końcu obie strony decydują, czy chcą stałego kontaktu.",
  messages: "To Twoja skrzynka pocztowa. Tu możesz pisać wiadomości do osób, które Cię zainteresowały.",
  profile: "Tutaj czytasz szczegóły o danej osobie. Możesz poprosić o numer telefonu lub wysłać wiadomość.",
  safety: "To poradnik bezpiecznej randki. Przeczytaj go, aby wiedzieć, jak unikać oszustów w internecie.",
  likes: "Tutaj zobaczysz osoby, którym spodobał się Twój profil w findloove.pl.",
  friends: "W zakładce Znajomi zarządzasz kontaktami, zaproszeniami i ulubionymi profilami.",
  search: "Tu możesz wyszukać profile według wieku, miasta, zainteresowań i stylu życia. Użyj filtrów, by znaleźć kogoś bliskiego sercu.",
  auth: "Tu możesz się zalogować lub założyć konto w findloove.pl. Możesz użyć swojego konta Facebook, Google lub Apple, albo zwykłego adresu e-mail.",
  register: "Kreator rejestracji przeprowadzi Cię przez kilka kroków: płeć, imię, miasto, czego szukasz, zainteresowania i weryfikację twarzy. Na końcu założysz konto e-mail.",
  terms: "Tu czytasz Regulamin portalu findloove.pl — zasady, które obowiązują wszystkich użytkowników. Ważne jest, aby je znać, aby korzystać bezpiecznie.",
  privacy: "To nasza Polityka Prywatności. Wyjaśniamy tutaj, jakie dane zbieramy, jak je chronimy i jakie masz prawa.",
  cookies: "Tutaj dowiesz się o cookies — małych plikach, które pomagają portalowi działać lepiej. Możesz zmienić swoje preferencje dotyczące cookies.",
};

export default function HelpOverlay({ currentView, onClose }: HelpOverlayProps) {
  const text =
    HELP_TEXTS[currentView] ||
    "Nie martw się, wszystko jest proste! Jeśli potrzebujesz pomocy, zadzwoń do nas na infolinię portalu findloove.pl.";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] p-10 max-w-xl shadow-2xl border-4 border-amber-400 animate-in zoom-in duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-amber-100 p-4 rounded-full">
            <HelpCircle size={40} className="text-amber-600" />
          </div>
          <h2 className="text-3xl font-serif font-bold">Asystent Pomocy</h2>
        </div>
        <p className="text-2xl text-slate-700 leading-relaxed mb-8">{text}</p>
        <button
          onClick={onClose}
          className="w-full bg-slate-800 text-white py-5 rounded-2xl text-xl font-bold hover:bg-slate-900 transition-all"
        >
          Rozumiem, dziękuję
        </button>
      </div>
    </div>
  );
}

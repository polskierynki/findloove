'use client';

import { useState } from 'react';
import {
  ChevronLeft, ShieldCheck, AlertTriangle, Coffee, Phone, Eye, Lock,
  Heart, ChevronDown, ChevronUp, Flag, UserX, MessageSquareWarning, BadgeCheck,
} from 'lucide-react';

interface SafetyViewProps {
  onBack: () => void;
}

const TIPS = [
  {
    icon: <BadgeCheck size={24} className="text-emerald-500" />,
    bg: 'bg-emerald-50 border-emerald-100',
    title: 'Weryfikacja tożsamości',
    text: 'Zielona tarcza przy profilu oznacza, że zweryfikowaliśmy tę osobę za pomocą dokumentu tożsamości. Zawsze preferuj kontakt z osobami zweryfikowanymi.',
  },
  {
    icon: <Lock size={24} className="text-blue-500" />,
    bg: 'bg-blue-50 border-blue-100',
    title: 'Chroń swoje dane',
    text: 'Nie podawaj numeru telefonu, adresu domowego ani numeru PESEL przed osobistym spotkaniem. Komunikuj się przez wbudowany czat.',
  },
  {
    icon: <AlertTriangle size={24} className="text-amber-500" />,
    bg: 'bg-amber-50 border-amber-100',
    title: 'Nigdy nie wysyłaj pieniędzy',
    text: 'Prośby o "pożyczkę na bilet", "leczenie" czy "pilną pomoc" to klasyczne sygnały oszustwa. Prawdziwa randka nigdy nie zaczyna się od próśb finansowych.',
  },
  {
    icon: <Coffee size={24} className="text-rose-500" />,
    bg: 'bg-rose-50 border-rose-100',
    title: 'Pierwsze spotkanie — miejsce publiczne',
    text: 'Kawiarnia, park, restauracja — zawsze wybieraj miejsca publiczne na pierwsze kilka spotkań. Nie jedź do domu nieznajomego i nie zapraszaj go do siebie.',
  },
  {
    icon: <Phone size={24} className="text-violet-500" />,
    bg: 'bg-violet-50 border-violet-100',
    title: 'Powiedz komuś bliskim',
    text: 'Przed każdym spotkaniem poinformuj dziecko, wnuka lub przyjaciela: gdzie idziesz, z kim i o której wracasz. Wyślij im adres miejsca spotkania.',
  },
  {
    icon: <Eye size={24} className="text-slate-500" />,
    bg: 'bg-slate-50 border-slate-100',
    title: 'Sprawdź zdjęcia w wyszukiwarce',
    text: 'Wklej zdjęcie profilu do Google Images (kliknij prawym → "Szukaj obrazu"). Jeśli zdjęcie pochodzi z innej strony lub pojawia się pod innym nazwiskiem — to może być fałszywy profil.',
  },
];

const RED_FLAGS = [
  'Osoba nie chce rozmawiać przez wideo',
  'Prosi o pieniądze lub dane bankowe',
  'Historię życia zmienia przy każdej rozmowie',
  'Unika odpowiedzi na konkretne pytania',
  'Deklasuje innych ludzi, by wzbudzić litość',
  'Chce przenieść kontakt na WhatsApp w ciągu pierwszych dni',
  'Przesadnie szybko wyraża "głębokie uczucia"',
];

const FAQS = [
  {
    q: 'Jak zgłosić podejrzany profil?',
    a: 'Wejdź w rozmowę z daną osobą i naciśnij przycisk "Zgłoś" na pasku akcji. Możesz też wejść w jej profil i wybrać opcję zgłoszenia. Nasz zespół sprawdziuwadomości w ciągu 24h.',
  },
  {
    q: 'Czy moje dane są bezpieczne?',
    a: 'Tak. findloove.pl stosuje szyfrowanie SSL i nie sprzedaje danych osobowych. Twój numer telefonu i adres e-mail są widoczne wyłącznie dla Ciebie.',
  },
  {
    q: 'Co zrobić, jeśli ktoś mnie nęka?',
    a: 'Użyj przycisku "Zablokuj" w oknie rozmowy — osoba natychmiast traci możliwość kontaktu z Tobą. Następnie zgłoś incydent przez formularz lub zadzwoń na naszą infolinię.',
  },
  {
    q: 'Czy mogę usunąć swoje konto?',
    a: 'Tak, w każdej chwili. Wejdź w Ustawienia → Konto → Usuń konto. Wszystkie Twoje dane i wiadomości zostają trwale usunięte w ciągu 30 dni.',
  },
];

export default function SafetyView({ onBack }: SafetyViewProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto pb-16 animate-in slide-in-from-bottom duration-500">
      {/* Powrót */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-slate-500 hover:text-rose-500 transition-colors text-sm font-medium mb-6"
      >
        <ChevronLeft size={16} /> Wróć
      </button>

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white mb-6 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck size={36} />
          <h1 className="text-2xl font-bold">Twoje bezpieczeństwo jest dla nas priorytetem</h1>
        </div>
        <p className="text-emerald-50 text-sm leading-relaxed">
          findloove.pl to miejsce dla dojrzałych, ufających siebie ludzi. Przeczytaj nasze zasady, by każda znajomość była przyjemna i spokojna.
        </p>
        <div className="flex gap-4 mt-5">
          <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">100%</div>
            <div className="text-xs text-emerald-100">szyfrowanych rozmów</div>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">24h</div>
            <div className="text-xs text-emerald-100">czas reakcji na zgłoszenie</div>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">✓</div>
            <div className="text-xs text-emerald-100">weryfikacja tożsamości</div>
          </div>
        </div>
      </div>

      {/* Porady */}
      <h2 className="text-base font-bold text-slate-700 mb-3 px-1">Zasady bezpiecznego korzystania</h2>
      <div className="space-y-3 mb-8">
        {TIPS.map((tip, i) => (
          <div
            key={i}
            className={`flex gap-4 items-start p-4 rounded-xl border ${tip.bg}`}
          >
            <div className="shrink-0 mt-0.5 w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
              {tip.icon}
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 text-sm mb-0.5">{tip.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Czerwone Flagi */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Flag size={18} className="text-red-500" />
          <h2 className="font-bold text-red-700 text-sm">Czerwone flagi — reaguj natychmiast</h2>
        </div>
        <ul className="space-y-2">
          {RED_FLAGS.map((flag, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-red-700">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0 mt-1.5" />
              {flag}
            </li>
          ))}
        </ul>
      </div>

      {/* Szybkie akcje */}
      <h2 className="text-base font-bold text-slate-700 mb-3 px-1">Masz problem? Działaj szybko</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <button className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Flag size={18} className="text-amber-600" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Zgłoś profil</span>
          <span className="text-[10px] text-slate-400 text-center">Podejrzany użytkownik lub fałszywe zdjęcia</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <UserX size={18} className="text-orange-600" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Zablokuj użytkownika</span>
          <span className="text-[10px] text-slate-400 text-center">Osoba Cię nęka lub Cię nie szanuje</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
            <MessageSquareWarning size={18} className="text-rose-600" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Zgłoś rozmowę</span>
          <span className="text-[10px] text-slate-400 text-center">Nieodpowiednie treści w wiadomościach</span>
        </button>
      </div>

      {/* FAQ */}
      <h2 className="text-base font-bold text-slate-700 mb-3 px-1">Najczęstsze pytania</h2>
      <div className="space-y-2 mb-8">
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-slate-800">{faq.q}</span>
              {openFaq === i
                ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
                : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
            </button>
            {openFaq === i && (
              <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Infolinia */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center shrink-0">
          <Heart size={22} className="text-rose-300" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="font-bold text-sm mb-0.5">Infolinia findloove.pl</h3>
          <p className="text-slate-300 text-xs">Czynna pn–pt, godz. 9:00–17:00. Nasi konsultanci chętnie pomogą.</p>
        </div>
        <a
          href="tel:+48221234567"
          className="bg-rose-500 hover:bg-rose-600 transition-colors text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow shrink-0"
        >
          📞 22 123 45 67
        </a>
      </div>
    </div>
  );
}

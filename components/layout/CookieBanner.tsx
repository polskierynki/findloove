'use client';

import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Sprawdź czy użytkownik już zaakceptował cookies
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Pokaż banner po krótkiej chwili dla lepszego UX
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-t-2 border-amber-400 shadow-2xl">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Ikona + tekst */}
            <div className="flex items-start gap-3 flex-1">
              <div className="shrink-0 w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center">
                <Cookie size={20} className="text-slate-900" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm mb-1">🍪 Używamy plików cookies</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Aby zapewnić jak najlepsze wrażenia, używamy technologii takich jak pliki cookie do przechowywania i/lub uzyskiwania dostępu do informacji o urządzeniu. 
                  Zgoda na te technologie pozwoli nam przetwarzać dane niezbędne do działania serwisu.{' '}
                  <button 
                    onClick={() => window.location.href = '#cookies'}
                    className="text-amber-300 hover:text-amber-200 underline font-semibold"
                  >
                    Dowiedz się więcej
                  </button>
                </p>
              </div>
            </div>

            {/* Przyciski akcji */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleReject}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors"
              >
                Odrzuć
              </button>
              <button
                onClick={handleAccept}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 text-sm font-bold shadow-lg hover:from-amber-500 hover:to-orange-500 transition-all hover:shadow-xl"
              >
                Akceptuję
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

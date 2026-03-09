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
    <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 animate-in slide-in-from-bottom duration-500">
      <div className="glass-modal relative overflow-hidden rounded-[1.6rem] border border-cyan-500/25 px-5 py-4 shadow-[0_12px_45px_rgba(0,0,0,0.45),0_0_35px_rgba(0,255,255,0.12)] sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -right-6 h-28 w-28 rounded-full bg-fuchsia-500/20 blur-2xl" />

        <button
          onClick={handleReject}
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Zamknij okno cookies"
        >
          <X size={16} />
        </button>

        <div className="relative z-10 flex flex-col gap-4 sm:gap-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="mt-0.5 shrink-0 rounded-xl border border-cyan-500/30 bg-cyan-500/15 p-2.5 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              <Cookie size={18} className="text-cyan-300" />
            </div>

            <div className="flex-1 pr-8 sm:pr-10">
              <h3 className="mb-1 text-sm font-semibold tracking-wide text-white sm:text-base">
                Używamy plików cookies
              </h3>
              <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
                Korzystamy z cookies, aby utrzymać logowanie, bezpieczeństwo i spójne działanie serwisu.
                Możesz zaakceptować wszystkie lub zostawić tylko niezbędne.
                {' '}
                <button
                  onClick={() => window.location.assign('/cookies')}
                  className="font-medium text-cyan-300 underline decoration-cyan-400/50 underline-offset-2 transition-colors hover:text-cyan-200"
                >
                  Dowiedz się więcej
                </button>
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={handleReject}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 transition-all hover:border-white/25 hover:bg-white/10"
            >
              Tylko niezbędne
            </button>

            <button
              onClick={handleAccept}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(0,255,255,0.22)] transition-all hover:from-cyan-500 hover:to-fuchsia-500 hover:shadow-[0_0_24px_rgba(217,70,239,0.3)]"
            >
              Akceptuję wszystkie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

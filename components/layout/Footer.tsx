'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { ViewType } from '@/lib/types';
import { useLegal } from '@/lib/context/LegalContext';
import LegalModal from '@/components/layout/LegalModal';
import { TERMS_OF_SERVICE } from '@/lib/legal/termsOfService';
import { PRIVACY_POLICY } from '@/lib/legal/privacyPolicy';
import BrandWordmark from './BrandWordmark';

interface FooterProps {
  onNavigate?: (view: ViewType | 'myprofile') => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const { openTerms, openPrivacy, showTerms, showPrivacy, closeTerms, closePrivacy } = useLegal();
  const [year, setYear] = useState<number>(() => new Date().getUTCFullYear());

  useEffect(() => {
    setYear(new Date().getUTCFullYear());
  }, []);

  return (
    <footer className="mt-20 border-t border-cyan-500/20 bg-black/60 backdrop-blur-md">
      <div className="max-w-[2200px] mx-auto px-6 lg:px-12 py-10">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="mb-4 text-white">
              <BrandWordmark 
                className="text-2xl md:text-3xl font-semibold tracking-wide" 
                accentClassName="text-cyan-400"
              />
            </div>
            <p className="text-sm text-white/70 font-light leading-relaxed">Społeczność findloove.pl łączy ludzi szukających realnych relacji.</p>
          </div>

          <div>
            <h4 className="text-sm uppercase tracking-wider text-cyan-400 mb-3 font-medium">Nawigacja</h4>
            <div className="space-y-2 text-sm">
              <button onClick={() => onNavigate?.('home')} className="block text-white/70 hover:text-cyan-400 transition-colors font-light">Strona główna</button>
              <button onClick={() => onNavigate?.('search')} className="block text-white/70 hover:text-cyan-400 transition-colors font-light">Szukaj</button>
              <button onClick={() => onNavigate?.('messages')} className="block text-white/70 hover:text-cyan-400 transition-colors font-light">Wiadomości</button>
              <button onClick={() => onNavigate?.('friends')} className="block text-white/70 hover:text-cyan-400 transition-colors font-light">Znajomi</button>
              <button onClick={() => onNavigate?.('safety')} className="block text-white/70 hover:text-cyan-400 transition-colors font-light">Bezpieczeństwo</button>
            </div>
          </div>

          <div>
            <h4 className="text-sm uppercase tracking-wider text-cyan-400 mb-3 font-medium">Kontakt</h4>
            <a href="mailto:pomoc@findloove.pl" className="inline-flex items-center gap-2 text-white/70 hover:text-cyan-400 transition-colors text-sm">
              <Mail size={16} className="text-cyan-300" /> pomoc@findloove.pl
            </a>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/60">
              <button onClick={openTerms} className="hover:text-cyan-400 transition-colors">Regulamin</button>
              <button onClick={openPrivacy} className="hover:text-cyan-400 transition-colors">Prywatność</button>
              <button onClick={() => onNavigate?.('cookies')} className="hover:text-cyan-400 transition-colors">Cookies</button>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/40 font-light">© {year} findloove.pl. Wszelkie prawa zastrzeżone.</div>
      </div>

      <LegalModal isOpen={showTerms} onClose={closeTerms} type="terms" content={TERMS_OF_SERVICE} />
      <LegalModal isOpen={showPrivacy} onClose={closePrivacy} type="privacy" content={PRIVACY_POLICY} />
    </footer>
  );
}

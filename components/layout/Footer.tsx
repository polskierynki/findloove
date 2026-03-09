'use client';

import Image from 'next/image';
import { Mail } from 'lucide-react';
import { ViewType } from '@/lib/types';
import { useLegal } from '@/lib/context/LegalContext';
import LegalModal from '@/components/layout/LegalModal';
import { TERMS_OF_SERVICE } from '@/lib/legal/termsOfService';
import { PRIVACY_POLICY } from '@/lib/legal/privacyPolicy';

interface FooterProps {
  onNavigate?: (view: ViewType | 'myprofile') => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const { openTerms, openPrivacy, showTerms, showPrivacy, closeTerms, closePrivacy } = useLegal();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-white/10 bg-black/30 backdrop-blur-sm">
      <div className="max-w-[2200px] mx-auto px-6 lg:px-12 py-10">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="inline-block bg-white/90 rounded-lg p-2 mb-3">
              <Image src="/logo/logo.jpg" alt="findloove.pl" width={132} height={34} className="h-8 w-auto object-contain" />
            </div>
            <p className="text-sm text-white/60 leading-relaxed">Społeczność findloove.pl łączy ludzi szukających realnych relacji.</p>
          </div>

          <div>
            <h4 className="text-sm uppercase tracking-wider text-cyan-300 mb-3">Nawigacja</h4>
            <div className="space-y-2 text-sm">
              <button onClick={() => onNavigate?.('home')} className="block text-white/70 hover:text-white">Strona główna</button>
              <button onClick={() => onNavigate?.('search')} className="block text-white/70 hover:text-white">Szukaj</button>
              <button onClick={() => onNavigate?.('messages')} className="block text-white/70 hover:text-white">Wiadomości</button>
              <button onClick={() => onNavigate?.('safety')} className="block text-white/70 hover:text-white">Bezpieczeństwo</button>
            </div>
          </div>

          <div>
            <h4 className="text-sm uppercase tracking-wider text-cyan-300 mb-3">Kontakt</h4>
            <a href="mailto:pomoc@findloove.pl" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
              <Mail size={16} className="text-cyan-300" /> pomoc@findloove.pl
            </a>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/60">
              <button onClick={openTerms} className="hover:text-cyan-300">Regulamin</button>
              <button onClick={openPrivacy} className="hover:text-cyan-300">Prywatność</button>
              <button onClick={() => onNavigate?.('cookies')} className="hover:text-cyan-300">Cookies</button>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/45">© {year} findloove.pl. Wszelkie prawa zastrzeżone.</div>
      </div>

      <LegalModal isOpen={showTerms} onClose={closeTerms} type="terms" content={TERMS_OF_SERVICE} />
      <LegalModal isOpen={showPrivacy} onClose={closePrivacy} type="privacy" content={PRIVACY_POLICY} />
    </footer>
  );
}

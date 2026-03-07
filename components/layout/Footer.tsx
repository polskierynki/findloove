'use client';

import Image from 'next/image';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
import { ViewType } from '@/lib/types';

interface FooterProps {
  onNavigate?: (view: ViewType) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-100 mt-20 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* ── Górna część: kolumny ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Logo + opis */}
          <div className="md:col-span-1">
            <div className="mb-4 inline-block bg-white p-3 rounded-lg">
              <Image
                src="/logo/logo.jpg"
                alt="findloove.pl"
                width={140}
                height={36}
                className="h-9 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Portal społeczny do poznawania nowych ludzi. Zawiąż prawdziwe przyjaźnie i odkrywaj świat razem.
            </p>
          </div>

          {/* Linki szybkie */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Szybkie linki</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNavigate?.('home')} className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">Strona główna</button></li>
              <li><button onClick={() => onNavigate?.('discover')} className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">Odkrywaj profile</button></li>
              <li><button onClick={() => onNavigate?.('safety')} className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">O aplikacji</button></li>
              <li><a href="#" className="text-slate-400 hover:text-rose-400 transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Bezpieczeństwo */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Bezpieczeństwo</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNavigate?.('safety')} className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">Weryfikacja profilu</button></li>
              <li><button onClick={() => onNavigate?.('safety')} className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">Poradnik bezpieczeństwa</button></li>
              <li><a href="mailto:bezpieczenstwo@findloove.pl" className="text-slate-400 hover:text-rose-400 transition-colors">Zgłoś problem</a></li>
              <li><button onClick={() => onNavigate?.('privacy')} className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">Polityka RODO</button></li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Kontakt</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail size={16} className="text-rose-400 mt-0.5 shrink-0" />
                <a href="mailto:pomoc@findloove.pl" className="text-slate-400 hover:text-rose-400 transition-colors">pomoc@findloove.pl</a>
              </li>
              <li className="flex items-start gap-2">
                <Phone size={16} className="text-rose-400 mt-0.5 shrink-0" />
                <a href="tel:+48123456789" className="text-slate-400 hover:text-rose-400 transition-colors">+48 123 456 789</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-rose-400 mt-0.5 shrink-0" />
                <span className="text-slate-400">ul. Wiśniowa 15<br />00-000 Warszawa</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Separacja ── */}
        <div className="border-t border-slate-700 py-8"></div>

        {/* ── Dolna część: social + legal ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Social media */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Obserwuj nas:</span>
            <div className="flex gap-3">
              <a href="#" className="bg-slate-800 hover:bg-rose-500 p-2 rounded-lg transition-colors text-slate-300 hover:text-white" title="Facebook">
                <Facebook size={18} />
              </a>
              <a href="#" className="bg-slate-800 hover:bg-rose-500 p-2 rounded-lg transition-colors text-slate-300 hover:text-white" title="Twitter">
                <Twitter size={18} />
              </a>
              <a href="#" className="bg-slate-800 hover:bg-rose-500 p-2 rounded-lg transition-colors text-slate-300 hover:text-white" title="Instagram">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Legal links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400">
            <button onClick={() => onNavigate?.('terms')} className="hover:text-rose-400 transition-colors cursor-pointer">Regulamin</button>
            <button onClick={() => onNavigate?.('privacy')} className="hover:text-rose-400 transition-colors cursor-pointer">Polityka prywatności</button>
            <button onClick={() => onNavigate?.('cookies')} className="hover:text-rose-400 transition-colors cursor-pointer">Polityka cookies</button>
            <a href="#" className="hover:text-rose-400 transition-colors">Preferencje RODO</a>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-500 text-center md:text-right">
            <p>© {currentYear} findloove.pl. Wszelkie prawa zastrzeżone.</p>
            <p className="mt-1">Zrobione z ❤️ dla siniorów</p>
          </div>
        </div>

      </div>
    </footer>
  );
}

'use client';

import { Phone } from 'lucide-react';

interface SosButtonProps {
  onClick: () => void;
}

export default function SosButton({ onClick }: SosButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed right-8 bottom-24 bg-emerald-600 text-white p-5 rounded-[2rem] shadow-2xl hover:scale-110 transition-all border-4 border-white z-40 flex items-center gap-3"
    >
      <Phone size={32} />
      <span className="font-bold text-xl hidden md:block text-white">Pomoc Konsultanta</span>
    </button>
  );
}

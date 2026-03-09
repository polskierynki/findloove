'use client';

import { CheckCircle } from 'lucide-react';

interface NotificationProps {
  message: string;
}

export default function Notification({ message }: NotificationProps) {
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] glass-modal border border-cyan-500/30 text-white px-8 py-4 rounded-[1.5rem] shadow-[0_0_30px_rgba(0,255,255,0.25)] flex items-center gap-3 animate-in fade-in zoom-in duration-300">
      <div className="bg-cyan-500/20 p-2 rounded-full border border-cyan-400/40">
        <CheckCircle size={20} className="text-cyan-300" />
      </div>
      <span className="text-sm md:text-base">{message}</span>
    </div>
  );
}

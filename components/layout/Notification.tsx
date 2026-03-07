'use client';

import { CheckCircle } from 'lucide-react';

interface NotificationProps {
  message: string;
}

export default function Notification({ message }: NotificationProps) {
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 text-white px-12 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5 animate-in fade-in zoom-in duration-300 font-bold border-4 border-slate-700">
      <div className="bg-emerald-500 p-2 rounded-full">
        <CheckCircle size={24} />
      </div>
      <span className="text-xl">{message}</span>
    </div>
  );
}

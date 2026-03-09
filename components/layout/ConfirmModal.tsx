import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-modal rounded-[2rem] p-8 w-full max-w-sm animate-in fade-in zoom-in duration-300 border border-cyan-500/20">
        {title && <h3 className="text-lg font-medium mb-3 text-cyan-400">{title}</h3>}
        <div className="mb-6 text-white/80 text-sm font-light">{message}</div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full bg-gray-600/20 border border-gray-500/30 text-gray-300 font-medium text-sm hover:bg-gray-600/30 hover:border-gray-500/50 transition-all"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-medium text-sm shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all"
          >
            Potwierdź
          </button>
        </div>
      </div>
    </div>
  );
}

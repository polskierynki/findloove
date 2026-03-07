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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30">
      <div className="mt-40 bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs animate-in fade-in slide-in-from-top-8">
        {title && <h3 className="text-lg font-bold mb-2 text-rose-600">{title}</h3>}
        <div className="mb-4 text-slate-800 text-sm">{message}</div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-sm transition-colors"
          >
            Potwierdź
          </button>
        </div>
      </div>
    </div>
  );
}

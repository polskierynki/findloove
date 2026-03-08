'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordResetModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function PasswordResetModal({
  onClose,
  onSuccess,
  onError,
}: PasswordResetModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      onError('Hasło musi mieć minimum 6 znaków.');
      return;
    }

    if (newPassword !== confirmPassword) {
      onError('Hasła nie są identyczne.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      onError('Błąd zmiany hasła: ' + error.message);
    } else {
      // Wyczyść hash z URL
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      onSuccess('Hasło zostało pomyślnie zmienione. Możesz się teraz zalogować.');
      onClose();
    }
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white h-full md:h-auto w-full md:max-w-md md:rounded-2xl shadow-xl p-6 md:p-6 relative animate-in fade-in duration-200 overflow-y-auto">
        <button
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-2xl leading-none"
          onClick={onClose}
          aria-label="Zamknij"
          type="button"
        >
          ×
        </button>

        <h3 className="text-xl font-bold mb-2 text-slate-800">Ustaw nowe hasło</h3>
        <p className="text-sm text-slate-500 mb-5">
          Wprowadź swoje nowe hasło poniżej. Upewnij się, że jest bezpieczne.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nowe hasło */}
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nowe hasło"
              minLength={6}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Powtórz hasło */}
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              required
              type={showPassword2 ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Powtórz nowe hasło"
              minLength={6}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword2((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword2 ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Zmieniam hasło...' : 'Zmień hasło'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

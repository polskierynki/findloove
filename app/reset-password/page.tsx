'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type RecoveryStatus = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<RecoveryStatus>('checking');
  const [statusMessage, setStatusMessage] = useState('Weryfikuję link resetu hasła...');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    const resolveRecoverySession = async () => {
      if (typeof window === 'undefined') return;

      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
      const recoveryType = hashParams.get('type') || searchParams.get('type');
      const code = searchParams.get('code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // Check if Supabase returned an error
      if (errorCode) {
        if (!isActive) return;
        setStatus('invalid');
        
        if (errorCode === 'otp_expired') {
          setStatusMessage('Link resetu hasła wygasł. Linki są ważne przez 1 godzinę. Poproś o nowy link.');
        } else {
          const decodedDescription = errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : '';
          setStatusMessage(decodedDescription || 'Link resetu hasła jest nieprawidłowy. Poproś o nowy link.');
        }
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (!code && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isActive) return;

        // If we have a valid session with a user, the recovery link was valid
        if (session?.user) {
          setStatus('ready');
          setStatusMessage('Ustaw nowe hasło i zatwierdź zmianę.');

          // Clean sensitive auth hash params from URL.
          if (window.location.hash) {
            const cleanUrl = `${window.location.pathname}${window.location.search}`;
            window.history.replaceState(null, '', cleanUrl);
          }
          return;
        }

        setStatus('invalid');
        setStatusMessage('Link resetu hasła jest nieprawidłowy albo wygasł. Poproś o nowy link.');
      } catch (error: any) {
        if (!isActive) return;
        setStatus('invalid');
        setStatusMessage(error?.message || 'Nie udało się zweryfikować linku resetu hasła.');
      }
    };

    resolveRecoverySession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session?.user)) {
        setStatus('ready');
        setStatusMessage('Ustaw nowe hasło i zatwierdź zmianę.');
      }
    });

    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const redirectToLogin = () => {
    router.replace('/?view=auth');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (newPassword.length < 6) {
      setSubmitError('Hasło musi mieć minimum 6 znaków.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Hasła nie są identyczne.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setSubmitting(false);
      setSubmitError('Błąd zmiany hasła: ' + error.message);
      return;
    }

    await supabase.auth.signOut();
    setSubmitting(false);
    setStatus('done');
    setStatusMessage('Hasło zostało zmienione. Przekierowuję do logowania...');

    window.setTimeout(() => {
      router.replace('/?view=auth&reset=success');
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10 md:py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-rose-100 bg-white/95 p-6 md:p-7 shadow-xl">
        <div className="mb-5 flex items-center gap-2 text-rose-600">
          <ShieldCheck size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">Bezpieczny reset hasła</span>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-slate-800">Ustaw nowe hasło</h1>
        <p className="mb-6 text-sm text-slate-500">{statusMessage}</p>

        {status === 'checking' && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            Trwa weryfikacja linku...
          </div>
        )}

        {status === 'invalid' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Ten link resetu nie może zostać użyty. Wygeneruj nowy link w oknie logowania.</span>
            </div>
            <button
              onClick={redirectToLogin}
              className="w-full rounded-xl bg-rose-500 py-3 font-semibold text-white transition-colors hover:bg-rose-600"
            >
              Przejdź do logowania
            </button>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nowe hasło"
                minLength={6}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition-all focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Pokaż/ukryj hasło"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Powtórz nowe hasło"
                minLength={6}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition-all focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Pokaż/ukryj powtórzone hasło"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-rose-500 py-3 font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Zmieniam hasło...' : 'Zmień hasło'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>Hasło zostało zmienione poprawnie. Za chwilę zobaczysz ekran logowania.</span>
            </div>
            <button
              onClick={redirectToLogin}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Przejdź do logowania teraz
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

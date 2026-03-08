'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendPasswordResetOtp, setNewPassword as updateUserPassword, verifyOtpCode } from '@/lib/authService';

type ResetStep = 1 | 2 | 3 | 4;

function decodeSupabaseErrorDescription(value: string | null): string {
  if (!value) return '';
  return decodeURIComponent(value.replace(/\+/g, ' '));
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<ResetStep>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Podaj adres e-mail, aby otrzymać kod resetujący.');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let isActive = true;

    const initializeFromUrl = async () => {
      if (typeof window === 'undefined') return;

      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const emailFromUrl = searchParams.get('email');
      const sent = searchParams.get('sent');

      if (emailFromUrl) {
        setEmail(emailFromUrl);
      }

      if (sent === '1') {
        setStep(2);
        setMessage('Kod zostal wyslany. Sprawdz skrzynke e-mail i wpisz kod OTP.');
      }

      const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
      const errorDescription =
        hashParams.get('error_description') || searchParams.get('error_description');
      const code = searchParams.get('code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hasRecoveryPayload = Boolean(
        errorCode || code || (accessToken && refreshToken) || hashParams.get('type') === 'recovery',
      );

      if (!hasRecoveryPayload) {
        return;
      }

      if (errorCode) {
        if (!isActive) return;
        const decodedDescription = decodeSupabaseErrorDescription(errorDescription);
        const errorMsg =
          errorCode === 'otp_expired'
            ? 'Link lub kod resetu wygasl. Wygeneruj nowy kod i sprobuj ponownie.'
            : decodedDescription || 'Link resetu hasla jest nieprawidlowy.';

        setError(errorMsg);
        setMessage('Nie udalo sie zweryfikowac linku. Mozesz uzyc kodu OTP z e-maila.');
        setStep(emailFromUrl ? 2 : 1);
        return;
      }

      try {
        setIsCheckingLink(true);
        setMessage('Weryfikuje link resetu hasla...');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        if (!code && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isActive) return;

        if (session?.user) {
          setError('');
          setStep(3);
          setMessage('Link zweryfikowany poprawnie. Ustaw nowe haslo.');

          // Usun czułe parametry z URL.
          const cleanParams = new URLSearchParams(window.location.search);
          cleanParams.delete('code');
          cleanParams.delete('type');
          cleanParams.delete('error');
          cleanParams.delete('error_code');
          cleanParams.delete('error_description');
          const nextQuery = cleanParams.toString();
          const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
          window.history.replaceState(null, '', nextUrl);
          return;
        }

        setError('Link resetu hasla jest nieprawidlowy albo wygasl.');
        setMessage('Wygeneruj nowy kod OTP i wpisz go recznie.');
        setStep(emailFromUrl ? 2 : 1);
      } catch (linkError: any) {
        if (!isActive) return;
        setError(linkError?.message || 'Nie udalo sie zweryfikowac linku resetu hasla.');
        setMessage('Wygeneruj nowy kod OTP i wpisz go recznie.');
        setStep(emailFromUrl ? 2 : 1);
      } finally {
        if (!isActive) return;
        setIsCheckingLink(false);
      }
    };

    initializeFromUrl();

    return () => {
      isActive = false;
    };
  }, []);

  const canSubmitNewPassword = useMemo(() => {
    return newPassword.length >= 6 && confirmPassword.length >= 6 && newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    setError('');
    setMessage('');

    if (!normalizedEmail) {
      setError('Podaj adres e-mail.');
      return;
    }

    setIsLoading(true);
    const result = await sendPasswordResetOtp(normalizedEmail);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Nie udalo sie wyslac kodu OTP.');
      return;
    }

    setStep(2);
    setOtpCode('');
    setMessage('Kod zostal wyslany. Sprawdz skrzynke e-mail i wpisz kod OTP.');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('email', normalizedEmail);
      params.set('sent', '1');
      const nextQuery = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}?${nextQuery}`);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = otpCode.replace(/\s+/g, '');

    setError('');
    setMessage('');

    if (!normalizedEmail) {
      setError('Podaj adres e-mail.');
      setStep(1);
      return;
    }

    if (normalizedCode.length < 6 || normalizedCode.length > 8) {
      setError('Nieprawidlowy kod OTP.');
      return;
    }

    setIsLoading(true);
    const result = await verifyOtpCode(normalizedEmail, normalizedCode);
    setIsLoading(false);

    if (!result.success) {
      setError('Nieprawidlowy lub wygasly kod. Sprobuj ponownie.');
      return;
    }

    setStep(3);
    setMessage('Kod zweryfikowany poprawnie. Mozesz ustawic nowe haslo.');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('sent');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
      window.history.replaceState(null, '', nextUrl);
    }
  };

  const handleUpdatePassword = async (event: FormEvent) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (newPassword.length < 6) {
      setError('Haslo musi miec minimum 6 znakow.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Hasla nie sa identyczne.');
      return;
    }

    setIsLoading(true);
    const result = await updateUserPassword(newPassword);

    if (!result.success) {
      setIsLoading(false);
      setError(result.error || 'Wystapil blad podczas zmiany hasla.');
      return;
    }

    await supabase.auth.signOut();

    setIsLoading(false);
    setStep(4);
    setMessage('Twoje haslo zostalo pomyslnie zmienione. Za chwile przeniesiemy Cie do logowania.');

    window.setTimeout(() => {
      router.replace('/auth?reset=success');
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10 md:py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-rose-100 bg-white/95 p-6 md:p-7 shadow-xl">
        <div className="mb-5 flex items-center gap-2 text-rose-600">
          <ShieldCheck size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">Bezpieczny reset hasla</span>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-slate-800">Resetowanie hasla</h1>
        <p className="mb-6 text-sm text-slate-500">{message}</p>

        {isCheckingLink && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            Trwa przetwarzanie...
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adres e-mail"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-rose-500 py-3 font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Wysylanie...' : 'Wyslij kod OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adres e-mail"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Wpisz kod OTP"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-center text-xl tracking-[0.35em] outline-none transition-all focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-rose-500 py-3 font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Sprawdzanie...' : 'Zweryfikuj kod'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
                setMessage('Podaj adres e-mail, aby otrzymac nowy kod.');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Wroc do wpisania e-maila
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                placeholder="Nowe haslo"
                minLength={6}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition-all focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Pokaz/ukryj haslo"
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
                placeholder="Powtorz nowe haslo"
                minLength={6}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition-all focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Pokaz/ukryj powtorzone haslo"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !canSubmitNewPassword}
              className="w-full rounded-xl bg-rose-500 py-3 font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Zapisywanie...' : 'Zapisz nowe haslo'}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>Haslo zostalo zmienione. Mozesz teraz zalogowac sie nowym haslem.</span>
            </div>
            <button
              onClick={() => router.replace('/auth')}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Przejdz do logowania
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

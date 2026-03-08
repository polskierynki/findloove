'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Eye, EyeOff, Mail, Lock, User, Heart } from 'lucide-react';

interface AuthViewProps {
  onBack: () => void;
  onNotify: (msg: string) => void;
  onRegister: () => void;
}

type AuthMode = 'login' | 'register';

export default function AuthView({ onBack, onNotify, onRegister }: AuthViewProps) {
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    // Obsługa resetowania hasła przez Supabase
    const handlePasswordReset = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setResetLoading(true);
      const emailToSend = resetEmail;
      const { error } = await supabase.auth.resetPasswordForEmail(emailToSend);
      setResetLoading(false);
      if (error) {
        onNotify('Błąd resetowania: ' + error.message);
      } else {
        onNotify('Wysłano link do resetu hasła na podany e-mail.');
        setShowReset(false);
      }
    };
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [name, setName] = useState('');

  // Logowanie przez social (OAuth)
  type OAuthProvider = 'google' | 'facebook' | 'apple';
  const handleSocial = async (provider: OAuthProvider) => {
    try {
      const redirectTo = window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) {
        onNotify('Błąd logowania przez ' + provider + ': ' + error.message);
        return;
      }

      if (!data?.url) {
        onNotify('Błąd logowania przez ' + provider + ': brak adresu przekierowania OAuth.');
        return;
      }

      // Enforce production redirect target explicitly to avoid unwanted localhost callbacks.
      const authUrl = new URL(data.url);
      authUrl.searchParams.set('redirect_to', redirectTo);
      window.location.assign(authUrl.toString());

      // Po udanym logowaniu Supabase przekieruje użytkownika na stronę powrotną (redirect). Po powrocie sprawdź, czy profil istnieje.
      // Poniższy kod działa tylko po stronie klienta, po powrocie z OAuth:
      setTimeout(async () => {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;
        // Sprawdź, czy istnieje profil
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        if (!profile) {
          // Tworzymy nowy profil na podstawie danych z Auth
          const email = user.email || '';
          const name = user.user_metadata?.name || user.user_metadata?.full_name || email.split('@')[0] || 'Użytkownik';
          await supabase.from('profiles').insert({
            id: user.id,
            name,
            email,
            is_verified: true,
            // Możesz dodać domyślne wartości dla innych pól, np. wiek, miasto itp.
          });
        }
      }, 1000); // opóźnienie, by mieć pewność, że user jest już zalogowany
    } catch (err: any) {
      onNotify('Błąd logowania przez ' + provider + ': ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register') {
      if (password !== password2) {
        onNotify('Hasła nie są identyczne!');
        return;
      }
      // Rejestracja przez Supabase Auth
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) {
        onNotify('Błąd rejestracji: ' + error.message);
        return;
      }
      onNotify(`Witamy ${name}! Konto zostało utworzone. Sprawdź e-mail i potwierdź konto.`);
      setMode('login');
      return;
    } else {
      // Logowanie przez Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        onNotify('Błąd logowania: ' + error.message);
        return;
      }
      // Pobierz profil użytkownika po zalogowaniu
      const userId = data?.user?.id;
      if (userId) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (profileError) {
          onNotify('Błąd pobierania profilu: ' + profileError.message);
          onBack();
          return;
        }
        // Sprawdź czy to Super Admin
        if (profileData && profileData.id === '00000000-0000-0000-0000-000000000001') {
          onNotify('Zalogowano jako Super Admin!');
          // handleSession automatycznie przekieruje do panelu admina
          onBack();
          return;
        }
      }
      onNotify('Zalogowano pomyślnie!');
      onBack();
    }
  };

  const SOCIAL_BUTTONS: { provider: OAuthProvider; bg: string; icon: React.ReactNode }[] = [
    {
      provider: 'facebook',
      bg: 'bg-[#1877F2] hover:bg-[#145dbf]',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      provider: 'google',
      bg: 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
    },
    {
      provider: 'apple',
      bg: 'bg-black hover:bg-slate-900',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center px-4 animate-in fade-in duration-400">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/logo/logo.jpg"
              alt="findloove.pl"
              width={180}
              height={48}
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="text-slate-500 text-sm">
            {mode === 'register'
              ? 'Dołącz do tysięcy osób szukających bliskości'
              : mode === 'login'
              ? 'Witamy z powrotem!'
              : 'Znajdź kogoś wyjątkowego'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">

          {/* Zakładki Login / Rejestracja */}
          {(
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  mode === 'login'
                    ? 'text-rose-600 border-b-2 border-rose-500 bg-rose-50/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Logowanie
              </button>
              <button
                onClick={() => onRegister()}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  mode === 'register'
                    ? 'text-rose-600 border-b-2 border-rose-500 bg-rose-50/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Rejestracja
              </button>
            </div>
          )}

          <div className="p-6">



            {/* ── FORMULARZ LOGOWANIA / REJESTRACJI ── */}
            {(
              <>
                {/* Przyciski społecznościowe (mniejsze) */}
                <div className="flex gap-2 mb-5">
                  {SOCIAL_BUTTONS.map(({ provider, bg, icon }) => (
                    <button
                      key={provider}
                      onClick={() => handleSocial(provider)}
                      title={`Przez ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
                      type="button"
                      className={`flex-1 flex items-center justify-center py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm text-white ${bg}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400">lub e-mailem</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Imię — tylko rejestracja */}
                  {mode === 'register' && (
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Imię i nazwisko"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
                      />
                    </div>
                  )}

                  {/* E-mail */}
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Adres e-mail"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
                    />
                  </div>

                  {/* Hasło */}
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Hasło"
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Powtórz hasło — tylko rejestracja */}
                  {mode === 'register' && (
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type={showPassword2 ? 'text' : 'password'}
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        placeholder="Powtórz hasło"
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword2((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword2 ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  )}

                  {mode === 'login' && (
                    <div className="text-right">
                      <button
                        type="button"
                        className="text-xs text-rose-500 hover:underline"
                        onClick={() => setShowReset(true)}
                      >
                        Zapomniałem/am hasła
                      </button>
                    </div>
                  )}
      {/* Modal resetowania hasła */}
      {showReset && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs relative animate-in fade-in duration-200">
            <button
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
              onClick={() => setShowReset(false)}
              aria-label="Zamknij"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-2 text-slate-800">Resetowanie hasła</h3>
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="Podaj swój e-mail"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
              />
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors mt-1 disabled:opacity-60"
              >
                {resetLoading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
              </button>
            </form>
            <p className="text-xs text-slate-400 mt-3">Po kliknięciu otrzymasz e-mail z linkiem do zmiany hasła.</p>
          </div>
        </div>,
        document.body
      )}

                  <button
                    type="submit"
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors mt-1"
                  >
                    {mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
                  </button>
                </form>

                {mode === 'register' && (
                  <p className="text-center text-[11px] text-slate-400 mt-4 leading-relaxed">
                    Rejestrując się, akceptujesz{' '}
                    <button className="text-rose-500 hover:underline">Regulamin</button> i{' '}
                    <button className="text-rose-500 hover:underline">Politykę prywatności</button> portalu findloove.pl.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Powrót */}
        <div className="text-center mt-5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm transition-colors mx-auto"
          >
            <ChevronLeft size={15} />
            {'Wróć do portalu'}
          </button>
        </div>

      </div>
    </div>
  );
}

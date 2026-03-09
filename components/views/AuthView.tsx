'use client';

import { useState } from 'react';
import { ChevronLeft, LogIn, Mail, Lock, UserPlus, Chrome } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthViewProps {
  onBack: () => void;
  onNotify: (msg: string) => void;
  onRegister: () => void;
}

export default function AuthView({ onBack, onNotify, onRegister }: AuthViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        onNotify('Bledny e-mail lub haslo. Sprawdz dane i sprobuj ponownie.');
        return;
      }

      if (error.message.toLowerCase().includes('email not confirmed')) {
        onNotify('Konto nie jest jeszcze potwierdzone. Sprawdz skrzynke e-mail i kliknij link aktywacyjny.');
        return;
      }

      onNotify(`Błąd logowania: ${error.message}`);
      return;
    }

    onNotify('Zalogowano pomyślnie');
    onBack();
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      onNotify(`Błąd OAuth: ${error.message}`);
    }
  };

  const handleReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      onNotify('Podaj email do resetu hasła.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      onNotify(`Nie udało się wysłać resetu: ${error.message}`);
      return;
    }

    onNotify('Link do resetu hasła został wysłany.');
  };

  return (
    <section className="max-w-md mx-auto glass-modal rounded-[2rem] p-8 border border-cyan-500/20 shadow-[0_0_50px_rgba(0,255,255,0.15)] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
      
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10">
        <button 
          onClick={onBack} 
          className="inline-flex items-center gap-2 text-cyan-300 hover:text-white mb-6 transition-colors group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
          Wróć
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl text-white font-light mb-2">
            Witaj ponownie <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">✨</span>
          </h1>
          <p className="text-white/65">Zaloguj się i wróć do znajomych</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <label className="block">
            <span className="text-sm text-cyan-300/80 font-medium">Adres email</span>
            <div className="mt-2 relative group">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-cyan-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(0,255,255,0.1)]"
                placeholder="twoj@email.pl"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-cyan-300/80 font-medium">Hasło</span>
            <div className="mt-2 relative group">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-cyan-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(0,255,255,0.1)]"
                placeholder="••••••••"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 rounded-xl py-3.5 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <LogIn size={18} className="relative z-10" />
            <span className="relative z-10">{loading ? 'Logowanie...' : 'Zaloguj się'}</span>
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#0a0612] text-white/40">lub kontynuuj przez</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleGoogle} 
            className="group glass border border-white/20 hover:border-cyan-400/40 rounded-xl py-3 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] active:scale-95"
          >
            <Chrome size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            Google
          </button>
          <button 
            onClick={handleReset} 
            className="glass border border-cyan-400/30 hover:border-cyan-400/50 rounded-xl py-3 text-cyan-200 hover:text-cyan-100 text-sm font-medium transition-all hover:bg-cyan-500/10 active:scale-95"
          >
            Reset hasła
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-center text-white/60 text-sm mb-3">
            Nie masz jeszcze konta?
          </p>
          <button
            onClick={onRegister}
            className="w-full border-2 border-fuchsia-500/40 hover:border-fuchsia-400/60 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 rounded-xl py-3 text-fuchsia-200 hover:text-fuchsia-100 inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-95"
          >
            <UserPlus size={18} />
            Załóż konto za darmo
          </button>
        </div>
      </div>
    </section>
  );
}

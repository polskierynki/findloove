'use client';

import { useState } from 'react';
import { ChevronLeft, LogIn, Mail, Lock, UserPlus } from 'lucide-react';
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
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
    if (!email.trim()) {
      onNotify('Podaj email do resetu hasła.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      onNotify(`Nie udało się wysłać resetu: ${error.message}`);
      return;
    }

    onNotify('Link do resetu hasła został wysłany.');
  };

  return (
    <section className="max-w-md mx-auto glass rounded-[2rem] p-8 border border-white/10">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-cyan-300 hover:text-white mb-6">
        <ChevronLeft size={18} /> Wróć
      </button>

      <h1 className="text-3xl text-white font-light mb-2">Logowanie</h1>
      <p className="text-white/65 mb-6">Zaloguj się do findloove i wróć do rozmów.</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <label className="block">
          <span className="text-sm text-cyan-300/80">Email</span>
          <div className="mt-1 relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-white outline-none focus:border-cyan-400/50"
              placeholder="twoj@email.pl"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm text-cyan-300/80">Hasło</span>
          <div className="mt-1 relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-white outline-none focus:border-cyan-400/50"
              placeholder="••••••••"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 rounded-xl py-3 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogIn size={16} /> {loading ? 'Logowanie...' : 'Zaloguj się'}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button onClick={handleGoogle} className="glass border border-white/20 rounded-xl py-2.5 text-white text-sm">
          Google
        </button>
        <button onClick={handleReset} className="glass border border-cyan-400/30 rounded-xl py-2.5 text-cyan-200 text-sm">
          Reset hasła
        </button>
      </div>

      <button
        onClick={onRegister}
        className="mt-5 w-full border border-fuchsia-500/40 bg-fuchsia-500/10 rounded-xl py-2.5 text-fuchsia-200 inline-flex items-center justify-center gap-2"
      >
        <UserPlus size={16} /> Załóż konto
      </button>
    </section>
  );
}

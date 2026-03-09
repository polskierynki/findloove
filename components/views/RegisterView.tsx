'use client';

import { useState } from 'react';
import { ChevronLeft, UserPlus, User, MapPin, Mail, Lock, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RegisterViewProps {
  onBack: () => void;
  onComplete: (name: string, isLoggedIn: boolean) => void;
}

export default function RegisterView({ onBack, onComplete }: RegisterViewProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('25');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedCity = city.trim();

    if (!acceptedTerms) {
      setError('Zaakceptuj regulamin, aby kontynuować.');
      return;
    }

    setLoading(true);

    const signUp = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: normalizedName,
          age: Number(age),
          city: normalizedCity,
        },
      },
    });

    if (signUp.error) {
      setLoading(false);
      setError(signUp.error.message);
      return;
    }

    const uid = signUp.data.user?.id;
    const hasSession = Boolean(signUp.data.session);

    if (uid) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: uid,
        name: normalizedName,
        age: Number(age),
        city: normalizedCity,
        email: normalizedEmail,
        bio: '',
        interests: [],
        image_url: '',
      });

      if (profileError) {
        console.error('Nie udalo sie zapisac profilu po rejestracji:', profileError.message);
      }
    }

    setLoading(false);
    onComplete(normalizedName || normalizedEmail.split('@')[0] || 'Uzytkownik', hasSession);
  };

  return (
    <section className="max-w-md mx-auto glass-modal rounded-[2rem] p-8 border border-fuchsia-500/20 shadow-[0_0_50px_rgba(255,0,255,0.15)] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-fuchsia-500/5 pointer-events-none"></div>
      
      {/* Glow effects */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
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
            Dołącz do nas <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">💝</span>
          </h1>
          <p className="text-white/65">Stwórz konto i znajdź swoją drugą połówkę</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-cyan-300/80 font-medium">Imię</span>
            <div className="mt-2 relative group">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-fuchsia-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(255,0,255,0.1)]"
                placeholder="Twoje imię"
              />
            </div>
          </label>
          
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-cyan-300/80 font-medium">Wiek</span>
              <div className="mt-2 relative group">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
                <input
                  type="number"
                  min={18}
                  max={90}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 focus:border-fuchsia-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(255,0,255,0.1)]"
                  placeholder="Wiek"
                />
              </div>
            </label>
            
            <label className="block">
              <span className="text-sm text-cyan-300/80 font-medium">Miasto</span>
              <div className="mt-2 relative group">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 focus:border-fuchsia-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(255,0,255,0.1)]"
                  placeholder="Miasto"
                />
              </div>
            </label>
          </div>
          
          <label className="block">
            <span className="text-sm text-cyan-300/80 font-medium">Email</span>
            <div className="mt-2 relative group">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-fuchsia-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(255,0,255,0.1)]"
                placeholder="twoj@email.pl"
              />
            </div>
          </label>
          
          <label className="block">
            <span className="text-sm text-cyan-300/80 font-medium">Hasło</span>
            <div className="mt-2 relative group">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 focus:border-fuchsia-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(255,0,255,0.1)]"
                placeholder="Min. 6 znaków"
              />
            </div>
          </label>

          <label className="flex items-start gap-3 text-sm text-white/70 group cursor-pointer py-2">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-fuchsia-500 cursor-pointer"
            />
            <span className="group-hover:text-white/90 transition-colors">
              Akceptuję{' '}
              <a href="/terms" className="text-fuchsia-400 hover:text-fuchsia-300 underline">regulamin</a>
              {' '}i{' '}
              <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">politykę prywatności</a>
            </span>
          </label>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 rounded-xl py-3.5 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all active:scale-95 overflow-hidden mt-6"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <UserPlus size={18} className="relative z-10" />
            <span className="relative z-10">{loading ? 'Tworzenie konta...' : 'Utwórz konto'}</span>
          </button>
        </form>
      </div>
    </section>
  );
}

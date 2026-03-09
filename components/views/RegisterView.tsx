'use client';

import { useState } from 'react';
import { ChevronLeft, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RegisterViewProps {
  onBack: () => void;
  onComplete: (name: string) => void;
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

    if (!acceptedTerms) {
      setError('Zaakceptuj regulamin, aby kontynuować.');
      return;
    }

    setLoading(true);

    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          age: Number(age),
          city,
        },
      },
    });

    if (signUp.error) {
      setLoading(false);
      setError(signUp.error.message);
      return;
    }

    const uid = signUp.data.user?.id;
    if (uid) {
      await supabase.from('profiles').upsert({
        id: uid,
        name,
        age: Number(age),
        city,
        email,
        bio: '',
        interests: [],
        image_url: '',
      });
    }

    setLoading(false);
    onComplete(name || email.split('@')[0] || 'Użytkownik');
  };

  return (
    <section className="max-w-md mx-auto glass rounded-[2rem] p-8 border border-white/10">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-cyan-300 hover:text-white mb-6">
        <ChevronLeft size={18} /> Wróć
      </button>

      <h1 className="text-3xl text-white font-light mb-2">Rejestracja</h1>
      <p className="text-white/65 mb-6">Załóż konto i dołącz do findloove.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white outline-none focus:border-cyan-400/50"
          placeholder="Imię"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            min={18}
            max={90}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white outline-none focus:border-cyan-400/50"
            placeholder="Wiek"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white outline-none focus:border-cyan-400/50"
            placeholder="Miasto"
          />
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white outline-none focus:border-cyan-400/50"
          placeholder="Email"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white outline-none focus:border-cyan-400/50"
          placeholder="Hasło"
        />

        <label className="flex items-start gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5"
          />
          Akceptuję regulamin i politykę prywatności.
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 rounded-xl py-3 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <UserPlus size={16} /> {loading ? 'Tworzenie konta...' : 'Utwórz konto'}
        </button>
      </form>
    </section>
  );
}

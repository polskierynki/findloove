'use client';

import { useState } from 'react';
import { X, Mail, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = () => {
    console.log('Google login');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'login') {
      console.log('Login:', email, password);
    } else {
      console.log('Register:', name, email, password);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-modal rounded-[2.5rem] w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Tab Navigation */}
        <div className="flex gap-6 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab('login')}
            className={`pb-2 text-lg font-medium border-b-2 transition-colors ${
              activeTab === 'login'
                ? 'text-cyan-400 border-cyan-400'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            Logowanie
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`pb-2 text-lg font-medium border-b-2 transition-colors ${
              activeTab === 'register'
                ? 'text-cyan-400 border-cyan-400'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            Rejestracja
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-6">
          <span className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">
            findloove.pl
          </span>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white hover:bg-gray-100 text-black font-medium py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all mb-6 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Kontynuuj z Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">LUB EMAIL</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="text-sm text-gray-400 ml-1">Imię</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none border-glow-cyan focus:bg-black/50 transition-all"
                placeholder="Twoje imię"
                required
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none border-glow-cyan focus:bg-black/50 transition-all"
              placeholder="twoj@email.pl"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 ml-1">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none border-glow-magenta focus:bg-black/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 py-3.5 rounded-xl font-bold text-white transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] mt-2"
          >
            {activeTab === 'login' ? 'Zaloguj się' : 'Stwórz konto'}
          </button>
        </form>

        {activeTab === 'login' && (
          <p className="text-center text-sm text-cyan-400/60 mt-4">
            <button className="hover:text-cyan-300 transition-colors">Zapomniałeś hasła?</button>
          </p>
        )}
      </div>
    </div>
  );
}

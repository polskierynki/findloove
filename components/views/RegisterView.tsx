'use client';

import { useState } from 'react';
import { ChevronLeft, UserPlus } from 'lucide-react';
import { User, MapPin, Envelope, LockKey, Calendar, Key, ArrowsClockwise } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';

interface RegisterViewProps {
  onBack: () => void;
  onComplete: (name: string, isLoggedIn: boolean) => void;
}

type RegisterStep = 'form' | 'otp';

type PendingRegistration = {
  email: string;
  name: string;
  age: number;
  city: string;
  password: string;
};

export default function RegisterView({ onBack, onComplete }: RegisterViewProps) {
  const [step, setStep] = useState<RegisterStep>('form');
  const [name, setName] = useState('');
  const [age, setAge] = useState('25');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const sendRegistrationOtp = async (payload: PendingRegistration) => {
    return await supabase.auth.signInWithOtp({
      email: payload.email,
      options: {
        shouldCreateUser: true,
        data: {
          name: payload.name,
          age: payload.age,
          city: payload.city,
        },
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedCity = city.trim();
    const normalizedAge = Number(age);

    if (!acceptedTerms) {
      setError('Zaakceptuj regulamin, aby kontynuować.');
      return;
    }

    if (!Number.isFinite(normalizedAge) || normalizedAge < 18 || normalizedAge > 120) {
      setError('Podaj poprawny wiek (18-120).');
      return;
    }

    if (password.trim().length < 6) {
      setError('Haslo musi miec co najmniej 6 znakow.');
      return;
    }

    setLoading(true);

    // Prevent accidental password reset through "register" for already known profiles.
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfileError) {
      setLoading(false);
      setError('Nie udalo sie sprawdzic konta. Sprobuj ponownie za chwile.');
      return;
    }

    if (existingProfile?.id) {
      setLoading(false);
      setError('Konto z tym adresem e-mail juz istnieje. Zaloguj sie.');
      return;
    }

    const payload: PendingRegistration = {
      email: normalizedEmail,
      name: normalizedName,
      age: normalizedAge,
      city: normalizedCity,
      password,
    };

    const otpRequest = await sendRegistrationOtp(payload);

    if (otpRequest.error) {
      setLoading(false);
      setError(`Nie udalo sie wyslac kodu OTP: ${otpRequest.error.message}`);
      return;
    }

    setPendingRegistration(payload);
    setStep('otp');
    setInfo(`Wyslalismy 6-cyfrowy kod na adres: ${normalizedEmail}`);
    setOtpCode('');
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!pendingRegistration) {
      setError('Brak danych rejestracji. Wypelnij formularz ponownie.');
      setStep('form');
      return;
    }

    const normalizedOtp = otpCode.replace(/\s+/g, '');

    if (normalizedOtp.length < 6) {
      setError('Podaj poprawny kod OTP.');
      return;
    }

    setLoading(true);

    const verifyResult = await supabase.auth.verifyOtp({
      email: pendingRegistration.email,
      token: normalizedOtp,
      type: 'email',
    });

    if (verifyResult.error) {
      setLoading(false);
      setError(`Nieprawidlowy lub wygasly kod: ${verifyResult.error.message}`);
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: pendingRegistration.password,
      data: {
        name: pendingRegistration.name,
        age: pendingRegistration.age,
        city: pendingRegistration.city,
      },
    });

    if (passwordError) {
      setLoading(false);
      setError(`Kod poprawny, ale nie udalo sie ustawic hasla: ${passwordError.message}`);
      return;
    }

    let uid = verifyResult.data.user?.id || verifyResult.data.session?.user?.id || null;

    if (!uid) {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      uid = currentUser?.id || null;
    }

    if (uid && pendingRegistration) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: uid,
        auth_user_id: uid,
        name: pendingRegistration.name,
        age: pendingRegistration.age,
        city: pendingRegistration.city,
        email: pendingRegistration.email,
        bio: '',
        interests: [],
        image_url: '',
      });

      if (profileError) {
        console.error('Nie udalo sie zapisac profilu po rejestracji:', profileError.message);
      }

      // Grant welcome bonus tokens (idempotent RPC — safe to call again if already received)
      try {
        await supabase.rpc('grant_welcome_bonus', { p_profile_id: uid });
      } catch (bonusErr) {
        console.error('Nie udalo sie przyznac bonusu powitalnego:', bonusErr);
      }
    }

    setLoading(false);
    onComplete(pendingRegistration.name || pendingRegistration.email.split('@')[0] || 'Uzytkownik', true);
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration) {
      setError('Brak danych do ponownego wyslania kodu.');
      setStep('form');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    const resendResult = await sendRegistrationOtp(pendingRegistration);

    if (resendResult.error) {
      setLoading(false);
      setError(`Nie udalo sie wyslac kodu ponownie: ${resendResult.error.message}`);
      return;
    }

    setLoading(false);
    setInfo(`Wyslalismy nowy kod na ${pendingRegistration.email}`);
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('form');
      setError('');
      setInfo('');
      return;
    }

    onBack();
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
          onClick={handleBack} 
          className="inline-flex items-center gap-2 text-cyan-300 hover:text-white mb-6 transition-colors group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Wróć
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl text-white font-light mb-2">
            {step === 'form' ? (
              <>
                Dolacz do nas <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">💝</span>
              </>
            ) : (
              <>
                Potwierdz kod <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">OTP</span>
              </>
            )}
          </h1>
          <p className="text-white/65">
            {step === 'form'
              ? 'Stworz konto i aktywuj je kodem z e-maila.'
              : `Wpisz kod z wiadomosci wyslanej na ${pendingRegistration?.email || email}.`}
          </p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-cyan-300/80 font-medium">Imie</span>
              <div className="mt-2 relative group">
                <User size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 focus:border-fuchsia-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(255,0,255,0.1)]"
                  placeholder="Twoje imie"
                />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-cyan-300/80 font-medium">Wiek</span>
                <div className="mt-2 relative group">
                  <Calendar size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
                  <input
                    type="number"
                    min={18}
                    max={120}
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
                  <MapPin size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
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
                <Envelope size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
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
              <span className="text-sm text-cyan-300/80 font-medium">Haslo</span>
              <div className="mt-2 relative group">
                <LockKey size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400/50 group-focus-within:text-fuchsia-400 transition-colors" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 focus:border-fuchsia-400/50 rounded-xl py-3 pl-11 pr-4 text-white outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(255,0,255,0.1)]"
                  placeholder="Min. 6 znakow"
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
                Akceptuje{' '}
                <a href="/terms" className="text-fuchsia-400 hover:text-fuchsia-300 underline">regulamin</a>
                {' '}i{' '}
                <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">polityke prywatnosci</a>
              </span>
            </label>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-sm text-cyan-200">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 rounded-xl py-3.5 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all active:scale-95 overflow-hidden mt-6"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <UserPlus size={18} className="relative z-10" />
              <span className="relative z-10">{loading ? 'Wysylanie kodu...' : 'Wyslij kod OTP'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              Kod wyslany na: <span className="font-semibold text-white">{pendingRegistration?.email}</span>
            </div>

            <label className="block">
              <span className="text-sm text-cyan-300/80 font-medium">Kod OTP</span>
              <div className="mt-2 relative group">
                <Key size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/60 group-focus-within:text-cyan-300 transition-colors" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-black/20 border border-white/10 focus:border-cyan-400/50 rounded-xl py-3 pl-11 pr-4 text-white tracking-[0.28em] font-semibold outline-none transition-all shadow-inner focus:shadow-[inset_0_0_10px_rgba(0,255,255,0.15)]"
                  placeholder="000000"
                />
              </div>
            </label>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-sm text-cyan-200">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 rounded-xl py-3.5 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <Key size={18} weight="duotone" className="relative z-10" />
              <span className="relative z-10">{loading ? 'Weryfikacja...' : 'Potwierdz i zaloz konto'}</span>
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              <ArrowsClockwise size={16} weight="bold" /> Wyslij kod ponownie
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

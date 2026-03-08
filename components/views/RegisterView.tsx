'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadProfilePhoto } from '@/lib/photoUpload';
import {
  ChevronLeft, ChevronRight, Check, Camera, Eye, EyeOff,
  Mail, Lock, Heart, User, MapPin, Sparkles, ShieldCheck,
  AlertCircle, ImagePlus, Search, MessageCircle, Users, Wind, Briefcase, Target,
  Venus, Mars, VenusAndMars, FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LookingForCategory, LOOKING_FOR_OPTIONS } from '@/lib/types';
import LegalModal from '@/components/layout/LegalModal';
import { TERMS_OF_SERVICE } from '@/lib/legal/termsOfService';
import { PRIVACY_POLICY } from '@/lib/legal/privacyPolicy';

interface RegisterViewProps {
  onBack: () => void;
  onComplete: (name: string) => void;
}

/* ─────────────── constants ─────────────── */

const STEPS = [
  'Płeć',
  'Dane',
  'Miasto',
  'Konto',
  'Gotowe',
];

import { GENDERS, ORIENTATION_OPTIONS, POLISH_CITIES, ZODIAC_SIGNS, OCCUPATION_OPTIONS, SMOKING_OPTIONS, CHILDREN_OPTIONS, ALL_INTERESTS, EDUCATION_OPTIONS, DRINKING_OPTIONS, RELATIONSHIP_GOAL_OPTIONS, WANTS_CHILDREN_OPTIONS } from './constants/profileFormOptions';

const LOOKING_FOR_STATUS: Record<LookingForCategory, string> = {
  'miłość':   'Szuka miłości',
  'przyjaźń': 'Szuka przyjaźni',
  'przygoda': 'Szuka przygody',
};

/* ─────────────── component ─────────────── */

export default function RegisterView({ onBack, onComplete }: RegisterViewProps) {
  const [step, setStep] = useState(0);

  // form state
  const [gender, setGender] = useState('');
  const [orientation, setOrientation] = useState(''); // 'KM'|'KK'|'MK'|'MM'
  const [seekingAgeMin, setSeekingAgeMin] = useState(18);
  const [seekingAgeMax, setSeekingAgeMax] = useState(82);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [lookingFor, setLookingFor] = useState<LookingForCategory | null>(null);
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [zodiac, setZodiac] = useState('');
  const [smoking, setSmoking] = useState('');
  const [children, setChildren] = useState('');
  const [education, setEducation] = useState('');
  const [drinking, setDrinking] = useState('');
  const [relationshipGoal, setRelationshipGoal] = useState('');
  const [wantsChildren, setWantsChildren] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUrl2, setPhotoUrl2] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoFile2, setPhotoFile2] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPhoto2, setUploadingPhoto2] = useState(false);

  // face verification state
  const [faceStatus, setFaceStatus] = useState<'idle' | 'requesting' | 'ready' | 'captured' | 'analyzing' | 'verified' | 'error'>('idle');
  const [faceCaptureImg, setFaceCaptureImg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // legal modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');

  /* ---- validation helpers ---- */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 1) return { strength: 1, label: 'Słabe', color: 'bg-red-500' };
    if (strength === 2) return { strength: 2, label: 'Średnie', color: 'bg-amber-500' };
    if (strength === 3) return { strength: 3, label: 'Dobre', color: 'bg-blue-500' };
    return { strength: 4, label: 'Bardzo dobre', color: 'bg-green-500' };
  };

  /* ---- localStorage persistence ---- */
  useEffect(() => {
    // Load saved form data
    const saved = localStorage.getItem('registerFormData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.name) setName(data.name);
        if (data.age) setAge(data.age);
        if (data.city) setCity(data.city);
        if (data.cityInput) setCityInput(data.cityInput);
        if (data.bio) setBio(data.bio);
        if (data.email) setEmail(data.email);
        if (data.gender) setGender(data.gender);
        if (data.orientation) setOrientation(data.orientation);
        if (data.occupation) setOccupation(data.occupation);
        if (data.zodiac) setZodiac(data.zodiac);
        if (data.smoking) setSmoking(data.smoking);
        if (data.children) setChildren(data.children);
        if (data.education) setEducation(data.education);
        if (data.drinking) setDrinking(data.drinking);
        if (data.relationshipGoal) setRelationshipGoal(data.relationshipGoal);
        if (data.wantsChildren) setWantsChildren(data.wantsChildren);
        if (data.interests) setInterests(data.interests);
        if (data.lookingFor) setLookingFor(data.lookingFor);
        if (data.seekingAgeMin) setSeekingAgeMin(data.seekingAgeMin);
        if (data.seekingAgeMax) setSeekingAgeMax(data.seekingAgeMax);
      } catch (e) {
        console.error('Failed to load saved form data', e);
      }
    }
  }, []);

  useEffect(() => {
    // Save form data to localStorage
    const formData = {
      name, age, city, cityInput, bio, email, gender, orientation,
      occupation, zodiac, smoking, children, education, drinking, relationshipGoal, wantsChildren, interests, lookingFor,
      seekingAgeMin, seekingAgeMax,
    };
    localStorage.setItem('registerFormData', JSON.stringify(formData));
  }, [name, age, city, cityInput, bio, email, gender, orientation,
      occupation, zodiac, smoking, children, education, drinking, relationshipGoal, wantsChildren, interests, lookingFor,
      seekingAgeMin, seekingAgeMax]);

  /* ---- keyboard navigation ---- */
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canGoNext() && step < 9) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [step, name, age, city, gender, orientation, lookingFor, bio, occupation, 
      smoking, children, interests, faceStatus]);

  /* ---- city autocomplete ---- */
  const citySuggestions = cityInput.length >= 2
    ? POLISH_CITIES.filter(c => c.toLowerCase().startsWith(cityInput.toLowerCase())).slice(0, 6)
    : [];

  /* ---- interests toggle ---- */
  const toggleInterest = (i: string) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  /* ---- camera ---- */
  const startCamera = useCallback(async () => {
    setFaceStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setFaceStatus('ready');
    } catch {
      setFaceStatus('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setFaceCaptureImg(dataUrl);
    stopCamera();
    setFaceStatus('analyzing');

    // simulate AI face analysis
    setTimeout(() => setFaceStatus('verified'), 2500);
  }, [stopCamera]);

  // stop camera when leaving step 7
  useEffect(() => {
    if (step !== 7) stopCamera();
  }, [step, stopCamera]);

  /* ---- navigation ---- */
  const canGoNext = (): boolean => {
    switch (step) {
      case 0: return gender !== '' && orientation !== '';
      case 1: return name.trim().length >= 2 && Number(age) >= 18 && Number(age) <= 120;
      case 2: return city !== '';
      case 3: 
        return validateEmail(email) && 
               password.length >= 6 && 
               password === confirmPassword &&
               acceptedTerms;
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step === 0) { onBack(); return; }
    setStep(s => s - 1);
  };

  /* ---- submit ---- */
  const handleSubmit = async () => {
    // Final validation
    if (!validateEmail(email)) {
      setError('Podaj prawidłowy adres e-mail');
      return;
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }
    if (password !== confirmPassword) {
      setError('Hasła nie są zgodne');
      return;
    }
    if (!acceptedTerms) {
      setError('Musisz zaakceptować regulamin');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      // Tworzenie konta użytkownika
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Nie udało się utworzyć konta');

      // Tworzenie profilu z minimalnymi danymi
      const status = lookingFor ? LOOKING_FOR_STATUS[lookingFor] : 'Szuka znajomości';
      const seekingGender = orientation ? orientation[1] : '';
      
      await supabase.from('profiles').insert({
        id: authData.user.id,
        email: email,
        name: name.trim(),
        age: Number(age),
        city,
        bio: bio.trim() || 'Uzupełnię później...', // Domyślna wartość
        interests: interests.length > 0 ? interests : ['Spotkania'], // Domyślne zainteresowanie
        status,
        image_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?auto=format&fit=crop&q=80&w=600',
        is_verified: faceStatus === 'verified',
        occupation: occupation || 'Nie podano',
        zodiac: zodiac || 'Nieznany',
        smoking: smoking || 'Wolę nie mówić',
        children: children || 'Wolę nie mówić',
        gender,
        seeking_gender: seekingGender,
        seeking_age_min: seekingAgeMin,
        seeking_age_max: seekingAgeMax,
      });
      
      // Clear localStorage after successful registration
      localStorage.removeItem('registerFormData');
      setStep(4); // success screen (now step 4 instead of 10)
    } catch (err: any) {
      setError(err.message || 'Błąd podczas tworzenia profilu. Spróbuj ponownie.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── render ─── */

  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="min-h-[calc(100vh-130px)] flex flex-col items-center justify-start px-4 py-6 animate-in fade-in duration-400">
      <div className="w-full max-w-lg">

        {/* ── Header / Progress ── */}
        {step < 4 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <button onClick={handleBack} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
                <ChevronLeft size={16} />
                {step === 0 ? 'Anuluj' : 'Wróć'}
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Krok {step + 1} z {STEPS.length - 1}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">

          {/* ══════════════════════════════════
              KROK 0: Płeć + Orientacja
          ══════════════════════════════════ */}
          {step === 0 && (
            <div className="p-7">
              <div className="text-center mb-7">
                <div className="inline-flex bg-rose-100 p-3 rounded-2xl mb-3">
                  <Heart className="text-rose-500" fill="currentColor" size={28} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Witaj w findloove.pl!</h1>
                <p className="text-slate-500 text-sm mt-1.5">Zacznijmy od podstaw — kim jesteś?</p>
              </div>

              {/* Gender picker */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {GENDERS.map(g => {
                  const Icon = g.id === 'K' ? Venus : Mars;
                  return (
                    <button
                      key={g.id}
                      onClick={() => { setGender(g.id); setOrientation(''); }}
                      className={`py-7 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all font-semibold ${
                        gender === g.id
                          ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-md'
                          : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50/50'
                      }`}
                    >
                      <Icon size={44} strokeWidth={1.5} />
                      <span>{g.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Orientation picker — shown after gender selected */}
              {gender !== '' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-sm font-semibold text-slate-600 mb-3 text-center">Kogo szukasz?</p>
                  <div className="space-y-2">
                    {ORIENTATION_OPTIONS[gender].map(opt => {
                      const active = orientation === opt.id;
                      // Determine icons based on orientation ID
                      const isSameSex = opt.id[0] === opt.id[1];
                      const isHeterosexual = opt.id[0] !== opt.id[1];
                      const FirstIcon = opt.id[0] === 'K' ? Venus : Mars;
                      const SecondIcon = opt.id[1] === 'K' ? Venus : Mars;
                      
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setOrientation(opt.id)}
                          className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all ${
                            active
                              ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-md'
                              : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50/40'
                          }`}
                        >
                          {isHeterosexual ? (
                            <VenusAndMars size={22} strokeWidth={2} className="flex-shrink-0" />
                          ) : (
                            <div className="relative flex items-center w-7 h-6 flex-shrink-0">
                              <FirstIcon size={20} strokeWidth={2} className="absolute left-0" />
                              <SecondIcon size={20} strokeWidth={2} className="absolute left-3 opacity-70" />
                            </div>
                          )}
                          <span className="font-semibold text-base">{opt.label}</span>
                          {active && <Check size={20} className="ml-auto text-rose-500" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Seeking age range */}
                  {orientation !== '' && (
                    <div className="mt-5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <p className="text-sm font-semibold text-slate-600 mb-3">W jakiej grupie wiekowej?</p>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex justify-between text-sm font-bold text-rose-600 mb-3">
                          <span>{seekingAgeMin} lat</span>
                          <span>{seekingAgeMax} lat</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Od:</label>
                            <input
                              type="range" min={18} max={seekingAgeMax - 1} value={seekingAgeMin}
                              onChange={e => setSeekingAgeMin(Number(e.target.value))}
                              className="w-full accent-rose-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Do:</label>
                            <input
                              type="range" min={seekingAgeMin + 1} max={100} value={seekingAgeMax}
                              onChange={e => setSeekingAgeMax(Number(e.target.value))}
                              className="w-full accent-rose-500"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-center">Szukam kogoś w wieku {seekingAgeMin}–{seekingAgeMax} lat</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 1: Imię + wiek
          ══════════════════════════════════ */}
          {step === 1 && (
            <div className="p-7">
              <SectionHeader icon={<User size={22} className="text-rose-500" />} title="Jak masz na imię?" subtitle="Podaj imię i swój wiek" />
              <div className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Imię</label>
                  <input
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (e.target.value.length < 2) {
                        setNameError('Imię musi mieć co najmniej 2 znaki');
                      } else {
                        setNameError('');
                      }
                    }}
                    placeholder="np. Anna, Marek…"
                    className={`w-full border ${nameError ? 'border-red-400' : 'border-slate-200'} rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-base`}
                  />
                  {nameError && <p className="text-xs text-red-500 mt-1 ml-1">{nameError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Wiek</label>
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={age}
                    onChange={e => {
                      setAge(e.target.value);
                      const ageNum = Number(e.target.value);
                      if (ageNum < 18) {
                        setAgeError('Musisz mieć co najmniej 18 lat');
                      } else if (ageNum > 120) {
                        setAgeError('Nieprawidłowy wiek');
                      } else {
                        setAgeError('');
                      }
                    }}
                    placeholder="np. 67"
                    className={`w-full border ${ageError ? 'border-red-400' : 'border-slate-200'} rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-base`}
                  />
                  {ageError && <p className="text-xs text-red-500 mt-1 ml-1">{ageError}</p>}
                  <p className="text-xs text-slate-400 mt-1 ml-1">Nasz portal jest przeznaczony dla osób pełnoletnich (18+)</p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 2: Miasto
          ══════════════════════════════════ */}
          {step === 2 && (
            <div className="p-7 relative">
              <SectionHeader icon={<MapPin size={22} className="text-rose-500" />} title="Skąd jesteś?" subtitle="Wpisz swoje miasto" />
              <div className="mt-5 relative">
                <input
                  value={cityInput}
                  onChange={e => { setCityInput(e.target.value); setCity(''); setShowCitySuggestions(true); }}
                  placeholder="Zacznij pisać miasto…"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-base"
                />
                {city && (
                  <div className="absolute right-3 top-3.5 text-green-500">
                    <Check size={18} />
                  </div>
                )}
                {showCitySuggestions && citySuggestions.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    {citySuggestions.map(c => (
                      <button
                        key={c}
                        onClick={() => { setCity(c); setCityInput(c); setShowCitySuggestions(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-rose-50 text-slate-700 text-sm border-b border-slate-50 last:border-0 transition-colors flex items-center gap-2"
                      >
                        <MapPin size={14} className="text-rose-400" />{c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {city && (
                <p className="mt-3 text-sm text-slate-500 flex items-center gap-1.5">
                  <Check size={14} className="text-green-500" />
                  Wybrano: <strong className="text-slate-700">{city}</strong>
                </p>
              )}
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 3: Czego szukasz?
          ══════════════════════════════════ */}
          {step === 3 && (
            <div className="p-7">
              <SectionHeader icon={<Sparkles size={22} className="text-rose-500" />} title="Czego szukasz?" subtitle="Wybierz główny cel swojej obecności na portalu" />
              <div className="mt-5 space-y-3">
                {LOOKING_FOR_OPTIONS.map(opt => {
                  const iconMap = {
                    'Heart': <Heart size={28} />,
                    'Users': <Users size={28} />,
                    'Sparkles': <Sparkles size={28} />,
                  };
                  const borderMap: Record<string, string> = {
                    rose:   'border-rose-500 bg-rose-50',
                    amber:  'border-amber-500 bg-amber-50',
                    violet: 'border-violet-500 bg-violet-50',
                  };
                  const textMap: Record<string, string> = {
                    rose:   'text-rose-700',
                    amber:  'text-amber-700',
                    violet: 'text-violet-700',
                  };
                  const active = lookingFor === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setLookingFor(opt.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        active ? `${borderMap[opt.color]} shadow-md` : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex-shrink-0">{iconMap[opt.iconName as keyof typeof iconMap]}</div>
                      <div>
                        <p className={`font-bold text-base ${active ? textMap[opt.color] : 'text-slate-700'}`}>
                          Szukam {opt.label}
                        </p>
                        <p className="text-xs text-slate-500 leading-snug mt-0.5">{opt.description}</p>
                      </div>
                      {active && <Check size={20} className={`ml-auto flex-shrink-0 ${textMap[opt.color]}`} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 4: O sobie
          ══════════════════════════════════ */}
          {step === 4 && (
            <div className="p-7">
              <SectionHeader icon={<User size={22} className="text-rose-500" />} title="O sobie" subtitle="Napisz coś o sobie — to Twoja wizytówka" />
              <div className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Opis (min. 20 znaków)
                  </label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={4}
                    placeholder="Napisz kilka słów o sobie, swoich pasjach i oczekiwaniach…"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-sm resize-none"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${bio.length < 20 ? 'text-amber-500' : 'text-green-600'}`}>
                      {bio.length < 20 ? `Jeszcze ${20 - bio.length} znaków` : '✓ Minimalny wymóg spełniony'}
                    </p>
                    <p className="text-xs text-slate-400">{bio.length} znaków</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Zawód / Kim byłeś/byłaś?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {OCCUPATION_OPTIONS.map(o => (
                      <button
                        key={o}
                        onClick={() => setOccupation(o)}
                        className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${
                          occupation === o ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-rose-50/50'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Znak zodiaku (opcjonalnie)</label>
                  <div className="flex flex-wrap gap-2">
                    {ZODIAC_SIGNS.map(z => (
                      <button
                        key={z}
                        onClick={() => setZodiac(zodiac === z ? '' : z)}
                        className={`py-1.5 px-3 rounded-full border text-xs font-medium transition-all ${
                          zodiac === z ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 5: Styl życia
          ══════════════════════════════════ */}
          {step === 5 && (
            <div className="p-7">
              <SectionHeader icon={<Sparkles size={22} className="text-rose-500" />} title="Styl życia" subtitle="Pomaga dopasować odpowiednie osoby" />
              <div className="space-y-6 mt-5">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2.5">
                    <Wind size={16} className="text-slate-500" />
                    Palenie
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SMOKING_OPTIONS.map(o => (
                      <button
                        key={o}
                        onClick={() => setSmoking(o)}
                        className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          smoking === o ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2.5">
                    <Users size={16} className="text-slate-500" />
                    Dzieci / Rodzina
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHILDREN_OPTIONS.map(o => (
                      <button
                        key={o}
                        onClick={() => setChildren(o)}
                        className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          children === o ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 6: Zainteresowania
          ══════════════════════════════════ */}
          {step === 6 && (
            <div className="p-7">
              <SectionHeader icon={<Heart size={22} className="text-rose-500" />} title="Zainteresowania" subtitle="Wybierz co najmniej 2 — pojawią się na Twoim profilu" />
              <div className="flex flex-wrap gap-2 mt-5">
                {ALL_INTERESTS.map(i => (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`py-2 px-3.5 rounded-full border text-sm font-medium transition-all ${
                      interests.includes(i)
                        ? 'border-rose-500 bg-rose-500 text-white shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-300'
                    }`}
                  >
                    {interests.includes(i) && <span className="mr-1">✓</span>}
                    {i}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4">Wybrano: {interests.length}</p>
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 7: Weryfikacja twarzy
          ══════════════════════════════════ */}
          {step === 7 && (
            <div className="p-7">
              <SectionHeader
                icon={<ShieldCheck size={22} className="text-rose-500" />}
                title="Weryfikacja twarzy"
                subtitle="Zrób selfie, aby potwierdzić że jesteś prawdziwą osobą — to zwiększa zaufanie innych użytkowników"
              />
              <canvas ref={canvasRef} className="hidden" />

              <div className="mt-5">
                {faceStatus === 'idle' && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-rose-100 to-pink-100 border-4 border-dashed border-rose-300 flex items-center justify-center mb-5 shadow-lg">
                      <Camera size={56} className="text-rose-400 animate-pulse" />
                    </div>
                    <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                      Użyjemy Twojej kamery tylko raz w celu weryfikacji.<br />
                      Zdjęcie <strong>nie jest wysyłane</strong> nigdzie — analiza odbywa się lokalnie.<br />
                      <span className="text-xs text-rose-400 font-semibold">Zadbaj o dobre oświetlenie i patrz w obiektyw.</span>
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-md transition-all flex items-center gap-2 mx-auto animate-in fade-in duration-300"
                    >
                      <Camera size={18} />Uruchom kamerę
                    </button>
                    <button
                      onClick={() => setFaceStatus('verified')}
                      className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 block mx-auto transition-colors"
                    >
                      Pomiń weryfikację (brak kamery)
                    </button>
                  </div>
                )}
                {faceStatus === 'requesting' && (
                  <div className="text-center py-12">
                    <div className="w-10 h-10 border-4 border-rose-300 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">Prośba o dostęp do kamery…</p>
                  </div>
                )}
                {faceStatus === 'ready' && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-rose-400 shadow-xl mb-5">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1] animate-in fade-in duration-300"
                        style={{ filter: 'brightness(1.08) contrast(1.08)' }}
                      />
                      {/* oval face guide */}
                      <div className="absolute inset-0 border-[3px] border-dashed border-white/70 rounded-full m-4 pointer-events-none animate-pulse" />
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/80 text-rose-600 text-xs font-bold px-3 py-1 rounded-full shadow">Patrz prosto w obiektyw</div>
                    </div>
                    <p className="text-slate-500 text-sm mb-4">Umieść twarz w okręgu i naciśnij przycisk</p>
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-md transition-all flex items-center gap-2 mx-auto animate-in fade-in duration-300"
                    >
                      <Camera size={18} />Zrób zdjęcie
                    </button>
                  </div>
                )}
                {faceStatus === 'analyzing' && (
                  <div className="text-center animate-in fade-in duration-300">
                    {faceCaptureImg && (
                      <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-amber-400 shadow-xl mb-5 animate-in zoom-in-95 duration-300">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={faceCaptureImg} alt="Weryfikacja" className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/80 text-amber-600 text-xs font-bold px-3 py-1 rounded-full shadow">Analiza AI</div>
                      </div>
                    )}
                    <p className="text-amber-700 font-semibold animate-pulse">Analizuję twarz…</p>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-400 animate-in fade-in duration-300">
                      <p>✦ Wykrywam twarz…</p>
                      <p>✦ Sprawdzam autentyczność…</p>
                      <p>✦ Weryfikuję zdjęcie…</p>
                    </div>
                  </div>
                )}
                {faceStatus === 'verified' && (
                  <div className="text-center animate-in fade-in duration-300">
                    {faceCaptureImg ? (
                      <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-green-400 shadow-xl mb-5 animate-in zoom-in-95 duration-300">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={faceCaptureImg} alt="Zweryfikowano" className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute bottom-3 right-3 bg-green-500 text-white rounded-full p-1.5 shadow-lg animate-bounce">
                          <Check size={16} />
                        </div>
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/80 text-green-600 text-xs font-bold px-3 py-1 rounded-full shadow">Zweryfikowano!</div>
                      </div>
                    ) : (
                      <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-5 border-4 border-green-400 animate-in zoom-in-95 duration-300">
                        <Check size={40} className="text-green-600" />
                      </div>
                    )}
                    <p className="text-green-700 font-bold text-lg animate-in fade-in duration-300 flex items-center gap-2"><ShieldCheck size={20} /> Twarz zweryfikowana!</p>
                    <p className="text-slate-500 text-xs mt-1">Twój profil otrzyma odznakę weryfikacji</p>
                  </div>
                )}
                {faceStatus === 'error' && (
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <AlertCircle size={36} className="text-slate-400" />
                    </div>
                    <p className="text-slate-700 font-semibold">Brak dostępu do kamery</p>
                    <p className="text-slate-400 text-xs mt-1 mb-4">Sprawdź ustawienia przeglądarki lub urządzenia</p>
                    <button
                      onClick={() => setFaceStatus('verified')}
                      className="text-xs text-rose-500 hover:text-rose-700 underline underline-offset-2 transition-colors"
                    >
                      Pomiń weryfikację
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 8: Zdjęcia
          ════════════════════════════════ */}
          {step === 8 && (
            <div className="p-7">
              <SectionHeader
                icon={<ImagePlus size={22} className="text-rose-500" />}
                title="Twoje zdjęcia"
                subtitle="Dodaj do 2 zdjęć profilowych. Więcej będziesz mógł/mogła dodać po rejestracji za Serduszka."
              />
              <div className="space-y-5 mt-5">
                {/* Photo 1 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Główne zdjęcie profilowe
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPhotoFile(file);
                      setUploadingPhoto(true);
                      const url = await uploadProfilePhoto(file, email || name || 'temp');
                      if (url) setPhotoUrl(url);
                      setUploadingPhoto(false);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-sm"
                  />
                  {uploadingPhoto && <div className="text-xs text-slate-400 mt-2">Wysyłanie zdjęcia...</div>}
                  {photoUrl && (
                    <div className="mt-2 w-24 h-24 rounded-2xl overflow-hidden border-2 border-rose-400 shadow">
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>

                {/* Photo 2 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Drugie zdjęcie <span className="text-slate-400 normal-case font-normal">(opcjonalne)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPhotoFile2(file);
                      setUploadingPhoto2(true);
                      const url = await uploadProfilePhoto(file, email || name || 'temp');
                      if (url) setPhotoUrl2(url);
                      setUploadingPhoto2(false);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-sm"
                  />
                  {uploadingPhoto2 && <div className="text-xs text-slate-400 mt-2">Wysyłanie zdjęcia...</div>}
                  {photoUrl2 && (
                    <div className="mt-2 w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-300 shadow">
                      <img src={photoUrl2} alt="Preview 2" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>

                {/* Token info */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 flex items-start gap-3">
                  <Heart size={24} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-0.5">Serduszka na start!</p>
                    <p className="text-xs leading-relaxed">
                      Po rejestracji otrzymasz <strong>3 Serduszka</strong> w prezencie. Wydaj je na przeglądanie pełnych galerii innych użytkowników lub na dodatkowe zdjęcia na swoim profilu.
                    </p>
                  </div>
                </div>

                {/* Tips */}
                <div className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                  <Sparkles size={14} className="mt-0.5 flex-shrink-0" />
                  <p>Wskazówka: Użyj linku do zdjęcia z dowolnej strony (np. Unsplash, Google Photos, Imgur). Zdjęcia możesz też dodać później z poziomu profilu.</p>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              KROK 3: Konto
          ════════════════════════════════ */}
          {step === 3 && (
            <div className="p-7">
              <SectionHeader icon={<Mail size={22} className="text-rose-500" />} title="Utwórz konto" subtitle="Prawie gotowe! Podaj e-mail i hasło do logowania" />
              <div className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Adres e-mail</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (e.target.value && !validateEmail(e.target.value)) {
                          setEmailError('Nieprawidłowy format adresu e-mail');
                        } else {
                          setEmailError('');
                        }
                      }}
                      placeholder="twój@email.pl"
                      className={`w-full border ${emailError ? 'border-red-400' : 'border-slate-200'} rounded-xl pl-9 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-sm`}
                    />
                  </div>
                  {emailError && <p className="text-xs text-red-500 mt-1 ml-1">{emailError}</p>}
                  {email && validateEmail(email) && <p className="text-xs text-green-600 mt-1 ml-1 flex items-center gap-1"><Check size={12} /> Adres e-mail jest prawidłowy</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hasło (min. 6 znaków)</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (e.target.value.length > 0 && e.target.value.length < 6) {
                          setPasswordError('Hasło musi mieć co najmniej 6 znaków');
                        } else {
                          setPasswordError('');
                        }
                      }}
                      placeholder="••••••••"
                      className={`w-full border ${passwordError ? 'border-red-400' : 'border-slate-200'} rounded-xl pl-9 pr-10 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-sm`}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordError && <p className="text-xs text-red-500 mt-1 ml-1">{passwordError}</p>}
                  {password.length >= 6 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Siła hasła:</span>
                        <span className={`text-xs font-semibold ${
                          getPasswordStrength(password).strength === 1 ? 'text-red-600' :
                          getPasswordStrength(password).strength === 2 ? 'text-amber-600' :
                          getPasswordStrength(password).strength === 3 ? 'text-blue-600' :
                          'text-green-600'
                        }`}>{getPasswordStrength(password).label}</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${
                              i <= getPasswordStrength(password).strength
                                ? getPasswordStrength(password).color
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Użyj wielkich i małych liter, cyfr oraz znaków specjalnych</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Potwierdź hasło</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full border ${
                        confirmPassword && password !== confirmPassword ? 'border-red-400' : 'border-slate-200'
                      } rounded-xl pl-9 pr-10 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-sm`}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1 ml-1">Hasła nie są zgodne</p>
                  )}
                  {confirmPassword && password === confirmPassword && password.length >= 6 && (
                    <p className="text-xs text-green-600 mt-1 ml-1 flex items-center gap-1"><Check size={12} /> Hasła są zgodne</p>
                  )}
                </div>

                {/* Terms acceptance checkbox */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                    />
                    <span className="text-sm text-slate-700 leading-snug">
                      Akceptuję{' '}
                      <span
                        onClick={() => setShowTermsModal(true)}
                        className="text-rose-500 font-semibold hover:underline cursor-pointer"
                      >
                        Regulamin
                      </span>
                      {' '}i{' '}
                      <span
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-rose-500 font-semibold hover:underline cursor-pointer"
                      >
                        Politykę Prywatności
                      </span>
                      {' '}portalu findloove.pl
                    </span>
                  </label>
                  {!acceptedTerms && (
                    <p className="text-xs text-slate-400 mt-2 ml-7">Zaznaczenie jest wymagane do utworzenia konta</p>
                  )}
                </div>

                {/* Summary card */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5"><User size={14} className="text-slate-500" /> <strong>{name}</strong>, {age} lat, {city}</p>
                  {orientation && <p className="flex items-center gap-1.5"><Search size={14} className="text-slate-500" /> {ORIENTATION_OPTIONS[gender]?.find(o => o.id === orientation)?.label} (wiek {seekingAgeMin}–{seekingAgeMax} lat)</p>}
                  <p className="flex items-center gap-1.5"><Target size={14} className="text-rose-500" /> {lookingFor ? LOOKING_FOR_STATUS[lookingFor] : '—'}</p>
                  {occupation && <p className="flex items-center gap-1.5"><Briefcase size={14} className="text-slate-500" /> {occupation}</p>}
                  {interests.length > 0 && <p className="flex items-center gap-1.5"><Wind size={14} className="text-slate-500" /> {interests.slice(0, 4).join(', ')}{interests.length > 4 ? ` +${interests.length - 4}` : ''}</p>}
                  {faceStatus === 'verified' && <p className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-600" /> Twarz zweryfikowana</p>}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!canGoNext() || submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-md hover:shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Tworzę profil…</>
                    : <><Check size={18} /> Utwórz profil</>
                  }
                </button>
                
                {!canGoNext() && (
                  <div className="text-xs text-slate-400 text-center space-y-0.5">
                    {!validateEmail(email) && email && <p>• Podaj prawidłowy adres e-mail</p>}
                    {password.length < 6 && password && <p>• Hasło musi mieć min. 6 znaków</p>}
                    {password !== confirmPassword && confirmPassword && <p>• Hasła muszą być zgodne</p>}
                    {!acceptedTerms && <p>• Zaakceptuj regulamin</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              KROK 4: Sukces!
          ════════════════════════════════ */}
          {step === 4 && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 border-4 border-green-300 mb-5">
                <Check size={44} className="text-green-600" strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Witaj, {name}! 🎉</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-5">
                Twoje konto zostało utworzone!<br />
                Teraz czas uzupełnić profil i odblokować pełny dostęp do portalu.
              </p>

              {/* Info o systemie odblokowywania */}
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
                  <Lock size={16} className="text-rose-500" />
                  Jak odblokować więcej treści?
                </h3>
                <div className="space-y-2.5 text-left text-xs">
                  <div className="flex items-start gap-2">
                    <Camera size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <p><strong>Dodaj zdjęcie</strong> → widzisz zdjęcia innych</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p><strong>Napisz opis</strong> → czytasz opisy profili</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p><strong>Uzupełnij profil</strong> → wysyłasz wiadomości</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                  "Zdjęcie za zdjęcie, opis za opis" — chronimy prywatność wszystkich użytkowników
                </p>
              </div>

              <button
                onClick={() => onComplete(name)}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-md hover:shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
              >
                <Heart size={18} fill="currentColor" />
                Rozpocznij przeglądanie
              </button>
              <p className="text-xs text-slate-400 mt-3">
                Później możesz uzupełnić profil w ustawieniach
              </p>
            </div>
          )}

          {/* ── Next button (steps 0-2 have Dalej; step 3 Konto has its own submit; step 4 is Success) ── */}
          {step < 3 && (
            <div className="px-7 pb-7">
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-md hover:shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Dalej
                <ChevronRight size={18} />
              </button>
              {canGoNext() && (
                <p className="text-center text-xs text-slate-400 mt-2">
                  lub naciśnij <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono">Enter</kbd>
                </p>
              )}
            </div>
          )}

        </div>

        {/* Legal */}
        {step === 0 && (
          <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed px-4">
            Rejestrując się akceptujesz{' '}
            <span
              onClick={() => setShowTermsModal(true)}
              className="text-rose-500 cursor-pointer hover:underline"
            >
              Regulamin
            </span>
            {' '}i{' '}
            <span
              onClick={() => setShowPrivacyModal(true)}
              className="text-rose-500 cursor-pointer hover:underline"
            >
              Politykę Prywatności
            </span>
          </p>
        )}

        {/* Legal Modals */}
        <LegalModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          type="terms"
          content={TERMS_OF_SERVICE}
        />
        <LegalModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          type="privacy"
          content={PRIVACY_POLICY}
        />
      </div>
    </div>
  );
}

/* ── Helper subcomponent ── */
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-1">
      <div className="bg-rose-100 p-2 rounded-xl flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <p className="text-slate-500 text-xs mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}

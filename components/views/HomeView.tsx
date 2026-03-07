'use client';

import Image from 'next/image';
import { Heart, MapPin, ShieldCheck, Eye, Star, ChevronRight, Sparkles, Search, Bolt, Lock } from 'lucide-react';
import { Profile, ViewType, LookingForCategory, LOOKING_FOR_OPTIONS } from '@/lib/types';

interface HomeViewProps {
  profiles: Profile[];
  onNavigate: (view: ViewType) => void;
  onSelectProfile: (profile: Profile) => void;
  onSearchFor: (cat: LookingForCategory) => void;
  userName?: string;
  guestRestrictions?: {
    isRestricted: boolean;
    shouldBlurPhoto: (index: number, total: number) => boolean;
    getVisibleProfilesLimit: () => number;
    canViewFullProfile: () => boolean;
  };
}

const MATCH_SCORES = [94, 87, 91, 78];

export default function HomeView({ profiles, onNavigate, onSelectProfile, onSearchFor, userName, guestRestrictions }: HomeViewProps) {
  // Wyciągnij imię z userName (jeśli to email, weź przed @, jeśli imię, zostaw)
  let displayName = userName || '';
  if (displayName && displayName.includes('@')) {
    displayName = displayName.split('@')[0];
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  }
  
  // Limit profili dla gości
  const visibleLimit = guestRestrictions?.getVisibleProfilesLimit() || 999;
  const limitedProfiles = profiles.slice(0, visibleLimit);
  
  // Liczba profili do wyświetlenia
  const featuredProfiles = limitedProfiles.slice(0, 6); // Dopasowania dnia
  const nearbyProfiles = limitedProfiles.slice(6, 10); // Nowe w okolicy (max 4)
  const newMatches = limitedProfiles.length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 -mt-6">
      {/* ── HERO ── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-rose-500 to-orange-400" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative px-8 py-10 flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-5xl shadow-lg">
              👨‍💼
            </div>
          </div>
          <div className="flex-1 text-white text-center md:text-left">
            {displayName ? (
              <p className="text-rose-100 font-medium mb-1">Dzień dobry{displayName ? `, ${displayName}` : ''} 👋</p>
            ) : null}
            {newMatches > 0 ? (
              <h2 className="text-3xl font-bold mb-4 leading-tight">Dziś czeka na Ciebie<br/>{newMatches} nowych dopasowań!</h2>
            ) : (
              <h2 className="text-3xl font-bold mb-4 leading-tight">Brak nowych dopasowań na dziś</h2>
            )}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button onClick={() => onNavigate('discover')}
                className="bg-amber-400 text-amber-950 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-300 transition-all shadow-lg border border-amber-300">
                <Bolt size={18} /> Szybkie Randki
              </button>
              <button onClick={() => onNavigate('search')}
                className="bg-white/20 backdrop-blur text-white border border-white/30 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/30 transition-all">
                <Search size={18} /> Szukaj profili
              </button>
            </div>
          </div>
          {/* Statystyki */}
          <div className="flex md:flex-col gap-3 shrink-0">
            {[
              { label: 'Wyświetlenia', value: '24', icon: <Eye size={14} /> },
              { label: 'Polubienia', value: '8', icon: <Heart size={14} /> },
              { label: 'Wiadomości', value: '3', icon: <Star size={14} /> },
            ].map(s => (
              <div key={s.label} className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-center text-white">
                <div className="flex items-center justify-center gap-1 text-xl font-bold">{s.icon}{s.value}</div>
                <div className="text-xs text-rose-100">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CZEGO SZUKASZ? ── */}
      <section>
        <h3 className="text-base font-bold text-slate-700 mb-3">Czego szukasz?</h3>
        <div className="grid grid-cols-3 gap-3">
          {LOOKING_FOR_OPTIONS.map((opt) => {
            const bgMap: Record<string, string> = {
              rose:   'from-rose-500 to-pink-500',
              amber:  'from-amber-400 to-orange-400',
              violet: 'from-violet-500 to-purple-500',
            };
            return (
              <button
                key={opt.id}
                onClick={() => onSearchFor(opt.id)}
                className={`relative overflow-hidden rounded-2xl p-4 text-white text-left shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all bg-gradient-to-br ${bgMap[opt.color]}`}
              >
                <div className="text-3xl mb-2">{opt.emoji}</div>
                <p className="font-bold text-sm leading-tight">{opt.label}</p>
                <p className="text-[10px] opacity-80 mt-0.5 leading-tight hidden sm:block">{opt.description.slice(0, 40)}…</p>
                <div className="absolute -bottom-4 -right-4 text-6xl opacity-10">{opt.emoji}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SZYBKIE WYSZUKIWANIE ── */}
      <section>
        <div
          onClick={() => onNavigate('search')}
          className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
            <Search size={18} className="text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">Szukaj profili po filtrach</p>
            <p className="text-xs text-slate-400">Wiek, miasto, zainteresowania, styl życia…</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {['60–70 lat', 'Kraków', 'Teatr'].map((tag) => (
              <span key={tag} className="hidden sm:block bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-1 rounded-lg">
                {tag}
              </span>
            ))}
            <ChevronRight size={16} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
          </div>
        </div>
      </section>

      {/* ── DOPASOWANIA DNIA ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={20} className="text-rose-500" /> Dopasowania dnia
          </h3>
          <button onClick={() => onNavigate('discover')}
            className="text-amber-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
            Zobacz wszystkie <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featuredProfiles.map((p, i) => (
            <div key={p.id} onClick={() => onSelectProfile(p)}
              className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all hover:-translate-y-1 aspect-[3/4]">
              <Image
                src={p.image}
                alt={p.name}
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                  guestRestrictions?.shouldBlurPhoto(i, featuredProfiles.length) ? 'blur-md' : ''
                }`}
              />
                            {/* Lock overlay for blurred photos */}
                            {guestRestrictions?.shouldBlurPhoto(i, featuredProfiles.length) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                                  <Lock size={24} className="text-rose-500" />
                                </div>
                              </div>
                            )}
              {/* gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* badges */}
              <div className="absolute top-3 left-3 flex gap-1.5">
                {p.isVerified && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <ShieldCheck size={10} /> Zweryfikowany
                  </span>
                )}
              </div>
              <div className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {MATCH_SCORES[i % MATCH_SCORES.length]}% zgodności
              </div>
              {/* info */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h4 className="text-white font-bold text-lg leading-tight">
                  {p.name}, {p.age}
                </h4>
                <p className="text-white/80 text-sm flex items-center gap-1">
                  <MapPin size={12} /> {p.city}
                </p>
                <div className="flex gap-1 flex-wrap mt-2">
                  {p.interests.slice(0, 2).map(t => (
                    <span key={t} className="bg-white/20 backdrop-blur text-white text-xs px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── KTO CIĘ POLUBIŁ (teaser) ── */}
      <section className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-100 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="flex -space-x-4">
          {featuredProfiles.slice(0, 3).map((p) => (
            <div key={p.id} className="relative w-16 h-16 rounded-full border-3 border-white overflow-hidden shadow-md filter blur-sm">
              <Image src={p.image} alt="" fill sizes="64px" className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="w-16 h-16 rounded-full bg-rose-500 border-3 border-white flex items-center justify-center shadow-md text-white font-bold text-sm">
            +5
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-xl font-bold text-slate-800 mb-1">8 osób polubiło Twój profil! ❤️</h4>
          <p className="text-slate-500 text-sm">Sprawdź kto jest zainteresowany i odpowiedz na ich zaproszenie</p>
        </div>
        <button onClick={() => onNavigate('likes')}
          className="bg-rose-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-600 transition-all whitespace-nowrap shadow-md shadow-rose-200">
          Zobacz kto →
        </button>
      </section>

      {nearbyProfiles.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin size={20} className="text-rose-500" /> Nowe osoby w Twojej okolicy
            </h3>
            <button onClick={() => onNavigate('discover')}
              className="text-rose-500 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
              Zobacz wszystkie <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nearbyProfiles.map((p, i) => (
            <div key={p.id} onClick={() => onSelectProfile(p)}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 flex gap-4 p-4 cursor-pointer hover:shadow-md hover:border-rose-200 transition-all group">
              <div className="relative shrink-0 w-20 h-20">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="80px"
                  className={`rounded-xl object-cover group-hover:scale-105 transition-transform ${
                    guestRestrictions?.shouldBlurPhoto(featuredProfiles.length + i, limitedProfiles.length) ? 'blur-md' : ''
                  }`}
                />
                {/* Lock overlay for blurred photos */}
                {guestRestrictions?.shouldBlurPhoto(featuredProfiles.length + i, limitedProfiles.length) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-xl">
                    <div className="bg-white/95 rounded-full p-1.5 shadow-md">
                      <Lock size={14} className="text-rose-500" />
                    </div>
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800 text-lg">{p.name}, {p.age}</h4>
                  {p.isVerified && <ShieldCheck size={14} className="text-emerald-500 shrink-0" />}
                </div>
                <p className="text-slate-400 text-sm flex items-center gap-1 mb-2">
                  <MapPin size={12} /> {p.city} · {p.details.occupation}
                </p>
                <p className="text-slate-600 text-sm line-clamp-1 italic">&quot;{p.bio.slice(0, 60)}...&quot;</p>
              </div>
              <div className="shrink-0 flex flex-col items-end justify-between">
                <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                  {MATCH_SCORES[i % MATCH_SCORES.length]}%
                </span>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-rose-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {/* CTA - Zobacz więcej */}
        {profiles.length > featuredProfiles.length && (
          <div className="mt-6 text-center">
            <button 
              onClick={() => onNavigate('discover')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Sparkles size={20} />
              Przeglądaj wszystkie profile ({profiles.length})
              <ChevronRight size={20} />
            </button>
            <p className="text-slate-400 text-sm mt-3">
              Użyj filtrów aby znaleźć idealną osobę dla siebie
            </p>
          </div>
        )}
      </section>
      )}

    </div>
  );
}

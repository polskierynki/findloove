'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Heart, MapPin, ShieldCheck, Eye, ChevronRight, Sparkles, Search, HeartHandshake, Lock, MessageCircle, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile, ViewType, LookingForCategory, LOOKING_FOR_OPTIONS } from '@/lib/types';

interface HomeViewProps {
  profiles: Profile[];
  onNavigate: (view: ViewType) => void;
  onSelectProfile: (profile: Profile) => void;
  onSearchFor: (cat: LookingForCategory) => void;
  userName?: string;
  isLoggedIn?: boolean;
  guestRestrictions?: {
    isRestricted: boolean;
    shouldBlurPhoto: (index: number, total: number) => boolean;
    getVisibleProfilesLimit: () => number;
    canViewFullProfile: () => boolean;
  };
  profileCompletion?: {
    shouldBlurPhotos: boolean;
    shouldBlurBios: boolean;
    canContact: boolean;
    message: string;
  };
  onShowCompletionModal?: () => void;
}

const MATCH_SCORES = [94, 87, 91, 78];
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

interface HomeHeroStats {
  newMatches: number;
  newProfiles: number;
  likesReceived: number;
  messagesReceived: number;
}

function isRecent(dateLike?: string): boolean {
  if (!dateLike) return false;
  const ts = new Date(dateLike).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= WEEK_IN_MS;
}

export default function HomeView({ profiles, onNavigate, onSelectProfile, onSearchFor, userName, isLoggedIn, guestRestrictions, profileCompletion, onShowCompletionModal }: HomeViewProps) {
  // Wyciągnij imię z userName (jeśli to email, weź przed @, jeśli imię, zostaw)
  let displayName = userName || '';
  if (displayName && displayName.includes('@')) {
    displayName = displayName.split('@')[0];
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  }

  const [heroPhoto, setHeroPhoto] = useState<string | null>(null);
  const [heroStats, setHeroStats] = useState<HomeHeroStats>({
    newMatches: 0,
    newProfiles: 0,
    likesReceived: 0,
    messagesReceived: 0,
  });
  const [heroLoading, setHeroLoading] = useState(false);
  
  // Limit profili dla gości
  const visibleLimit = guestRestrictions?.getVisibleProfilesLimit() || 999;
  const limitedProfiles = useMemo(() => profiles.slice(0, visibleLimit), [profiles, visibleLimit]);
  
  // Liczba profili do wyświetlenia
  const featuredProfiles = useMemo(() => limitedProfiles.slice(0, 6), [limitedProfiles]); // Dopasowania dnia
  const nearbyProfiles = useMemo(() => limitedProfiles.slice(6, 10), [limitedProfiles]); // Nowe w okolicy (max 4)

  const fallbackHeroStats = useMemo<HomeHeroStats>(() => {
    return {
      newMatches: Math.max(0, limitedProfiles.length - 1),
      newProfiles: limitedProfiles.filter((profile) => isRecent(profile.createdAt)).length,
      likesReceived: 0,
      messagesReceived: 0,
    };
  }, [limitedProfiles]);

  useEffect(() => {
    let cancelled = false;

    const loadHeroData = async () => {
      setHeroStats(fallbackHeroStats);

      if (!isLoggedIn) {
        setHeroPhoto(null);
        return;
      }

      setHeroLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        if (!cancelled) {
          setHeroPhoto(null);
          setHeroStats(fallbackHeroStats);
          setHeroLoading(false);
        }
        return;
      }

      const userId = user.id;

      const [likesReceivedResponse, messagesReceivedResponse, likesSentResponse, sentMessagesResponse, receivedMessagesResponse, profileResponse] = await Promise.all([
        supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('to_profile_id', userId),
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('to_profile_id', userId),
        supabase
          .from('likes')
          .select('to_profile_id')
          .eq('from_profile_id', userId),
        supabase
          .from('messages')
          .select('to_profile_id')
          .eq('from_profile_id', userId),
        supabase
          .from('messages')
          .select('from_profile_id')
          .eq('to_profile_id', userId),
        supabase
          .from('profiles')
          .select('image_url')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      const interactedProfileIds = new Set<string>();

      (likesSentResponse.data || []).forEach((row: { to_profile_id: string | null }) => {
        if (row.to_profile_id) interactedProfileIds.add(row.to_profile_id);
      });

      (sentMessagesResponse.data || []).forEach((row: { to_profile_id: string | null }) => {
        if (row.to_profile_id) interactedProfileIds.add(row.to_profile_id);
      });

      (receivedMessagesResponse.data || []).forEach((row: { from_profile_id: string | null }) => {
        if (row.from_profile_id) interactedProfileIds.add(row.from_profile_id);
      });

      const availableMatches = profiles.filter((profile) => profile.id !== userId && !interactedProfileIds.has(profile.id));
      const newProfilesCount = profiles.filter((profile) => profile.id !== userId && isRecent(profile.createdAt)).length;

      if (cancelled) return;

      setHeroStats({
        newMatches: availableMatches.length,
        newProfiles: newProfilesCount,
        likesReceived: likesReceivedResponse.count || 0,
        messagesReceived: messagesReceivedResponse.count || 0,
      });

      const mappedPhoto = ((profileResponse.data as { image_url?: string } | null)?.image_url) || null;
      setHeroPhoto(mappedPhoto);
      setHeroLoading(false);
    };

    loadHeroData();

    return () => {
      cancelled = true;
    };
  }, [fallbackHeroStats, isLoggedIn, profiles]);

  const effectiveStats = heroStats;
  const profileInitial = (displayName?.trim()?.charAt(0) || 'U').toUpperCase();
  const likeTeaserExtra = Math.max(0, effectiveStats.likesReceived - 3);
  const likesHeadline =
    effectiveStats.likesReceived > 0
      ? `${effectiveStats.likesReceived} ${effectiveStats.likesReceived === 1 ? 'osoba polubiła' : 'osób polubiło'} Twój profil! ❤️`
      : isLoggedIn
        ? 'Na razie brak nowych polubień'
        : 'Zaloguj się i sprawdź, kto Cię polubił ❤️';

  return (
    <div className="space-y-10 animate-in fade-in duration-500 -mt-6">
      {/* ── HERO ── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-rose-500 to-orange-400" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative px-8 py-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative shrink-0">
            <div className="absolute -inset-2 rounded-[1.75rem] bg-white/30 blur-md" />
            <div className="relative h-24 w-24 rounded-[1.75rem] bg-gradient-to-br from-amber-300 via-white to-rose-200 p-[3px] shadow-2xl">
              <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/30 backdrop-blur">
                {heroPhoto ? (
                  <Image
                    src={heroPhoto}
                    alt="Twoje zdjęcie profilowe"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500 to-orange-400 text-3xl font-extrabold text-white">
                    {profileInitial}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-white bg-emerald-500 p-1.5 text-white shadow-lg">
              <ShieldCheck size={13} />
            </div>
            <div className="absolute -left-2 -top-2 rounded-full bg-white/85 p-1 text-rose-500 shadow-md">
              <Sparkles size={11} />
            </div>
          </div>
          <div className="flex-1 text-white text-center md:text-left">
            {displayName ? (
              <p className="text-rose-100 font-medium mb-1">Dzień dobry{displayName ? `, ${displayName}` : ''} 👋</p>
            ) : null}
            {effectiveStats.newMatches > 0 ? (
              <h2 className="text-3xl font-bold mb-4 leading-tight">Dziś czeka na Ciebie<br/>{effectiveStats.newMatches} nowych dopasowań!</h2>
            ) : (
              <h2 className="text-3xl font-bold mb-4 leading-tight">Brak nowych dopasowań na dziś</h2>
            )}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button onClick={() => onNavigate('discover')}
                className="bg-amber-400 text-amber-950 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-300 transition-all shadow-lg border border-amber-300">
                <HeartHandshake size={18} /> Szybkie Randki
              </button>
              <button onClick={() => onNavigate('search')}
                className="bg-white/20 backdrop-blur text-white border border-white/30 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/30 transition-all">
                <Search size={18} /> Szukaj profili
              </button>
            </div>
            {heroLoading && isLoggedIn && (
              <p className="mt-2 text-xs font-semibold text-rose-100/90">Aktualizuję Twoje statystyki...</p>
            )}
          </div>
          {/* Statystyki */}
          <div className="flex md:flex-col gap-3 shrink-0">
            {[
              { label: 'Nowe profile', value: effectiveStats.newProfiles, icon: <Eye size={14} /> },
              { label: 'Polubienia', value: effectiveStats.likesReceived, icon: <Heart size={14} /> },
              { label: 'Wiadomości', value: effectiveStats.messagesReceived, icon: <MessageCircle size={14} /> },
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
            const iconMap = {
              'Heart': <Heart size={32} />,
              'Users': <Users size={32} />,
              'Sparkles': <Sparkles size={32} />,
            };
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
                <div className="mb-2">{iconMap[opt.iconName as keyof typeof iconMap]}</div>
                <p className="font-bold text-sm leading-tight">{opt.label}</p>
                <p className="text-[10px] opacity-80 mt-0.5 leading-tight hidden sm:block">{opt.description.slice(0, 40)}…</p>
                <div className="absolute -bottom-4 -right-4 opacity-10">
                  {iconMap[opt.iconName as keyof typeof iconMap] && <div className="scale-[2]">{iconMap[opt.iconName as keyof typeof iconMap]}</div>}
                </div>
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
          {featuredProfiles.map((p, i) => {
            // Determine if photo should be blurred
            const guestBlur = guestRestrictions?.shouldBlurPhoto(i, featuredProfiles.length) || false;
            const profileBlur = isLoggedIn && profileCompletion?.shouldBlurPhotos;
            const shouldBlur = guestBlur || profileBlur;

            return (
              <div 
                key={p.id} 
                onClick={() => {
                  if (profileBlur && onShowCompletionModal) {
                    onShowCompletionModal();
                  } else {
                    onSelectProfile(p);
                  }
                }}
                className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all hover:-translate-y-1 aspect-[3/4]"
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    shouldBlur ? 'blur-md' : ''
                  }`}
                />
                {/* Lock overlay for blurred photos */}
                {shouldBlur && (
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
                <h4 className={`text-white font-bold text-lg leading-tight ${profileCompletion?.shouldBlurBios && isLoggedIn ? 'blur-sm select-none' : ''}`}>
                  {p.name}, {p.age}
                </h4>
                <p className={`text-white/80 text-sm flex items-center gap-1 ${profileCompletion?.shouldBlurBios && isLoggedIn ? 'blur-sm select-none' : ''}`}>
                  <MapPin size={12} /> {p.city}
                </p>
                <div className="flex gap-1 flex-wrap mt-2">
                  {p.interests.slice(0, 2).map(t => (
                    <span key={t} className={`bg-white/20 backdrop-blur text-white text-xs px-2 py-0.5 rounded-full ${profileCompletion?.shouldBlurBios && isLoggedIn ? 'blur-sm select-none' : ''}`}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            );
          })}
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
            {likeTeaserExtra > 0 ? `+${likeTeaserExtra}` : <Heart size={16} />}
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-xl font-bold text-slate-800 mb-1">{likesHeadline}</h4>
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

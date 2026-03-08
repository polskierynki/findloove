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
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ACTIVE_NOW_WINDOW_MS = 15 * 60 * 1000;

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

function isToday(dateLike?: string): boolean {
  if (!dateLike) return false;
  const ts = new Date(dateLike).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= DAY_IN_MS;
}

function isActiveNow(dateLike?: string): boolean {
  if (!dateLike) return false;
  const ts = new Date(dateLike).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= ACTIVE_NOW_WINDOW_MS;
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

  const guestPortalStats = useMemo(() => {
    return {
      activeNow: profiles.filter((profile) => isActiveNow(profile.lastActive)).length,
      newToday: profiles.filter((profile) => isToday(profile.createdAt)).length,
      verified: profiles.filter((profile) => profile.isVerified).length,
      totalMembers: profiles.length,
    };
  }, [profiles]);

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
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 -mt-6 pb-20 md:pb-0">
      {/* ── HERO ── */}
      <div className="relative rounded-xl md:rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-rose-500 to-orange-400" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative px-4 md:px-8 py-6 md:py-10">
          {isLoggedIn ? (
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
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
          ) : (
            <div className="w-full max-w-4xl mx-auto text-white text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
                <ShieldCheck size={14} /> Społeczność 50+ z weryfikacją profili
              </div>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-3">
                Poznaj osoby 50+ z Twojej okolicy
              </h2>
              <p className="text-rose-100 text-sm md:text-base mb-5 md:mb-6 max-w-3xl">
                Zobacz, kto jest online teraz, sprawdź najnowsze profile i dołącz za darmo.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5 md:mb-6">
                {[
                  { label: 'Aktywni teraz', value: guestPortalStats.activeNow, icon: <Eye size={14} /> },
                  { label: 'Nowe dzisiaj', value: guestPortalStats.newToday, icon: <Sparkles size={14} /> },
                  { label: 'Zweryfikowani', value: guestPortalStats.verified, icon: <ShieldCheck size={14} /> },
                  { label: 'Członkowie', value: guestPortalStats.totalMembers, icon: <Users size={14} /> },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-left md:text-center">
                    <div className="flex items-center md:justify-center gap-1 text-lg md:text-xl font-bold">
                      {stat.icon}
                      {stat.value}
                    </div>
                    <div className="text-[11px] md:text-xs text-rose-100">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 md:gap-3 justify-center md:justify-start">
                <button
                  onClick={() => onNavigate('register')}
                  className="bg-amber-400 text-amber-950 px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-300 transition-all shadow-lg border border-amber-300"
                >
                  <HeartHandshake size={18} /> Załóż konto za darmo
                </button>
                <button
                  onClick={() => onNavigate('auth')}
                  className="bg-white/20 backdrop-blur text-white border border-white/30 px-5 py-3 rounded-xl font-bold hover:bg-white/30 transition-all"
                >
                  Mam już konto
                </button>
              </div>

              <p className="mt-3 text-[11px] md:text-xs text-rose-100/90">
                Zweryfikowane profile • Moderacja • Zgłoszenia 24/7
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── CZEGO SZUKASZ? ── */}
      <section>
        <h3 className="text-sm md:text-base font-bold text-slate-700 mb-3">Czego szukasz?</h3>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {LOOKING_FOR_OPTIONS.map((opt) => {
            const iconMap = {
              'Heart': <Heart size={28} className="md:w-8 md:h-8" />,
              'Users': <Users size={28} className="md:w-8 md:h-8" />,
              'Sparkles': <Sparkles size={28} className="md:w-8 md:h-8" />,
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
                className={`relative overflow-hidden rounded-xl md:rounded-2xl p-3 md:p-4 text-white text-left shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all bg-gradient-to-br ${bgMap[opt.color]} active:scale-95`}
              >
                <div className="mb-1.5 md:mb-2">{iconMap[opt.iconName as keyof typeof iconMap]}</div>
                <p className="font-bold text-xs md:text-sm leading-tight">{opt.label}</p>
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
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={18} className="md:w-5 md:h-5 text-rose-500" /> Dopasowania dnia
          </h3>
          <button onClick={() => onNavigate('discover')}
            className="text-amber-600 font-semibold text-xs md:text-sm flex items-center gap-1 hover:gap-2 transition-all active:scale-95">
            Zobacz wszystkie <ChevronRight size={14} className="md:w-4 md:h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
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
                className="relative rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 active:scale-95 aspect-[3/4] touch-manipulation"
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    shouldBlur ? 'blur-md' : ''
                  }`}
                  priority={i < 2}
                />
                {/* Lock overlay for blurred photos */}
                {shouldBlur && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-lg">
                      <Lock size={28} className="md:w-6 md:h-6 text-rose-500" />
                    </div>
                  </div>
                )}
              {/* gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* badges */}
              <div className="absolute top-2 md:top-3 left-2 md:left-3 flex gap-1 md:gap-1.5">
                {p.isVerified && (
                  <span className="bg-emerald-500 text-white text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <ShieldCheck size={9} className="md:w-[10px] md:h-[10px]" /> <span className="hidden md:inline">Zweryfikowany</span>
                  </span>
                )}
              </div>
              <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-rose-500 text-white text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                {MATCH_SCORES[i % MATCH_SCORES.length]}% zgodności
              </div>
              {/* info */}
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <h4 className={`text-white font-bold text-base md:text-lg leading-tight ${profileCompletion?.shouldBlurBios && isLoggedIn ? 'blur-sm select-none' : ''}`}>
                  {p.name}, {p.age}
                </h4>
                <p className={`text-white/80 text-xs md:text-sm flex items-center gap-1 ${profileCompletion?.shouldBlurBios && isLoggedIn ? 'blur-sm select-none' : ''}`}>
                  <MapPin size={11} className="md:w-3 md:h-3" /> {p.city}
                </p>
                <div className="flex gap-1 flex-wrap mt-1.5 md:mt-2">
                  {p.interests.slice(0, 2).map(t => (
                    <span key={t} className={`bg-white/20 backdrop-blur text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full ${profileCompletion?.shouldBlurBios && isLoggedIn ? 'blur-sm select-none' : ''}`}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* ── KTO CIĘ POLUBIŁ (teaser) ── */}
      <section className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-100 rounded-xl md:rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6">
        <div className="flex -space-x-3 md:-space-x-4">
          {featuredProfiles.slice(0, 3).map((p) => (
            <div key={p.id} className="relative w-12 h-12 md:w-16 md:h-16 rounded-full border-2 md:border-3 border-white overflow-hidden shadow-md filter blur-sm">
              <Image src={p.image} alt="" fill sizes="(max-width: 768px) 48px, 64px" className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-rose-500 border-2 md:border-3 border-white flex items-center justify-center shadow-md text-white font-bold text-xs md:text-sm">
            {likeTeaserExtra > 0 ? `+${likeTeaserExtra}` : <Heart size={14} className="md:w-4 md:h-4" />}
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-base md:text-xl font-bold text-slate-800 mb-1">{likesHeadline}</h4>
          <p className="text-slate-500 text-xs md:text-sm">Sprawdź kto jest zainteresowany i odpowiedz na ich zaproszenie</p>
        </div>
        <button onClick={() => onNavigate('likes')}
          className="bg-rose-500 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-bold hover:bg-rose-600 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-rose-200 text-sm md:text-base touch-manipulation">
          Zobacz kto →
        </button>
      </section>

      {nearbyProfiles.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin size={18} className="md:w-5 md:h-5 text-rose-500" /> <span className="hidden sm:inline">Nowe osoby w Twojej okolicy</span><span className="sm:hidden">W okolicy</span>
            </h3>
            <button onClick={() => onNavigate('discover')}
              className="text-rose-500 font-semibold text-xs md:text-sm flex items-center gap-1 hover:gap-2 transition-all active:scale-95">
              Zobacz wszystkie <ChevronRight size={14} className="md:w-4 md:h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {nearbyProfiles.map((p, i) => (
            <div key={p.id} onClick={() => onSelectProfile(p)}
              className="bg-white rounded-xl md:rounded-2xl shadow-md border border-slate-100 flex gap-3 md:gap-4 p-3 md:p-4 cursor-pointer hover:shadow-lg hover:border-rose-200 transition-all active:scale-95 group touch-manipulation">
              <div className="relative shrink-0 w-16 h-16 md:w-20 md:h-20">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 64px, 80px"
                  className={`rounded-lg md:rounded-xl object-cover group-hover:scale-105 transition-transform ${
                    guestRestrictions?.shouldBlurPhoto(featuredProfiles.length + i, limitedProfiles.length) ? 'blur-md' : ''
                  }`}
                />
                {/* Lock overlay for blurred photos */}
                {guestRestrictions?.shouldBlurPhoto(featuredProfiles.length + i, limitedProfiles.length) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg md:rounded-xl">
                    <div className="bg-white/95 rounded-full p-1 md:p-1.5 shadow-md">
                      <Lock size={12} className="md:w-[14px] md:h-[14px] text-rose-500" />
                    </div>
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-emerald-400 border-2 border-white rounded-full" />
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <h4 className="font-bold text-slate-800 text-sm md:text-lg">{p.name}, {p.age}</h4>
                  {p.isVerified && <ShieldCheck size={12} className="md:w-[14px] md:h-[14px] text-emerald-500 shrink-0" />}
                </div>
                <p className="text-slate-400 text-xs md:text-sm flex items-center gap-1 mb-1.5 md:mb-2">
                  <MapPin size={10} className="md:w-3 md:h-3" /> {p.city} · {p.details.occupation}
                </p>
                <p className="text-slate-600 text-xs md:text-sm line-clamp-1 italic">&quot;{p.bio.slice(0, 60)}...&quot;</p>
              </div>
              <div className="shrink-0 flex flex-col items-end justify-between">
                <span className="text-[10px] md:text-xs font-bold text-rose-500 bg-rose-50 px-1.5 md:px-2 py-0.5 rounded-full">
                  {MATCH_SCORES[i % MATCH_SCORES.length]}%
                </span>
                <ChevronRight size={16} className="md:w-[18px] md:h-[18px] text-slate-300 group-hover:text-rose-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {/* CTA - Zobacz więcej */}
        {profiles.length > featuredProfiles.length && (
          <div className="mt-5 md:mt-6 text-center">
            <button 
              onClick={() => onNavigate('discover')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 text-sm md:text-base touch-manipulation"
            >
              <Sparkles size={18} className="md:w-5 md:h-5" />
              Przeglądaj wszystkie profile ({profiles.length})
              <ChevronRight size={18} className="md:w-5 md:h-5" />
            </button>
            <p className="text-slate-400 text-xs md:text-sm mt-2 md:mt-3">
              Użyj filtrów aby znaleźć idealną osobę dla siebie
            </p>
          </div>
        )}
      </section>
      )}

    </div>
  );
}

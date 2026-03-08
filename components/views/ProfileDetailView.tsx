'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  ChevronLeft, Heart, MapPin, MessageCircle, Phone, ShieldCheck,
  Cigarette, Baby, Star, Briefcase, User, X, ChevronRight, Lock, LogIn, Hand, Gift, SmilePlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile, LOOKING_FOR_OPTIONS, getLookingFor } from '@/lib/types';

interface ProfileDetailViewProps {
  profile: Profile;
  onBack: () => void;
  onMessage: () => void;
  onContactRequest: (name: string) => void;
  onNotify: (message: string) => void;
  isLoggedIn: boolean;
  tokens: number;
  onSpendToken: () => boolean;
  unlockedGalleries: string[];
  onUnlockGallery: (id: string) => void;
  onLoginRequest: () => void;
  isAdmin?: boolean;
  guestRestrictions?: {
    isRestricted: boolean;
    canSendMessage: () => boolean;
    canLikeProfile: () => boolean;
  };
  onGuestFeatureBlock?: (featureName: string) => void;
}

const INTEREST_COLORS: Record<string, string> = {
  default: 'bg-rose-50 text-rose-700 border-rose-100',
  alt1: 'bg-amber-50 text-amber-700 border-amber-100',
  alt2: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  alt3: 'bg-sky-50 text-sky-700 border-sky-100',
  alt4: 'bg-violet-50 text-violet-700 border-violet-100',
};
const COLOR_KEYS = Object.keys(INTEREST_COLORS);

const PREMIUM_EMOTE_PACK: { emoji: string; label: string; tokenCost: number }[] = [
  { emoji: '💐', label: 'Bukiet kwiatów', tokenCost: 1 },
  { emoji: '🥰', label: 'Słodki uśmiech', tokenCost: 1 },
  { emoji: '🧸', label: 'Pluszowy miś', tokenCost: 1 },
  { emoji: '🍫', label: 'Słodki upominek', tokenCost: 1 },
  { emoji: '😍', label: 'Zachwyt', tokenCost: 1 },
  { emoji: '😂', label: 'Humorystyczny akcent', tokenCost: 1 },
  { emoji: '😘', label: 'Romantyczna zaczepka', tokenCost: 2 },
  { emoji: '🎶', label: 'Muzyczna dedykacja', tokenCost: 2 },
];

type InteractionKind = 'poke' | 'gift' | 'emote';

/* ── fallback avatar ─────────────────────────────────────────── */
function ProfileAvatar({ src, name, className }: { src: string; name: string; className: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-rose-100 to-rose-200`}>
        <User size={64} className="text-rose-300" />
      </div>
    );
  }
  return (
    <div className="relative w-full h-full">
      <Image
        src={src}
        alt={name}
        fill
        sizes="(min-width: 768px) 768px, 100vw"
        className={className}
        onError={() => setError(true)}
      />
    </div>
  );
}

/* ── main component ─────────────────────────────────────────── */
export default function ProfileDetailView({
  profile: p,
  onBack,
  onMessage,
  onContactRequest,
  onNotify,
  isLoggedIn,
  tokens,
  onSpendToken,
  unlockedGalleries,
  onUnlockGallery,
  onLoginRequest,
  isAdmin = false,
  guestRestrictions,
  onGuestFeatureBlock,
}: ProfileDetailViewProps) {
  /* all gallery photos */
  const allPhotos: string[] = p.photos && p.photos.length > 0 ? p.photos : [p.image];
  const isGalleryUnlocked = isLoggedIn && unlockedGalleries.includes(p.id);
  const canViewPhoto = (i: number) => i === 0 || isGalleryUnlocked;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lockModal, setLockModal] = useState(false);
  const [senderProfileId, setSenderProfileId] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSenderProfile = async () => {
      if (!isLoggedIn) {
        setSenderProfileId(null);
        return;
      }

      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id || null;
      if (!cancelled) {
        setSenderProfileId(userId);
      }
    };

    loadSenderProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const ensureCanInteract = (): boolean => {
    if (!isLoggedIn) {
      onLoginRequest();
      return false;
    }

    if (!senderProfileId) {
      onNotify('Nie udało się pobrać Twojego profilu. Odśwież stronę i spróbuj ponownie.');
      return false;
    }

    if (senderProfileId === p.id) {
      onNotify('Nie możesz wysyłać interakcji do własnego profilu.');
      return false;
    }

    return true;
  };

  const sendLike = async () => {
    if (!ensureCanInteract()) return;
    setActionInFlight('like');

    const { error } = await supabase.from('likes').upsert({
      from_profile_id: senderProfileId,
      to_profile_id: p.id,
    });

    setActionInFlight(null);

    if (error) {
      onNotify('Nie udało się wysłać polubienia: ' + error.message);
      return;
    }

    onNotify(`Polubiono profil ${p.name}. ❤️`);
  };

  const sendInteraction = async (
    kind: InteractionKind,
    emoji: string,
    label: string,
    tokenCost: number,
  ) => {
    if (!ensureCanInteract()) return;

    const actionKey = `${kind}:${emoji}`;
    setActionInFlight(actionKey);

    const { data, error } = await supabase
      .from('profile_interactions')
      .insert({
        from_profile_id: senderProfileId,
        to_profile_id: p.id,
        kind,
        emoji,
        label,
        token_cost: tokenCost,
      })
      .select('id')
      .single();

    if (error) {
      setActionInFlight(null);
      onNotify('Nie udało się wysłać interakcji: ' + error.message);
      return;
    }

    if (tokenCost > 0) {
      const paid = onSpendToken();
      if (!paid) {
        await supabase.from('profile_interactions').delete().eq('id', data.id);
        setActionInFlight(null);
        onNotify(`Brak Serduszek. Ta interakcja kosztuje ${tokenCost}.`);
        return;
      }
    }

    setActionInFlight(null);
    onNotify(`Wysłano: ${emoji} ${label} do ${p.name}.`);
  };

  const openLightbox = (i: number) => {
    if (!canViewPhoto(i)) { setLockModal(true); return; }
    setLightboxIndex(i);
    setLightboxOpen(true);
  };

  const lightboxPrev = () => setLightboxIndex(i => (i - 1 + allPhotos.length) % allPhotos.length);
  const lightboxNext = () => setLightboxIndex(i => (i + 1) % allPhotos.length);

  const handleUnlock = () => {
    if (!isLoggedIn) { setLockModal(false); onLoginRequest(); return; }
    if (onSpendToken()) { onUnlockGallery(p.id); setLockModal(false); }
  };

  return (
    <div className="animate-in slide-in-from-right duration-400 max-w-2xl mx-auto pb-32">
      {/* ADMIN PANEL */}
      {isAdmin && (
        <div className="mb-6 p-4 bg-amber-100 border border-amber-300 rounded-2xl shadow flex flex-col gap-2">
          <div className="font-bold text-amber-900 text-lg flex items-center gap-2">
            <ShieldCheck size={20} className="text-amber-600" /> Panel administratora
          </div>
          <div className="text-amber-800 text-sm">
            <ul className="list-disc pl-5 mb-2">
              <li>Możesz zarządzać użytkownikami i profilami</li>
              <li>Możesz edytować i usuwać dowolne profile (oprócz Super Admina)</li>
              <li>Możesz przeglądać statystyki i zgłoszenia</li>
              <li>Możesz nadawać/odbierać weryfikację</li>
              <li>Możesz zarządzać treściami i pytaniami</li>
            </ul>
            <a href="#" onClick={e => {e.preventDefault(); window.dispatchEvent(new CustomEvent('admin-dashboard'));}} className="inline-block mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-bold shadow hover:bg-amber-700 transition-colors">Przejdź do panelu admina</a>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={e => { if (e.target === e.currentTarget) setLightboxOpen(false); }}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all z-10"
          >
            <X size={22} />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
            {lightboxIndex + 1} / {allPhotos.length}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-bold text-lg drop-shadow">
            {p.name}, {p.age} lat
          </div>

          {allPhotos.length > 1 && (
            <button
              onClick={lightboxPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div className="relative max-h-[85vh] h-[85vh] max-w-[90vw] w-[90vw]">
            <Image
              src={allPhotos[lightboxIndex]}
              alt={p.name}
              fill
              sizes="90vw"
              className="object-contain rounded-xl shadow-2xl select-none"
              draggable={false}
            />
          </div>

          {allPhotos.length > 1 && (
            <button
              onClick={lightboxNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {allPhotos.length > 1 && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2">
              {allPhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === lightboxIndex ? 'bg-white w-5' : 'bg-white/40 w-2'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LOCK MODAL ──────────────────────────────────────────── */}
      {lockModal && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setLockModal(false); }}
        >
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-3">🔒</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Galeria zablokowana</h3>
            {!isLoggedIn ? (
              <>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  Zaloguj się lub zarejestruj za darmo, aby przeglądać wszystkie zdjęcia.
                </p>
                <button
                  onClick={() => { setLockModal(false); onLoginRequest(); }}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-md hover:shadow-rose-200 transition-all flex items-center justify-center gap-2"
                >
                  <LogIn size={17} /> Zaloguj się / Zarejestruj
                </button>
              </>
            ) : tokens > 0 ? (
              <>
                <p className="text-slate-500 text-sm leading-relaxed mb-2">
                  Wydaj <strong className="text-amber-600">1 Serduszko</strong>, aby odblokować pełną galerię {p.name}.
                </p>
                <p className="text-xs text-slate-400 mb-5">Masz teraz: {tokens} 💛 Serduszek</p>
                <button
                  onClick={handleUnlock}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-white font-bold rounded-xl shadow-md hover:shadow-amber-200 transition-all flex items-center justify-center gap-2"
                >
                  💛 Odblokuj za 1 Serduszko
                </button>
              </>
            ) : (
              <p className="text-slate-500 text-sm leading-relaxed mb-5">
                Nie masz Serduszek. Uzupełnij profil lub wróć jutro, aby zdobyć więcej.
              </p>
            )}
            <button
              onClick={() => setLockModal(false)}
              className="mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors w-full"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}

      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-slate-500 font-semibold mb-4 hover:text-rose-500 transition-colors group">
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Wróć
      </button>

      {/* ── HERO PHOTO ── */}
      <div
        className="relative rounded-3xl overflow-hidden mb-4 shadow-xl cursor-pointer group"
        style={{ height: '420px' }}
        onClick={() => openLightbox(0)}
      >
        <ProfileAvatar src={p.image} name={p.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        <div className="absolute top-4 left-4 bg-white/20 backdrop-blur border border-white/30 text-white text-xs font-semibold px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          🔍 Kliknij, aby powiększyć
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          {p.isVerified && (
            <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
              <ShieldCheck size={12} /> Zweryfikowany/-a
            </span>
          )}
          <span className="bg-white/20 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
            ● online
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-4xl font-bold text-white mb-1 drop-shadow">
            {p.name}, {p.age} lat
          </h2>
          <p className="text-white/80 flex items-center gap-1.5 text-lg">
            <MapPin size={16} /> {p.city}
          </p>
        </div>
      </div>

      {/* ── GALLERY STRIP ── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {allPhotos.map((photo, i) => {
          const locked = !canViewPhoto(i);
          return (
            <button
              key={i}
              onClick={() => openLightbox(i)}
              title={locked ? 'Zablokowane — odblokuj Serduszkiem' : 'Kliknij, aby powiększyć'}
              className={`shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 relative shadow-sm transition-all hover:scale-105 ${
                i === 0 ? 'border-rose-400' : 'border-transparent hover:border-slate-200'
              }`}
            >
              <Image
                src={photo}
                alt=""
                fill
                sizes="96px"
                className={`w-full h-full object-cover transition-all ${locked ? 'blur-[3px] brightness-75' : 'opacity-90 hover:opacity-100'}`}
              />
              {locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40">
                  <Lock size={18} className="text-white drop-shadow mb-0.5" />
                  <span className="text-white text-[9px] font-bold drop-shadow">Odblokuj</span>
                </div>
              )}
            </button>
          );
        })}

        {/* CTA chip */}
        {!isGalleryUnlocked && allPhotos.length > 1 && (
          <button
            onClick={() => setLockModal(true)}
            className="shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center text-amber-600 text-xs font-bold hover:bg-amber-100 transition-colors gap-1 shadow-sm"
          >
            <span className="text-2xl">💛</span>
            {isLoggedIn ? `${tokens} Serduszek` : 'Odblokuj'}
          </button>
        )}

        {isGalleryUnlocked && (
          <div className="shrink-0 w-24 h-24 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex flex-col items-center justify-center text-emerald-600 text-xs font-bold gap-1">
            <span className="text-2xl">✅</span>
            Odblokowane
          </div>
        )}
      </div>

      {/* ── QUICK STATS ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: <Briefcase size={15} className="text-rose-400" />, label: 'Zawód', value: p.details.occupation },
          { icon: <Star size={15} className="text-amber-400" />, label: 'Znak zodiaku', value: p.details.zodiac },
          { icon: <Cigarette size={15} className="text-slate-400" />, label: 'Palenie', value: p.details.smoking },
          { icon: <Baby size={15} className="text-sky-400" />, label: 'Dzieci', value: p.details.children },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="shrink-0">{s.icon}</div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              <p className="text-sm font-semibold text-slate-800 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CZEGO SZUKA ── */}
      {(() => {
        const cat = getLookingFor(p.status);
        const opt = cat ? LOOKING_FOR_OPTIONS.find(o => o.id === cat) : null;
        if (!opt) return null;
        const colorMap: Record<string, string> = {
          rose:   'bg-rose-50 border-rose-100 text-rose-700',
          amber:  'bg-amber-50 border-amber-100 text-amber-700',
          violet: 'bg-violet-50 border-violet-100 text-violet-700',
        };
        return (
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border mb-6 shadow-sm ${colorMap[opt.color]}`}>
            <span className="text-3xl">{opt.emoji}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Czego szuka?</p>
              <p className="font-bold text-base">{p.status}</p>
              <p className="text-xs opacity-70 leading-snug">{opt.description}</p>
            </div>
          </div>
        );
      })()}

      {/* ── O MNIE ── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 mb-6 shadow-sm relative">
        <span className="absolute -top-3 left-6 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          O mnie 💬
        </span>
        <p className="text-slate-700 leading-relaxed text-base italic pt-2">
          &quot;{p.bio}&quot;
        </p>
      </div>

      {/* ── STATUS ── */}
      <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-3 mb-6 flex items-center gap-3">
        <Heart size={18} className="text-rose-500 shrink-0" fill="currentColor" />
        <p className="text-slate-700 font-medium text-sm">
          <span className="text-rose-600 font-bold">{p.name}</span> szuka:{' '}
          <span className="text-rose-600 font-bold">{p.status}</span>
        </p>
      </div>

      {/* ── INTERAKCJE ── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 mb-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Sygnały sympatii</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={sendLike}
            disabled={!!actionInFlight}
            className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-bold hover:bg-rose-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <Heart size={15} /> Polub
          </button>
          <button
            onClick={() => sendInteraction('poke', '👋', 'Zaczepka', 0)}
            disabled={!!actionInFlight}
            className="px-3 py-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-bold hover:bg-sky-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <Hand size={15} /> Zaczep
          </button>
          <button
            onClick={() => sendInteraction('gift', '🌹', 'Romantyczny prezent', 1)}
            disabled={!!actionInFlight}
            className="px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <Gift size={15} /> Wyślij prezent (1 💛)
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <SmilePlus size={14} className="text-violet-500" />
            <p className="text-sm font-semibold text-slate-700">Płatny pakiet emoji (romantyczne i zabawne)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PREMIUM_EMOTE_PACK.map((item) => {
              const actionKey = `emote:${item.emoji}`;
              const disabled = !!actionInFlight || tokens < item.tokenCost;
              return (
                <button
                  key={`${item.emoji}-${item.label}`}
                  onClick={() => sendInteraction('emote', item.emoji, item.label, item.tokenCost)}
                  disabled={disabled}
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    disabled
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
                  title={`${item.label} • koszt ${item.tokenCost} 💛`}
                >
                  <span className="mr-1">{item.emoji}</span>
                  {item.label}
                  <span className="ml-1 text-xs">({item.tokenCost} 💛)</span>
                  {actionInFlight === actionKey && <span className="ml-1">…</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Dostępne Serduszka: {tokens}</p>
        </div>
      </div>

      {/* ── ZAINTERESOWANIA ── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 mb-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Zainteresowania</h4>
        <div className="flex flex-wrap gap-2">
          {p.interests.map((t, i) => {
            const colorKey = COLOR_KEYS[i % COLOR_KEYS.length];
            const cls = INTEREST_COLORS[colorKey];
            return (
              <span key={t} className={`border px-4 py-1.5 rounded-full text-sm font-semibold ${cls}`}>
                {t}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── BEZPIECZEŃSTWO ── */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 mb-8 text-sm text-amber-700 flex items-start gap-3">
        <ShieldCheck size={16} className="shrink-0 mt-0.5 text-amber-500" />
        <p>Nigdy nie wysyłaj pieniędzy osobom poznanym w internecie. Skontaktuj się z Panem Serduszko jeśli coś Cię niepokoi.</p>
      </div>

      {/* ── CTA BUTTONS (sticky bottom) ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-100 px-6 py-4 flex gap-3 z-40 shadow-2xl">
        <button 
          onClick={() => {
            if (guestRestrictions?.isRestricted && !guestRestrictions.canSendMessage()) {
              onGuestFeatureBlock?.('Wiadomości');
              return;
            }
            onMessage();
          }}
          className="flex-1 bg-rose-500 text-white py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 active:scale-95">
          <MessageCircle size={20} /> Napisz wiadomość
        </button>
        <button 
          onClick={() => {
            if (guestRestrictions?.isRestricted && !guestRestrictions.canLikeProfile()) {
              onGuestFeatureBlock?.('Kontakt telefoniczny');
              return;
            }
            onContactRequest(p.name);
          }}
          className="flex-1 bg-white border-2 border-emerald-500 text-emerald-600 py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all active:scale-95">
          <Phone size={20} /> Poproś o numer
        </button>
      </div>

    </div>
  );
}

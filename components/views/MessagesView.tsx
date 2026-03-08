'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Search, ShieldCheck, Flag, Ban, Trash2, LogIn, Heart, FileText } from 'lucide-react';
import { Profile, filterNonAdminProfiles } from '@/lib/types';
import { useProfiles } from '@/lib/hooks/useProfiles';
import TalkJSChat from '@/components/layout/TalkJSChat';

const MY_PROFILE_ID = '00000000-0000-0000-0000-000000000001';

interface MessagesViewProps {
  selectedProfile: Profile | null;
  onBack: () => void;
  onNotify: (msg: string) => void;
  isLoggedIn?: boolean;
  isPremium?: boolean;
  tokens?: number;
  onSpendToken?: () => boolean;
  onLoginRequest?: () => void;
}

const getTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

const QUICK_STARTERS = ['Dzień dobry!', 'Jak minął dzień?', 'Mam pytanie o zainteresowania'];

/* ─── Sub-components for clarity ─── */

function ConversationListItem({
  profile,
  isActive,
  onClick,
  lastMessage,
}: {
  profile: Profile;
  isActive: boolean;
  onClick: () => void;
  lastMessage?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-rose-50 ${
        isActive ? 'bg-rose-50 border-r-2 border-rose-500' : ''
      }`}
    >
      <div className="relative shrink-0">
        <img src={profile.image} alt={profile.name} className="w-11 h-11 rounded-full object-cover" />
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`font-semibold text-sm truncate ${isActive ? 'text-rose-600' : 'text-slate-800'}`}>
            {profile.name}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {lastMessage || 'Zacznij rozmowę...'}
        </p>
      </div>
    </button>
  );
}

export default function MessagesView({ selectedProfile, onBack, onNotify, isLoggedIn = false, isPremium = false, tokens = 0, onSpendToken, onLoginRequest }: MessagesViewProps) {
  const { profiles: allProfiles, loading: profilesLoading } = useProfiles();
  const visibleProfiles = useMemo(() => filterNonAdminProfiles(allProfiles), [allProfiles]);
  
  const [activeProfile, setActiveProfile] = useState<Profile | null>(selectedProfile);
  const [showChat, setShowChat] = useState(!!selectedProfile);

  /* ─── daily message limit ─── */
  const FREE_DAILY_LIMIT = 2;
  const DAILY_LIMIT = isPremium ? Number.POSITIVE_INFINITY : FREE_DAILY_LIMIT;
  const [messagedToday, setMessagedToday] = useState<string[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    if (!activeProfile && visibleProfiles.length > 0) {
      setActiveProfile(visibleProfiles[0]);
    }
  }, [visibleProfiles, activeProfile]);

  const handleReport = () => { onNotify(`Zgłoszono profil: ${activeProfile?.name}`); };
  const handleBlock = () => { onNotify(`Zablokowano użytkownika: ${activeProfile?.name}`); };
  const handleDelete = () => { onNotify('Rozmowa została usunięta'); };

  const selectConversation = (profile: Profile) => {
    setActiveProfile(profile);
    setShowChat(true);
  };

  if (profilesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Ładowanie rozmów...</p>
        </div>
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">Brak dostępnych rozmów</p>
        </div>
      </div>
    );
  }  

  return (
    <div
      className="flex bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
      style={{ height: 'calc(100vh - 130px)', minHeight: '520px' }}
    >
      {/* ── Sidebar – lista rozmów ── */}
      <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-slate-100 bg-white shrink-0`}>
        {/* Nagłówek */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-bold text-slate-800 text-base flex-1">Wiadomości</h2>
        </div>

        {/* Daily usage indicator */}
        {!isPremium && messagedToday.length > 0 && (
          <div className={`px-4 py-1.5 text-xs flex items-center justify-between border-b ${
            messagedToday.length >= DAILY_LIMIT
              ? 'bg-amber-50 border-amber-100 text-amber-700'
              : 'bg-slate-50 border-slate-100 text-slate-500'
          }`}>
            <span>Rozmowy dziś: <strong>{messagedToday.length}/{FREE_DAILY_LIMIT}</strong></span>
            {messagedToday.length >= DAILY_LIMIT && <span className="flex items-center gap-1"><Heart size={12} className="fill-amber-700" /> Wydaj Serduszko</span>}
          </div>
        )}

        {/* Szukaj */}
        <div className="px-4 py-2.5">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              placeholder="Szukaj rozmów…"
              className="bg-transparent text-sm outline-none flex-1 text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Konwersacje */}
        <div className="flex-1 overflow-y-auto">
          {visibleProfiles.map((profile) => {
            return (
              <ConversationListItem
                key={profile.id}
                profile={profile}
                isActive={activeProfile.id === profile.id}
                onClick={() => selectConversation(profile)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Obszar czatu ── */}
      <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0 relative`}>

        {/* \u2500\u2500\u2500 Limit modal \u2500\u2500\u2500 */}
        {!isPremium && showLimitModal && (
          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <FileText size={48} className="text-slate-400 mb-3" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Dzienny limit wiadomo\u015bci</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-4 max-w-xs">
              Mo\u017cesz napisa\u0107 do <strong>{FREE_DAILY_LIMIT} nowych rozm\u00f3wc\u00f3w dziennie</strong>.
              Wydaj 1 Serduszko, aby odblokowa\u0107 kolejn\u0105 rozmow\u0119.
            </p>
            {!isLoggedIn ? (
              <button
                onClick={() => { setShowLimitModal(false); onLoginRequest?.(); }}
                className="w-full max-w-xs py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl shadow-md hover:shadow-rose-200 transition-all flex items-center justify-center gap-2 mb-3"
              >
                <LogIn size={17} /> Zaloguj si\u0119, aby napisa\u0107 wi\u0119cej
              </button>
            ) : tokens > 0 ? (
              <>
                <p className="text-xs text-slate-400 mb-3 flex items-center justify-center gap-1">Masz: {tokens} <Heart size={14} className="fill-amber-500 text-amber-500" /> Serduszek</p>
                <button
                  onClick={() => {
                    const ok = onSpendToken?.() ?? false;
                    if (ok && activeProfile) {
                      setMessagedToday(prev => [...prev, activeProfile.id]);
                      setShowLimitModal(false);
                    }
                  }}
                  className="w-full max-w-xs py-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-white font-bold rounded-xl shadow-md hover:shadow-amber-200 transition-all flex items-center justify-center gap-2 mb-3"
                >
                  <Heart size={17} className="fill-white" /> Odblokuj rozmow\u0119 za 1 Serduszko
                </button>
              </>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-3 text-sm text-slate-600">
                Brak Serduszek. Wr\u00f3\u0107 jutro lub uzupe\u0142nij profil, aby zdob\u0107 wi\u0119cej.
              </div>
            )}
            <button
              onClick={() => setShowLimitModal(false)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Zamknij
            </button>
          </div>
        )}
        {/* Nagłówek czatu */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <button
            onClick={() => setShowChat(false)}
            className="md:hidden p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="relative shrink-0">
            <img
              src={activeProfile.image}
              alt={activeProfile.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm">{activeProfile.name}, {activeProfile.age} l.</h3>
            <div className="flex items-center gap-1 text-emerald-600 text-xs">
              <ShieldCheck size={11} />
              <span>Rozmowa chroniona · {activeProfile.city}</span>
            </div>
          </div>
          {/* Przyciski akcji – zawsze widoczne */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleReport}
              title="Zgłoś profil"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-amber-600 hover:bg-amber-50 transition-colors font-medium"
            >
              <Flag size={13} />
              <span className="hidden sm:inline">Zgłoś</span>
            </button>
            <button
              onClick={handleBlock}
              title="Zablokuj użytkownika"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-orange-600 hover:bg-orange-50 transition-colors font-medium"
            >
              <Ban size={13} />
              <span className="hidden sm:inline">Zablokuj</span>
            </button>
            <button
              onClick={handleDelete}
              title="Usuń rozmowę"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors font-medium"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Usuń</span>
            </button>
          </div>
        </div>

        {/* TalkJS Chat */}
        {activeProfile ? (
          <TalkJSChat
            currentUserId={MY_PROFILE_ID}
            otherUserId={activeProfile.id}
            otherUserName={activeProfile.name}
            otherUserImage={activeProfile.image}
          />
        ) : (
          <div className="flex-1 overflow-y-auto bg-[#FDFCF9] px-4 py-4 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Wybierz rozmowę aby zacząć czat</p>
          </div>
        )}
      </div>
    </div>
  );
}

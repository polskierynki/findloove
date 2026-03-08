'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Search, ShieldCheck, Flag, Ban, Trash2, LogIn, Heart, FileText, Bot, Send } from 'lucide-react';
import { Profile, filterNonAdminProfiles } from '@/lib/types';
import { useProfiles } from '@/lib/hooks/useProfiles';
import TalkJSChat from '@/components/layout/TalkJSChat';

const MY_PROFILE_ID = '00000000-0000-0000-0000-000000000001';
const ADVISOR_BOT_ID = 'advisor-bot-findloove';

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

const QUICK_STARTERS = [
  'Jaki mam stan doładowań?',
  'Jak zacząć pierwszą rozmowę?',
  'Jak odblokować więcej rozmów?',
];

const ADVISOR_BOT_PROFILE: Profile = {
  id: ADVISOR_BOT_ID,
  name: 'Doradca Findloove',
  age: 0,
  city: 'Online',
  bio: 'Pomagam z kontem, Serduszkami i rozpoczęciem rozmów.',
  interests: ['Wsparcie', 'Porady'],
  status: 'online',
  image: '/logo/logo.jpg',
  details: {
    occupation: 'Asystent konta',
    zodiac: '-',
    smoking: '-',
    children: '-',
  },
  isVerified: true,
};

type AdvisorMessage = {
  id: string;
  from: 'bot' | 'user';
  content: string;
  createdAt: string;
};

function createAdvisorMessage(from: 'bot' | 'user', content: string): AdvisorMessage {
  return {
    id: `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    content,
    createdAt: new Date().toISOString(),
  };
}

function buildAdvisorReply(question: string, opts: { tokens: number; isPremium: boolean }): string {
  const q = question.toLowerCase();

  if (
    q.includes('doład') ||
    q.includes('dolad') ||
    q.includes('serdusz') ||
    q.includes('token') ||
    q.includes('stan konta')
  ) {
    return `Masz teraz ${opts.tokens} Serduszek. ${
      opts.isPremium
        ? 'Masz też aktywne Premium, więc limity rozmów są szersze.'
        : 'Aby odblokować więcej możliwości, możesz skorzystać z opcji Premium lub zdobywać Serduszka aktywnością w profilu.'
    }`;
  }

  if (q.includes('jak') && (q.includes('zaczą') || q.includes('zaczac') || q.includes('pierwsz'))) {
    return 'Dobry start rozmowy: 1) Nawiąż do opisu lub zdjęcia rozmówcy, 2) Zadaj jedno konkretne pytanie, 3) Dodaj lekki, pozytywny ton. Przykład: "Widzę, że lubisz góry. Masz ulubiony szlak na weekend?"';
  }

  if (q.includes('odblok') || q.includes('więcej') || q.includes('wiecej') || q.includes('limit') || q.includes('premium')) {
    return 'Więcej rozmów odblokujesz przez pełniejsze uzupełnienie profilu i opcje Premium. Najpierw dodaj zdjęcie i opis, a następnie sprawdź sekcje z dodatkowymi możliwościami.';
  }

  return 'Jasne. Mogę pomóc w 3 obszarach: stan Serduszek/doładowań, rozpoczęcie pierwszej rozmowy i odblokowanie większej liczby czatów. Napisz, czego potrzebujesz.';
}

function AdvisorChatPanel({
  messages,
  input,
  onInputChange,
  onSend,
  tokens,
  isPremium,
}: {
  messages: AdvisorMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: (preset?: string) => void;
  tokens: number;
  isPremium: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col bg-[#FDFCF9]">
      <div className="px-4 py-3 border-b border-slate-100 bg-white">
        <p className="text-sm text-slate-700">
          <strong>Stan konta:</strong> {tokens} Serduszek • {isPremium ? 'Premium aktywne' : 'Konto standard'}
        </p>
      </div>

      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-2">
        {QUICK_STARTERS.map((starter) => (
          <button
            key={starter}
            onClick={() => onSend(starter)}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600 transition-colors"
          >
            {starter}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => {
          const isUser = message.from === 'user';
          return (
            <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                  isUser ? 'bg-rose-500 text-white' : 'bg-white border border-slate-100 text-slate-700'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                <p className={`text-[10px] mt-1 ${isUser ? 'text-rose-100' : 'text-slate-400'}`}>{getTime(message.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 bg-white px-3 py-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Napisz pytanie do doradcy..."
          className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
        />
        <button
          onClick={() => onSend()}
          className="h-10 px-3 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors inline-flex items-center gap-1.5"
          title="Wyślij"
        >
          <Send size={15} />
          <span className="text-sm font-semibold">Wyślij</span>
        </button>
      </div>
    </div>
  );
}

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
  const conversationProfiles = useMemo(
    () => [ADVISOR_BOT_PROFILE, ...visibleProfiles],
    [visibleProfiles],
  );

  const [activeProfile, setActiveProfile] = useState<Profile | null>(selectedProfile ?? ADVISOR_BOT_PROFILE);
  const [showChat, setShowChat] = useState(!!selectedProfile);
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>([
    createAdvisorMessage(
      'bot',
      'Cześć! Jestem doradcą Findloove. Mogę sprawdzić Twój stan Serduszek/doładowań i podpowiedzieć, jak zacząć rozmowę.',
    ),
  ]);

  /* ─── daily message limit ─── */
  const FREE_DAILY_LIMIT = 2;
  const DAILY_LIMIT = isPremium ? Number.POSITIVE_INFINITY : FREE_DAILY_LIMIT;
  const [messagedToday, setMessagedToday] = useState<string[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const isAdvisorChat = activeProfile?.id === ADVISOR_BOT_ID;

  useEffect(() => {
    if (!activeProfile && conversationProfiles.length > 0) {
      setActiveProfile(conversationProfiles[0]);
    }
  }, [conversationProfiles, activeProfile]);

  const handleReport = () => { onNotify(`Zgłoszono profil: ${activeProfile?.name}`); };
  const handleBlock = () => { onNotify(`Zablokowano użytkownika: ${activeProfile?.name}`); };
  const handleDelete = () => { onNotify('Rozmowa została usunięta'); };

  const sendAdvisorMessage = (preset?: string) => {
    const content = (preset ?? advisorInput).trim();
    if (!content) return;

    const userMessage = createAdvisorMessage('user', content);
    const botReply = createAdvisorMessage('bot', buildAdvisorReply(content, { tokens, isPremium }));

    setAdvisorMessages((prev) => [...prev, userMessage, botReply]);
    setAdvisorInput('');
  };

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
          {conversationProfiles.map((profile) => {
            const lastMessage = profile.id === ADVISOR_BOT_ID
              ? advisorMessages[advisorMessages.length - 1]?.content
              : undefined;

            return (
              <ConversationListItem
                key={profile.id}
                profile={profile}
                isActive={activeProfile.id === profile.id}
                onClick={() => selectConversation(profile)}
                lastMessage={lastMessage}
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
            <h3 className="font-semibold text-slate-800 text-sm">
              {isAdvisorChat ? activeProfile.name : `${activeProfile.name}, ${activeProfile.age} l.`}
            </h3>
            <div className="flex items-center gap-1 text-emerald-600 text-xs">
              {isAdvisorChat ? <Bot size={11} /> : <ShieldCheck size={11} />}
              <span>{isAdvisorChat ? 'Doradca konta i rozmów' : `Rozmowa chroniona · ${activeProfile.city}`}</span>
            </div>
          </div>
          {/* Przyciski akcji – wyłącznie dla zwykłych rozmów */}
          {!isAdvisorChat && (
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
          )}
        </div>

        {/* Obszar rozmowy */}
        {activeProfile ? (
          isAdvisorChat ? (
            <AdvisorChatPanel
              messages={advisorMessages}
              input={advisorInput}
              onInputChange={setAdvisorInput}
              onSend={sendAdvisorMessage}
              tokens={tokens}
              isPremium={isPremium}
            />
          ) : (
            <TalkJSChat
              currentUserId={MY_PROFILE_ID}
              otherUserId={activeProfile.id}
              otherUserName={activeProfile.name}
              otherUserImage={activeProfile.image}
            />
          )
        ) : (
          <div className="flex-1 overflow-y-auto bg-[#FDFCF9] px-4 py-4 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Wybierz rozmowę aby zacząć czat</p>
          </div>
        )}
      </div>
    </div>
  );
}

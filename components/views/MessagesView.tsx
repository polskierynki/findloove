'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import TalkJSChat from '@/components/layout/TalkJSChat';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

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

type TalkChatUser = {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
};

function toTalkUserFromProfile(profile: Profile): TalkChatUser {
  return {
    id: profile.id,
    name: profile.name || 'Uzytkownik',
    email: profile.email || null,
    photoUrl: profile.image_url || null,
  };
}

function buildFallbackName(user: Pick<SupabaseUser, 'email' | 'user_metadata'>): string {
  const normalizedEmail = user.email?.trim().toLowerCase() || '';
  return (
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
    'Uzytkownik'
  );
}

async function resolveCurrentTalkUser(user: SupabaseUser): Promise<TalkChatUser> {
  const normalizedEmail = user.email?.trim().toLowerCase() || null;
  const fallbackName = buildFallbackName(user);

  const { data: profileById, error: byIdError } = await supabase
    .from('profiles')
    .select('id, name, image_url, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!byIdError && profileById?.id) {
    return {
      id: profileById.id as string,
      name: (profileById as { name?: string | null }).name || fallbackName,
      email: (profileById as { email?: string | null }).email || normalizedEmail,
      photoUrl: (profileById as { image_url?: string | null }).image_url || null,
    };
  }

  if (normalizedEmail) {
    const { data: profileByEmail, error: byEmailError } = await supabase
      .from('profiles')
      .select('id, name, image_url, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!byEmailError && profileByEmail?.id) {
      return {
        id: profileByEmail.id as string,
        name: (profileByEmail as { name?: string | null }).name || fallbackName,
        email: (profileByEmail as { email?: string | null }).email || normalizedEmail,
        photoUrl: (profileByEmail as { image_url?: string | null }).image_url || null,
      };
    }
  }

  const { data: createdProfile } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: normalizedEmail,
        name: fallbackName,
        age: 30,
        city: 'Nieznane',
        bio: '',
        interests: [],
        image_url: '',
      },
      { onConflict: 'id' },
    )
    .select('id, name, image_url, email')
    .maybeSingle();

  if (createdProfile?.id) {
    return {
      id: createdProfile.id as string,
      name: (createdProfile as { name?: string | null }).name || fallbackName,
      email: (createdProfile as { email?: string | null }).email || normalizedEmail,
      photoUrl: (createdProfile as { image_url?: string | null }).image_url || null,
    };
  }

  return {
    id: user.id,
    name: fallbackName,
    email: normalizedEmail,
    photoUrl: null,
  };
}

export default function MessagesView({ selectedProfile, isLoggedIn = false, onLoginRequest }: MessagesViewProps) {
  const [currentUser, setCurrentUser] = useState<TalkChatUser | null>(null);
  const [targetFromUrl, setTargetFromUrl] = useState<TalkChatUser | null>(null);
  const [targetProfileIdFromUrl, setTargetProfileIdFromUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedTarget = useMemo(
    () => (selectedProfile ? toTalkUserFromProfile(selectedProfile) : null),
    [selectedProfile],
  );

  const targetUser = selectedTarget || targetFromUrl;

  // Read direct-chat target from URL (`/messages?user=<id>`).
  useEffect(() => {
    const readTarget = () => {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('user');
      setTargetProfileIdFromUrl(raw ? raw.trim() : null);
    };

    readTarget();
    window.addEventListener('popstate', readTarget);
    return () => window.removeEventListener('popstate', readTarget);
  }, []);

  useEffect(() => {
    let active = true;

    const syncCurrentUser = async () => {
      if (!isLoggedIn) {
        if (!active) return;
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        setCurrentUser(null);
        setLoading(false);
        setError('Nie mozna pobrac danych konta. Odswiez strone i sproboj ponownie.');
        return;
      }

      const resolved = await resolveCurrentTalkUser(user);

      if (!active) return;
      setCurrentUser(resolved);
      setLoading(false);
    };

    void syncCurrentUser();

    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    let active = true;

    const loadTargetFromUrl = async () => {
      if (!targetProfileIdFromUrl) {
        if (!active) return;
        setTargetFromUrl(null);
        return;
      }

      if (selectedProfile?.id === targetProfileIdFromUrl) {
        if (!active) return;
        setTargetFromUrl(null);
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, image_url, email')
        .eq('id', targetProfileIdFromUrl)
        .maybeSingle();

      if (!active) return;

      if (profileError || !data) {
        setTargetFromUrl({
          id: targetProfileIdFromUrl,
          name: 'Uzytkownik',
          email: null,
          photoUrl: null,
        });
        return;
      }

      setTargetFromUrl({
        id: data.id as string,
        name: (data as { name?: string | null }).name || 'Uzytkownik',
        email: (data as { email?: string | null }).email || null,
        photoUrl: (data as { image_url?: string | null }).image_url || null,
      });
    };

    void loadTargetFromUrl();

    return () => {
      active = false;
    };
  }, [selectedProfile?.id, targetProfileIdFromUrl]);

  if (!isLoggedIn) {
    return (
      <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center border border-white/10">
          <p className="text-white mb-5">Musisz byc zalogowany, aby korzystac z czatu.</p>
          <button
            onClick={() => onLoginRequest?.()}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-medium"
          >
            Przejdz do logowania
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center border border-white/10">
          <p className="text-cyan-300">Ladowanie czatu...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || error) {
    return (
      <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center border border-red-500/20">
          <p className="text-red-300">{error || 'Nie udalo sie uruchomic czatu.'}</p>
        </div>
      </div>
    );
  }

  const effectiveTargetUser = targetUser && targetUser.id !== currentUser.id ? targetUser : null;

  return (
    <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
      <div className="rounded-[2rem] w-full overflow-hidden border border-cyan-500/20 shadow-[0_0_45px_rgba(0,0,0,0.55),0_0_24px_rgba(0,255,255,0.08)] min-h-[70vh] flex flex-col bg-[linear-gradient(155deg,rgba(9,7,20,0.94)_0%,rgba(15,10,32,0.96)_55%,rgba(8,6,17,0.95)_100%)] backdrop-blur-2xl">
        <div className="h-16 border-b border-cyan-500/15 bg-black/25 px-6 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-300">
            Wiadomosci
          </h2>
          <p className="text-xs md:text-sm text-cyan-200/80">
            {effectiveTargetUser ? `Rozmowa z: ${effectiveTargetUser.name}` : 'Wszystkie rozmowy'}
          </p>
        </div>

        <TalkJSChat currentUser={currentUser} targetUser={effectiveTargetUser} />
      </div>
    </div>
  );
}

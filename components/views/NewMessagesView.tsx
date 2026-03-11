'use client';

import { useState, useEffect } from 'react';
import TalkJSChat from '@/components/layout/TalkJSChat';
import { supabase } from '@/lib/supabase';

type TalkUser = {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
};

async function resolveProfileIdForAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const normalizedEmail = user.email?.trim().toLowerCase() || null;

  // 1) Preferred mapping: profile row with the same id as auth user id.
  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!byIdError && byId?.id) {
    return byId.id as string;
  }

  // 2) Fallback mapping by email for legacy accounts migrated from older schema.
  if (normalizedEmail) {
    const { data: byEmail, error: byEmailError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!byEmailError && byEmail?.id) {
      return byEmail.id as string;
    }
  }

  // 3) Last resort: create a minimal profile row so FK on messages can pass.
  const fallbackName =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
    'Uzytkownik';

  const { data: created, error: createError } = await supabase
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
    .select('id')
    .maybeSingle();

  if (createError) {
    console.error('Nie udalo sie utworzyc/finalizowac profilu dla czatu:', createError.message);
    return null;
  }

  return (created?.id as string | undefined) || user.id;
}

export default function NewMessagesView() {
  const [currentUser, setCurrentUser] = useState<TalkUser | null>(null);
  const [targetProfileId, setTargetProfileId] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<TalkUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read direct-chat target from URL without coupling hydration to search params.
  useEffect(() => {
    const readTargetFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const rawTarget = params.get('user');
      setTargetProfileId(rawTarget ? rawTarget.trim() : null);
    };

    readTargetFromLocation();
    window.addEventListener('popstate', readTargetFromLocation);

    return () => {
      window.removeEventListener('popstate', readTargetFromLocation);
    };
  }, []);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError('Musisz być zalogowany, aby korzystać z czatu');
          setLoading(false);
          return;
        }

        const resolvedProfileId = await resolveProfileIdForAuthUser(user);
        if (!resolvedProfileId) {
          setError('Nie mozna uruchomic czatu, bo profil konta nie zostal poprawnie znaleziony.');
          setLoading(false);
          return;
        }

        const { data: myProfile } = await supabase
          .from('profiles')
          .select('name, email, image_url')
          .eq('id', resolvedProfileId)
          .maybeSingle();

        const fallbackName =
          (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
          (user.email ? user.email.split('@')[0] : '') ||
          'Uzytkownik';

        setCurrentUser({
          id: resolvedProfileId,
          name: (myProfile as { name?: string | null } | null)?.name || fallbackName,
          email: (myProfile as { email?: string | null } | null)?.email || user.email || null,
          photoUrl: (myProfile as { image_url?: string | null } | null)?.image_url || null,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error getting user:', err);
        setError('Błąd podczas ładowania profilu');
        setLoading(false);
      }
    };

    void getCurrentUser();
  }, []);

  // Load target profile info for opening direct conversation in TalkJS.
  useEffect(() => {
    if (!targetProfileId || !currentUser || targetProfileId === currentUser.id) {
      setTargetUser(null);
      return;
    }

    const loadTargetUser = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, image_url')
        .eq('id', targetProfileId)
        .maybeSingle();

      if (!data) {
        setTargetUser({
          id: targetProfileId,
          name: 'Uzytkownik',
          email: null,
          photoUrl: null,
        });
        return;
      }

      setTargetUser({
        id: data.id as string,
        name: (data as { name?: string | null }).name || 'Uzytkownik',
        email: (data as { email?: string | null }).email || null,
        photoUrl: (data as { image_url?: string | null }).image_url || null,
      });
    };

    void loadTargetUser();
  }, [currentUser, targetProfileId]);

  if (loading) {
    return (
      <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-cyan-500/40 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
          <p className="text-cyan-400">Ładowanie czatu...</p>
        </div>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center">
          <p className="text-white">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
      <div className="glass rounded-[2rem] w-full chat-height flex overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <TalkJSChat
          currentUser={currentUser}
          targetUser={targetUser}
        />
      </div>
    </div>
  );
}

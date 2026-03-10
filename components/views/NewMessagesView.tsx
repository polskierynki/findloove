'use client';

import { useState, useEffect } from 'react';
import TalkJSChat from '@/components/layout/TalkJSChat';
import { supabase } from '@/lib/supabase';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        setCurrentUserId(resolvedProfileId);
        setLoading(false);
      } catch (err) {
        console.error('Error getting user:', err);
        setError('Błąd podczas ładowania profilu');
        setLoading(false);
      }
    };

    void getCurrentUser();
  }, []);

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

  if (error || !currentUserId) {
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
          currentUserId={currentUserId}
          otherUserId=""
          otherUserName=""
        />
      </div>
    </div>
  );
}

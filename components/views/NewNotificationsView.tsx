'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Bell, Gift, Heart, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { resolveProfileIdForAuthUser } from '@/lib/profileAuth';
import { formatNotificationTime, useNotifications } from '@/lib/hooks/useNotifications';

type NotificationProfile = {
  role?: string | null;
  is_verified?: boolean | null;
  created_at?: string | null;
};

interface NewNotificationsViewProps {
  isAdmin?: boolean;
}

export default function NewNotificationsView({ isAdmin: isAdminFromApp = false }: NewNotificationsViewProps) {
  const router = useRouter();
  const adminEmail = 'lio1985lodz@gmail.com';
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<NotificationProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        setUserId(user?.id || null);
        setUserEmail(user?.email?.trim().toLowerCase() || null);

        if (user?.id) {
          const resolvedProfileId = await resolveProfileIdForAuthUser(user);
          setProfileId(resolvedProfileId);

          const { data } = await supabase
            .from('profiles')
            .select('role, is_verified, created_at')
            .eq('id', resolvedProfileId || user.id)
            .maybeSingle();

          setProfile((data as NotificationProfile | null) ?? null);
        } else {
          setProfileId(null);
          setProfile(null);
        }
      } finally {
        setAuthLoading(false);
      }
    };

    void loadUser();
  }, []);

  const isAdmin =
    isAdminFromApp ||
    userEmail === adminEmail ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin';

  const { notifications, loading, refresh } = useNotifications({
    userId,
    targetProfileIds: Array.from(new Set([userId, profileId].filter(Boolean))) as string[],
    isAdmin,
    profileIsVerified: Boolean(profile?.is_verified),
    profileCreatedAt: profile?.created_at ?? null,
  });

  const counters = useMemo(() => {
    return notifications.reduce(
      (acc, item) => {
        acc[item.kind] += 1;
        return acc;
      },
      {
        gift: 0,
        like: 0,
        poke: 0,
        verification: 0,
        comment: 0,
        message: 0,
      } as Record<'gift' | 'like' | 'poke' | 'verification' | 'comment' | 'message', number>,
    );
  }, [notifications]);

  if (authLoading) {
    return <div className="pt-28 text-center text-cyan-400">Ładowanie powiadomień...</div>;
  }

  if (!userId) {
    return (
      <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[1400px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center space-y-5 border border-white/10">
          <Bell size={48} className="mx-auto text-fuchsia-400" />
          <h1 className="text-3xl font-light text-white">Zaloguj się, aby zobaczyć powiadomienia</h1>
          <p className="text-white/70">Centrum powiadomień działa tylko dla zalogowanych użytkowników.</p>
          <button
            onClick={() => router.push('/auth')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-6 py-3 rounded-full text-white font-medium hover:from-fuchsia-500 hover:to-cyan-500 transition-all"
          >
            Przejdź do logowania
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[1600px] mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="glass rounded-full px-5 py-2 inline-flex items-center gap-2 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all font-medium border border-cyan-500/30"
          >
            <ArrowLeft size={18} /> Wróć
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-light text-white flex items-center gap-3">
              <Bell size={34} className="text-fuchsia-400" /> Centrum powiadomień
            </h1>
            <p className="text-cyan-300/70 mt-2">W jednym miejscu zobaczysz wiadomosci, polubienia, prezenty, zaczepienia, komentarze i status weryfikacji.</p>
          </div>
        </div>

        <button
          onClick={() => void refresh()}
          className="inline-flex items-center justify-center gap-2 glass rounded-full px-5 py-3 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
        >
          <RefreshCw size={16} /> Odśwież
        </button>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="glass rounded-2xl p-4 border border-cyan-500/20">
          <div className="text-xs uppercase tracking-wider text-cyan-300/70">Wiadomości</div>
          <div className="text-3xl text-white mt-2">{counters.message}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-red-500/20">
          <div className="text-xs uppercase tracking-wider text-red-300/70">Polubienia</div>
          <div className="text-3xl text-white mt-2">{counters.like}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-amber-500/20">
          <div className="text-xs uppercase tracking-wider text-amber-300/70">Prezenty</div>
          <div className="text-3xl text-white mt-2">{counters.gift}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-cyan-500/20">
          <div className="text-xs uppercase tracking-wider text-cyan-300/70">Zaczepki</div>
          <div className="text-3xl text-white mt-2">{counters.poke}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-blue-500/20">
          <div className="text-xs uppercase tracking-wider text-blue-300/70">Weryfikacja</div>
          <div className="text-3xl text-white mt-2">{counters.verification}</div>
        </div>
        <div className="glass rounded-2xl p-4 border border-white/10">
          <div className="text-xs uppercase tracking-wider text-white/60">Komentarze</div>
          <div className="text-3xl text-white mt-2">{counters.comment}</div>
        </div>
      </section>

      <section className="glass rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="p-5 border-b border-white/10 bg-black/20 flex items-center justify-between gap-4">
          <h2 className="text-white font-medium text-xl">Wszystkie powiadomienia</h2>
          <span className="text-sm text-cyan-300/70">{notifications.length} wpisów</span>
        </div>

        <div className="max-h-[900px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center text-cyan-300/80">Ładowanie powiadomień...</div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center text-white/60">Brak powiadomień.</div>
          ) : (
            notifications.map((notification, idx) => {
              const isLast = idx === notifications.length - 1;

              return (
                <div
                  key={notification.id}
                  onClick={() => router.push(notification.href)}
                  className={`p-5 ${isLast ? '' : 'border-b border-white/5'} hover:bg-white/5 transition-colors cursor-pointer flex gap-4 items-start`}
                >
                  {notification.kind === 'gift' && (
                    <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      <Gift size={20} className="text-amber-400" />
                    </div>
                  )}

                  {notification.kind === 'like' && (
                    <div className="w-11 h-11 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                      <Heart size={20} className="text-red-500 fill-red-500" />
                    </div>
                  )}

                  {notification.kind === 'verification' && (
                    <div className="w-11 h-11 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      <BadgeCheck size={20} className="text-blue-400" />
                    </div>
                  )}

                  {notification.kind === 'poke' && (
                    <div className="w-11 h-11 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                      <MessageCircle size={20} className="text-cyan-300" />
                    </div>
                  )}

                  {notification.kind === 'message' && (
                    <div className="w-11 h-11 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                      <MessageCircle size={20} className="text-cyan-300" />
                    </div>
                  )}

                  {notification.kind === 'comment' && notification.actorImageUrl && (
                    <img
                      src={notification.actorImageUrl}
                      className="w-11 h-11 rounded-full object-cover border border-white/10 shrink-0"
                      alt={notification.actorName || 'Komentarz'}
                    />
                  )}

                  {notification.kind === 'comment' && !notification.actorImageUrl && (
                    <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                      <MessageCircle size={18} className="text-cyan-300" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-white leading-relaxed">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">{formatNotificationTime(notification.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
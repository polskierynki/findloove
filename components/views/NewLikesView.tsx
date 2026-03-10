'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ChatCircle, Sparkle, MapPin, HeartBreak } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { LOOKING_FOR_OPTIONS } from './constants/profileFormOptions';

export default function NewLikesView() {
  const router = useRouter();
  const [likedProfiles, setLikedProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLikedProfiles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Get all likes from this user
        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select('to_profile_id')
          .eq('from_profile_id', user.id);

        if (likesError) throw likesError;

        if (!likes || likes.length === 0) {
          setLikedProfiles([]);
          setLoading(false);
          return;
        }

        const profileIds = likes.map((like) => like.to_profile_id);

        // Get all liked profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', profileIds);

        if (profilesError) throw profilesError;

        setLikedProfiles((profiles as Profile[]) || []);
      } catch (error) {
        console.error('Error loading liked profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLikedProfiles();
  }, []);

  const removeLike = async (profileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('likes')
        .delete()
        .eq('from_profile_id', user.id)
        .eq('to_profile_id', profileId);

      setLikedProfiles((prev) => prev.filter((p) => p.id !== profileId));
    } catch (error) {
      console.error('Error removing like:', error);
    }
  };

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto flex flex-col gap-8">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-light mb-2">
            Twoje <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-red-400 font-medium">ulubione</span>
          </h1>
          <p className="text-pink-400/70 font-light text-lg">
            {loading ? 'Ładowanie...' : `Polubiłeś ${likedProfiles.length} ${likedProfiles.length === 1 ? 'osobę' : likedProfiles.length < 5 ? 'osoby' : 'osób'}`}
          </p>
        </div>
      </section>

      {/* Liked Profile Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8 mt-8">
        {loading ? (
          <div className="col-span-full text-center text-cyan-400">Ładowanie...</div>
        ) : likedProfiles.length === 0 ? (
          <div className="col-span-full glass rounded-[2rem] p-12 text-center space-y-6">
            <HeartBreak className="mx-auto text-pink-400/50" size={64} weight="duotone" />
            <div>
              <h2 className="text-2xl font-light text-white mb-2">Brak polubionych profili</h2>
              <p className="text-cyan-400/70">Zacznij przeglądać profile i klikaj serduszko, aby dodać je do ulubionych!</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(0,255,255,0.3)] px-8 py-3 rounded-xl text-white transition-all"
            >
              Przejdź do głównej
            </button>
          </div>
        ) : (
          likedProfiles.map((profile, idx) => {
            const matchScore = [98, 95, 87, 92, 88, 91][idx % 6];

            return (
              <div
                key={profile.id}
                onClick={() => router.push(`/profile/${profile.id}`)}
                className="profile-card glass rounded-[2rem] overflow-hidden relative group cursor-pointer"
              >
                <div className="aspect-[3/4] w-full relative">
                  <img
                    src={
                      profile.image_url ||
                      `https://images.unsplash.com/photo-${1515372039744 + idx}?ixlib=rb-4.0.3&w=800&q=80`
                    }
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07050f] via-[#07050f]/40 to-transparent"></div>

                  {/* Match Badge */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-fuchsia-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,0,255,0.2)]">
                      <Sparkle className="text-fuchsia-400" size={14} weight="fill" />
                      <span className="text-xs font-semibold text-white">{matchScore}% Match</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.details?.looking_for && (
                        <div className={`bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                          profile.details.looking_for === 'miłość' 
                            ? 'border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.2)]'
                            : profile.details.looking_for === 'przygoda'
                            ? 'border-cyan-500/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                            : 'border-cyan-500/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                        }`}>
                          <span className="text-xs font-semibold text-white">
                            {LOOKING_FOR_OPTIONS.find(opt => opt.value === profile.details.looking_for)?.emoji} {LOOKING_FOR_OPTIONS.find(opt => opt.value === profile.details.looking_for)?.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Info - Always visible, slides up on hover */}
                  <div className="absolute bottom-0 left-0 w-full pb-3 px-5 pt-2 z-10 transform transition-transform duration-300 ease-out group-hover:-translate-y-12">
                    <div className="card-meta flex flex-col gap-2.5 relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-3xl font-medium text-white">
                            {profile.name || 'User'},{' '}
                            {typeof profile.age === 'number' ? `${profile.age} lat` : '? lat'}
                          </h2>
                        </div>
                        <div className="flex items-center gap-1.5 text-cyan-300/70 text-sm font-light">
                          <MapPin size={14} weight="fill" className="text-cyan-400" />
                          <span>{profile.city || 'Bliżej nieokreślone'}</span>
                        </div>
                      </div>

                      {/* Action Buttons - Hidden by default, visible on hover */}
                      <div className="card-actions flex gap-3 relative z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLike(profile.id);
                          }}
                          className="pointer-events-auto flex-1 bg-white/10 hover:bg-red-500/20 backdrop-blur-md border border-white/20 py-2.5 rounded-xl flex items-center justify-center gap-2 text-white transition-all hover:border-red-400/50 hover:text-red-400 group/btn"
                        >
                          <Heart
                            size={20}
                            weight="fill"
                            className="text-red-400 group-hover/btn:scale-110 transition-transform"
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push('/messages');
                          }}
                          className="pointer-events-auto flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(0,255,255,0.3)] py-2.5 rounded-xl flex items-center justify-center gap-2 text-white transition-all"
                        >
                          <ChatCircle size={20} weight="fill" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

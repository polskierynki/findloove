'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ChatCircle, Sparkle, MapPin } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { LOOKING_FOR_OPTIONS } from './constants/profileFormOptions';

export default function NewHomeView() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(20)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProfiles((data as Profile[]) || []);
      } catch (error) {
        console.error('Error loading profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const toggleLike = (profileId: string) => {
    setLikedProfiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto flex flex-col gap-8">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-light mb-2">
            Odkrywaj <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400 font-medium">nowe znajomości</span>
          </h1>
          <p className="text-cyan-400/70 font-light text-lg">
            Znaleźliśmy {profiles.length} osób w Twojej okolicy, które pasują do Twoich preferencji.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="px-5 py-2.5 rounded-full glass border-cyan-500/30 bg-cyan-500/10 text-sm font-medium transition-all shadow-[inset_0_0_15px_rgba(0,255,255,0.1)] text-cyan-300 hover:bg-cyan-500/20">
            <Sparkle className="inline-block mr-1.5 text-cyan-400" size={16} weight="fill" /> Rekomendowani
          </button>
          <button className="px-5 py-2.5 rounded-full glass border-cyan-500/30 text-sm font-light text-cyan-300/70 transition-all hover:bg-cyan-500/10 hover:border-cyan-500/50">
            W pobliżu
          </button>
          <button className="px-5 py-2.5 rounded-full glass border-cyan-500/30 text-sm font-light text-cyan-300/70 transition-all hover:bg-cyan-500/10 hover:border-cyan-500/50">
            Aktywni
          </button>
        </div>
      </section>

      {/* Profile Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8 mt-8">
        {loading ? (
          <div className="col-span-full text-center text-cyan-400">Ładowanie profili...</div>
        ) : (
          profiles.slice(0, 12).map((profile, idx) => {
            const isLiked = likedProfiles.has(profile.id);
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
                      {idx === 0 && (
                        <div className="w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)] border-2 border-black"></div>
                      )}
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="absolute bottom-0 left-0 w-full p-6 z-10">
                    <div className="card-meta flex flex-col gap-2">
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

                      {/* Action Buttons */}
                      <div className="card-actions flex gap-3 mt-3 relative z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(profile.id);
                          }}
                          className="pointer-events-auto flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 py-2.5 rounded-xl flex items-center justify-center gap-2 text-white transition-all hover:border-red-400/50 hover:text-red-400 group/btn"
                        >
                          <Heart
                            size={20}
                            weight={isLiked ? 'fill' : 'regular'}
                            className={`${
                              isLiked ? 'text-red-400' : ''
                            } group-hover/btn:scale-110 transition-transform`}
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

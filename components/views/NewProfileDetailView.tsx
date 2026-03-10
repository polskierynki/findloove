'use client';

import { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  Gift, 
  PaperPlaneTilt,
  ChatCircle,
  Sparkle,
  Images,
  ChatText,
  MapPin,
  SealCheck,
  Briefcase,
  Star,
  Cigarette,
  Wine,
  PawPrint,
  GenderIntersex,
  HeartStraight
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { useLikes } from '@/lib/hooks/useLikes';
import { ALL_INTERESTS } from './constants/profileFormOptions';

interface Comment {
  id: string;
  content: string;
  author_profile_id: string;
  author: { name: string; image: string; city: string };
  created_at: string;
  like_count: number;
}

export default function NewProfileDetailView({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { likeProfile, unlikeProfile, hasLikedProfile } = useLikes();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        setProfile(data as Profile);

        // Load comments
        const { data: commentsData } = await supabase
          .from('profile_comments')
          .select(`
            id,
            content,
            author_profile_id,
            created_at,
            profiles!author_profile_id (name, image, city)
          `)
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false });

        setComments((commentsData || []).map((c: any) => ({
          id: c.id,
          content: c.content,
          author_profile_id: c.author_profile_id,
          author: c.profiles || { name: 'User', image: '', city: '' },
          created_at: c.created_at,
          like_count: 2,
        })));

        const liked = await hasLikedProfile(profileId);
        setIsLiked(liked);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [profileId]);

  if (loading) {
    return <div className="pt-28 text-center text-cyan-400">Ładowanie profilu...</div>;
  }

  if (!profile) {
    return <div className="pt-28 text-center text-cyan-400">Profil nie znaleziony</div>;
  }

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto">
      {/* SVG Gradient Definition for Circular Progress */}
      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="magenta-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff00ff" />
            <stop offset="100%" stopColor="#00ffff" />
          </linearGradient>
        </defs>
      </svg>

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="glass rounded-full px-5 py-2 inline-flex items-center gap-2 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all font-medium mb-8 border border-cyan-500/30"
      >
        <ArrowLeft size={20} /> Wróć do odkrywania
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Left Column: Compatibility, Gallery & Comments */}
        <aside className="lg:col-span-5 flex flex-col gap-8">
          {/* Compatibility Widget */}
          <div className="glass rounded-[2rem] p-6 flex items-center gap-5 relative overflow-hidden border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-colors">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-white/80"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="circle-chart__circle"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="url(#magenta-cyan)"
                  strokeWidth="3"
                  strokeDasharray="95, 100"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-lg font-bold text-white leading-none">
                  95<span className="text-[10px] text-fuchsia-400">%</span>
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium text-lg leading-tight">Idealny match</h4>
              <p className="text-xs text-cyan-400 font-light mt-1 flex items-center gap-1">
                <Sparkle size={12} weight="fill" className="text-cyan-400" /> 12 wspólnych cech
              </p>
            </div>
          </div>

          {/* Gallery */}
          <div className="glass rounded-[2rem] p-6">
            <h3 className="text-base font-medium text-cyan-300/70 tracking-wider uppercase flex items-center gap-2 mb-5">
              <Images size={20} weight="duotone" className="text-cyan-400" /> Galeria
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {profile.photos?.slice(0, 6).map((photo, i) => (
                <div key={i} className={`gallery-item aspect-square rounded-2xl cursor-pointer ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                  <img src={photo} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                </div>
              )) || (
                <>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`gallery-item aspect-square rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/10 ${i === 0 ? 'col-span-2 row-span-2' : ''}`} />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Comments/Tablica */}
          <div className="glass rounded-[2rem] p-6 lg:p-8 flex flex-col relative overflow-hidden bg-[#0a0710]/80 max-h-[500px]">
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-cyan-500/20 shrink-0">
              <h3 className="text-base font-medium text-cyan-300/70 tracking-wider uppercase flex items-center gap-2">
                <ChatCircle size={20} weight="duotone" className="text-cyan-400" /> Tablica <span className="bg-white/10 text-sm px-3 py-1 rounded-full ml-1 text-white">{comments.length}</span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-5">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <img
                    src={comment.author.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
                    alt={comment.author.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white mr-2">{comment.author.name}</span>
                    <span className="text-xs text-cyan-500/60">2 godz. temu</span>
                    <p className="text-[14px] text-cyan-300/70 mt-1 font-light leading-snug">{comment.content}</p>
                    <div className="mt-1.5 flex gap-4">
                      <button className="text-xs text-cyan-500/60 font-medium hover:text-cyan-300 transition-colors">Odpowiedz</button>
                      <button className="text-xs text-cyan-500/60 hover:text-red-400 transition-colors flex items-center gap-1">
                        <Heart size={12} /> {comment.like_count}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="pt-5 mt-4 shrink-0 border-t border-cyan-500/20">
              <div className="relative group border-glow-cyan rounded-full transition-all">
                <input
                  type="text"
                  placeholder="Dodaj komentarz..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-black/40 border border-cyan-500/20 rounded-full py-3.5 pl-6 pr-14 text-base text-white placeholder-cyan-400/40 outline-none backdrop-blur-md transition-all focus:bg-black/60 focus:border-cyan-500/50 shadow-[inset_0_0_10px_rgba(0,255,255,0.05)]"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-cyan-300 transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.6)]">
                  <PaperPlaneTilt size={18} weight="fill" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Main Photo, Dock, Bio */}
        <section className="lg:col-span-7 flex flex-col gap-8 relative">
          {/* Main Photo */}
          <div className="relative w-full aspect-[3/4] md:aspect-[4/5] rounded-[3rem] p-1 bg-gradient-to-br from-cyan-500/40 via-white/5 to-fuchsia-500/40 double-glow z-10 group overflow-hidden">
            <img
              src={profile.image_url || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1400&q=80'}
              alt={profile.name}
              className="w-full h-full object-cover rounded-[2.8rem] shadow-inner relative z-10 transform transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07050f] via-transparent to-transparent rounded-[3rem] z-20 pointer-events-none opacity-90 transition-opacity group-hover:opacity-70"></div>

            {/* Float Tags */}
            <div className="absolute top-8 right-8 z-30 flex flex-col gap-3 items-end">
              <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-green-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-xs font-medium text-white tracking-wide">Aktywna teraz</span>
              </div>
              {profile.isVerified && (
                <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-cyan-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                  <SealCheck size={16} weight="fill" className="text-cyan-400" />
                  <span className="text-xs font-medium text-white tracking-wide">Tożsamość zweryfikowana</span>
                </div>
              )}
            </div>

            {/* Profile Info at Bottom */}
            <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-30">
              <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white flex items-baseline gap-4 mb-2 drop-shadow-2xl">
                {profile.name} 
                {profile.isVerified && (
                  <SealCheck size={40} weight="fill" className="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
                )}
                <span className="text-3xl md:text-5xl text-white font-extralight opacity-80">• {profile.age}</span>
              </h1>
              <p className="text-xl text-cyan-300 font-light mb-6 drop-shadow-lg flex items-center gap-2">
                <Briefcase size={20} weight="duotone" className="text-cyan-400" /> {profile.details?.occupation || 'Brak informacji'} <MapPin size={18} weight="duotone" className="text-fuchsia-400" /> {profile.city}
              </p>

              {/* Info Pills */}
              <div className="flex flex-wrap gap-3">
                {profile.details?.zodiac && (
                  <span className="glass px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 border-white/20 backdrop-blur-lg">
                    <Star size={16} weight="fill" className="text-yellow-400" /> {profile.details.zodiac}
                  </span>
                )}
                {profile.details?.smoking && (
                  <span className="glass px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 border-white/20 backdrop-blur-lg">
                    <Cigarette size={16} weight="duotone" className="text-gray-400" /> {profile.details.smoking === 'nie' ? 'Nie pali' : 'Pali'}
                  </span>
                )}
                {profile.details?.drinking && (
                  <span className="glass px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 border-white/20 backdrop-blur-lg">
                    <Wine size={16} weight="duotone" className="text-purple-400" /> {profile.details.drinking}
                  </span>
                )}
                {profile.details?.pets && (
                  <span className="glass px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 border-white/20 backdrop-blur-lg">
                    <PawPrint size={16} weight="fill" className="text-amber-400" /> {profile.details.pets}
                  </span>
                )}
                {profile.details?.sexual_orientation && (
                  <span className="glass px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 border-white/20 backdrop-blur-lg">
                    <GenderIntersex size={16} weight="duotone" className="text-purple-400" /> {profile.details.sexual_orientation}
                  </span>
                )}
                {profile.details?.looking_for && (
                  <span className={`glass px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 backdrop-blur-lg ${
                    profile.details.looking_for === 'miłość'
                      ? 'border-pink-500/50 bg-pink-500/10'
                      : profile.details.looking_for === 'przygoda'
                      ? 'border-cyan-500/50 bg-cyan-500/10'
                      : profile.details.looking_for === 'przyjaźń'
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-white/20'
                  }`}>
                    <HeartStraight size={16} weight="fill" className={`${
                      profile.details.looking_for === 'miłość' ? 'text-pink-400' :
                      profile.details.looking_for === 'przygoda' ? 'text-cyan-400' :
                      profile.details.looking_for === 'przyjaźń' ? 'text-blue-400' : 'text-gray-400'
                    }`} />
                    {profile.details.looking_for === 'miłość' ? 'Szukam miłości' : 
                           profile.details.looking_for === 'przygoda' ? 'Szukam przygody' :
                           profile.details.looking_for === 'przyjaźń' ? 'Szukam przyjaźni' : 'Jeszcze nie wiem'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Interaction Dock */}
          <div className="glass-panel mx-auto w-full max-w-lg px-6 py-2 rounded-full flex justify-between items-center border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(255,255,255,0.05)] relative -mt-12 z-40 backdrop-blur-xl">
            <button
              onClick={async () => {
                const nextLikedState = !isLiked;
                setIsLiked(nextLikedState);

                try {
                  if (nextLikedState) {
                    await likeProfile(profileId);
                  } else {
                    await unlikeProfile(profileId);
                  }
                } catch (error) {
                  console.error('Blad aktualizacji polubienia profilu:', error);
                  setIsLiked(!nextLikedState);
                }
              }}
              className="cta-dock-btn flex flex-col items-center justify-center gap-1 p-2 group w-16"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-red-500/20 group-hover:border-red-500/50 transition-all shadow-inner">
                <Heart
                  size={20}
                  className={`${isLiked ? 'fill-red-500 text-red-500' : 'text-cyan-400'} group-hover:text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0)] group-hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.8)] transition-all`}
                />
              </div>
              <span className="text-[10px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1">
                Polub
              </span>
            </button>

            <button className="cta-dock-btn flex flex-col items-center justify-center gap-1 p-2 group w-16">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:border-amber-500/50 transition-all shadow-inner">
                <Gift size={20} className="text-cyan-400 group-hover:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0)] group-hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] transition-all" />
              </div>
              <span className="text-[10px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1">
                Prezent
              </span>
            </button>

            {/* Main CTA Button */}
            <button
              onClick={() => router.push(`/messages?user=${encodeURIComponent(profileId)}`)}
              className="cta-dock-btn flex flex-col items-center justify-center group relative z-50 -mt-14 w-20"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 p-[2px] shadow-[0_10px_30px_rgba(0,255,255,0.4)] group-hover:shadow-[0_10px_40px_rgba(0,255,255,0.6)] transition-all transform group-hover:-translate-y-2">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center border-2 border-[#110a22]">
                  <PaperPlaneTilt size={30} weight="fill" className="text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider text-glow-cyan absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity">
                Napisz
              </span>
            </button>

            <button className="cta-dock-btn flex flex-col items-center justify-center gap-1 p-2 group w-16">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all shadow-inner">
                <ChatText size={20} weight="fill" className="text-cyan-400 group-hover:text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0)] group-hover:drop-shadow-[0_0_12px_rgba(0,255,255,0.8)] transition-all" />
              </div>
              <span className="text-[10px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1">
                Komentuj
              </span>
            </button>
          </div>

          {/* Bio Card */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden">
            <h2 className="text-2xl font-light text-white mb-6 flex items-center gap-3">
              O mnie <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
            </h2>

            <div className="border-l-2 border-cyan-400/50 pl-5 mb-8">
              <p className="text-lg leading-relaxed text-white font-light drop-shadow-sm">{profile.bio}</p>
            </div>

            <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-widest mb-4">Moje zajawki</h3>

            <div className="flex flex-wrap gap-3">
              {profile.interests?.map((interest) => {
                const interestData = ALL_INTERESTS.find((i) => i.value === interest);
                const IconComponent = interestData?.icon;
                const iconColor = interestData?.color || 'text-fuchsia-400';
                return (
                  <span
                    key={interest}
                    className="px-5 py-2.5 rounded-full border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/10 to-transparent backdrop-blur-md shadow-[0_0_15px_rgba(255,0,255,0.05)] hover:shadow-[0_0_20px_rgba(255,0,255,0.2)] hover:border-fuchsia-400 transition-all cursor-default text-sm tracking-wide text-white flex items-center gap-2"
                  >
                    {IconComponent
                      ? <IconComponent size={16} weight="duotone" className={iconColor} />
                      : <Sparkle size={16} weight="fill" className="text-fuchsia-400" />}
                    {interest}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Received Gifts Widget */}
          <div className="glass rounded-[2rem] p-6 relative overflow-hidden">
            <h3 className="text-base font-medium text-cyan-300/70 tracking-wider uppercase flex items-center gap-2 mb-5">
              <Gift size={20} weight="duotone" className="text-amber-400" /> Otrzymane prezenty
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { emoji: '🌹', from: 'Michał', value: 50 },
                { emoji: '💍', from: 'Tomasz', value: 1000 },
                { emoji: '🧸', from: 'Kasia', value: 300 },
                { emoji: '💎', from: 'Anna', value: 5000 },
              ].map((gift, i) => (
                <div
                  key={i}
                  className="relative group glass rounded-2xl aspect-square flex items-center justify-center text-4xl cursor-pointer hover:scale-105 transition-transform border border-white/5 hover:border-amber-500/30"
                >
                  <span>{gift.emoji}</span>
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 bg-black/90 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-white whitespace-nowrap border border-amber-500/20">
                    <div className="font-medium">{gift.from}</div>
                    <div className="text-amber-400 text-[10px]">{gift.value} monet</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Gift,
  PaperPlaneTilt,
  ChatCircle,
  Sparkle,
  Images,
  MapPin,
  SealCheck,
  Briefcase,
  Star,
  Cigarette,
  Wine,
  PawPrint,
  GenderIntersex,
  HeartStraight,
  Quotes,
  X,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { useLikes } from '@/lib/hooks/useLikes';
import { ALL_INTERESTS } from './constants/profileFormOptions';

type AppComment = {
  id: string;
  content: string;
  author_profile_id: string;
  author: { name: string; image: string; city: string };
  created_at: string;
};

type AuthLikeUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

function formatRelativeTime(timestamp: string): string {
  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) return 'Przed chwila';

  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Teraz';
  if (diffMin < 60) return `${diffMin} min temu`;
  if (diffHour < 24) return `${diffHour} godz. temu`;
  if (diffDay === 1) return 'Wczoraj';
  if (diffDay < 7) return `${diffDay} dni temu`;

  return new Date(ts).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
  });
}

async function resolveProfileIdForAuthUser(user: AuthLikeUser): Promise<string | null> {
  const normalizedEmail = user.email?.trim().toLowerCase() || null;

  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!byIdError && byId?.id) {
    return byId.id as string;
  }

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
    console.error('Nie udalo sie utworzyc/finalizowac profilu dla komentarzy:', createError.message);
    return null;
  }

  return (created?.id as string | undefined) || user.id;
}

export default function NewProfileDetailView({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { likeProfile, unlikeProfile, hasLikedProfile } = useLikes();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comments, setComments] = useState<AppComment[]>([]);
  const [photoComments, setPhotoComments] = useState<AppComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [photoCommentText, setPhotoCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingPhotoComment, setIsSubmittingPhotoComment] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [photoCommentsLoading, setPhotoCommentsLoading] = useState(false);
  const [photoCommentsTableAvailable, setPhotoCommentsTableAvailable] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const generalCommentInputRef = useRef<HTMLInputElement>(null);
  const photoCommentInputRef = useRef<HTMLInputElement>(null);

  const allPhotos = useMemo(() => {
    if (!profile) return [];
    const photos = [
      profile.image_url,
      ...(profile.photos || []),
    ].filter((item): item is string => Boolean(item && item.trim()));

    return Array.from(new Set(photos));
  }, [profile]);

  const loadGeneralComments = useCallback(async () => {
    const { data: commentsData, error: commentsError } = await supabase
      .from('profile_comments')
      .select(`
        id,
        content,
        author_profile_id,
        created_at,
        profiles!author_profile_id (name, image_url, city)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Blad ladowania komentarzy profilu:', commentsError.message);
      setComments([]);
      return;
    }

    setComments(
      (commentsData || []).map((entry: any) => ({
        id: entry.id,
        content: entry.content,
        author_profile_id: entry.author_profile_id,
        author: {
          name: entry.profiles?.name || 'User',
          image: entry.profiles?.image_url || '',
          city: entry.profiles?.city || '',
        },
        created_at: entry.created_at,
      })),
    );
  }, [profileId]);

  const loadPhotoComments = useCallback(async (photoIndex: number) => {
    setPhotoCommentsLoading(true);

    try {
      const { data, error } = await supabase
        .from('profile_photo_comments')
        .select('id, content, author_profile_id, created_at')
        .eq('profile_id', profileId)
        .eq('photo_index', photoIndex)
        .order('created_at', { ascending: false });

      if (error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('profile_photo_comments')) {
          setPhotoCommentsTableAvailable(false);
          setPhotoComments([]);
          return;
        }
        throw error;
      }

      setPhotoCommentsTableAvailable(true);

      const rows = (data || []) as Array<{
        id: string;
        content: string;
        author_profile_id: string;
        created_at: string;
      }>;

      const authorIds = Array.from(new Set(rows.map((row) => row.author_profile_id).filter(Boolean)));
      let authorMap = new Map<string, { name?: string | null; image_url?: string | null; city?: string | null }>();

      if (authorIds.length > 0) {
        const { data: authors, error: authorError } = await supabase
          .from('profiles')
          .select('id, name, image_url, city')
          .in('id', authorIds);

        if (authorError) {
          console.error('Blad ladowania autorow komentarzy zdjec:', authorError.message);
        } else {
          authorMap = new Map(
            (authors || []).map((author) => [
              author.id as string,
              {
                name: (author as { name?: string | null }).name,
                image_url: (author as { image_url?: string | null }).image_url,
                city: (author as { city?: string | null }).city,
              },
            ]),
          );
        }
      }

      setPhotoComments(
        rows.map((row) => {
          const author = authorMap.get(row.author_profile_id);
          return {
            id: row.id,
            content: row.content,
            author_profile_id: row.author_profile_id,
            author: {
              name: author?.name || 'User',
              image: author?.image_url || '',
              city: author?.city || '',
            },
            created_at: row.created_at,
          };
        }),
      );
    } catch (error) {
      console.error('Blad ladowania komentarzy do zdjecia:', error);
      setPhotoComments([]);
    } finally {
      setPhotoCommentsLoading(false);
    }
  }, [profileId]);

  const resolveCurrentAuthorProfileId = useCallback(async () => {
    if (authorProfileId) return authorProfileId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const resolved = await resolveProfileIdForAuthUser({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    if (resolved) {
      setAuthorProfileId(resolved);
    }

    return resolved;
  }, [authorProfileId]);

  const handleAddGeneralComment = useCallback(async () => {
    const content = commentText.trim();
    if (!content || isSubmittingComment) return;

    setCommentsError(null);
    setIsSubmittingComment(true);

    try {
      const senderProfileId = await resolveCurrentAuthorProfileId();
      if (!senderProfileId) {
        setCommentsError('Zaloguj sie, aby dodawac komentarze.');
        return;
      }

      const { error } = await supabase
        .from('profile_comments')
        .insert({
          profile_id: profileId,
          author_profile_id: senderProfileId,
          content,
        });

      if (error) {
        throw error;
      }

      setCommentText('');
      await loadGeneralComments();
    } catch (error) {
      console.error('Blad dodawania komentarza ogolnego:', error);
      const message =
        (error as { message?: string; code?: string } | null)?.message ||
        (error as { code?: string } | null)?.code ||
        'Nieznany blad';
      setCommentsError(`Nie udalo sie dodac komentarza: ${message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentText, isSubmittingComment, loadGeneralComments, profileId, resolveCurrentAuthorProfileId]);

  const handleAddPhotoComment = useCallback(async () => {
    const content = photoCommentText.trim();
    if (!content || isSubmittingPhotoComment || !photoCommentsTableAvailable) return;

    setCommentsError(null);
    setIsSubmittingPhotoComment(true);

    try {
      const senderProfileId = await resolveCurrentAuthorProfileId();
      if (!senderProfileId) {
        setCommentsError('Zaloguj sie, aby dodawac komentarze do zdjec.');
        return;
      }

      const { error } = await supabase
        .from('profile_photo_comments')
        .insert({
          profile_id: profileId,
          photo_index: activePhotoIndex,
          author_profile_id: senderProfileId,
          content,
        });

      if (error) {
        throw error;
      }

      setPhotoCommentText('');
      await loadPhotoComments(activePhotoIndex);
      photoCommentInputRef.current?.focus();
    } catch (error) {
      console.error('Blad dodawania komentarza do zdjecia:', error);
      const message =
        (error as { message?: string; code?: string } | null)?.message ||
        (error as { code?: string } | null)?.code ||
        'Nieznany blad';
      setCommentsError(`Nie udalo sie dodac komentarza do zdjecia: ${message}`);
    } finally {
      setIsSubmittingPhotoComment(false);
    }
  }, [
    activePhotoIndex,
    isSubmittingPhotoComment,
    loadPhotoComments,
    photoCommentText,
    photoCommentsTableAvailable,
    profileId,
    resolveCurrentAuthorProfileId,
  ]);

  const openPhotoCommentModal = useCallback((photoIndex: number) => {
    setActivePhotoIndex(photoIndex);
    setIsPhotoModalOpen(true);
    setPhotoCommentText('');
    setCommentsError(null);
  }, []);

  const goToPhoto = useCallback((direction: 'prev' | 'next') => {
    if (allPhotos.length < 2) return;
    setActivePhotoIndex((prev) => {
      if (direction === 'prev') {
        return (prev - 1 + allPhotos.length) % allPhotos.length;
      }
      return (prev + 1) % allPhotos.length;
    });
  }, [allPhotos.length]);

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

        await loadGeneralComments();

        const liked = await hasLikedProfile(profileId);
        setIsLiked(liked);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [hasLikedProfile, loadGeneralComments, profileId]);

  useEffect(() => {
    if (!isPhotoModalOpen) return;
    if (activePhotoIndex >= allPhotos.length && allPhotos.length > 0) {
      setActivePhotoIndex(0);
      return;
    }

    void loadPhotoComments(activePhotoIndex);
  }, [activePhotoIndex, allPhotos.length, isPhotoModalOpen, loadPhotoComments]);

  useEffect(() => {
    if (!isPhotoModalOpen) return;

    const focusTimer = window.setTimeout(() => {
      photoCommentInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(focusTimer);
  }, [activePhotoIndex, isPhotoModalOpen]);

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
              {allPhotos.length > 0 ? allPhotos.slice(0, 6).map((photo, i) => (
                <button
                  key={`${photo}-${i}`}
                  onClick={() => openPhotoCommentModal(i)}
                  className={`gallery-item relative aspect-square rounded-2xl cursor-pointer overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                >
                  <img src={photo} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                  <span className="absolute right-2 bottom-2 w-7 h-7 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-cyan-300">
                    <Quotes size={14} weight="fill" />
                  </span>
                </button>
              )) : (
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
              <button
                onClick={() => generalCommentInputRef.current?.focus()}
                className="text-base font-medium text-cyan-300/70 tracking-wider uppercase flex items-center gap-2 hover:text-cyan-300 transition-colors"
              >
                <Quotes size={20} weight="fill" className="text-cyan-400" /> Tablica
                <span className="bg-white/10 text-sm px-3 py-1 rounded-full ml-1 text-white">{comments.length}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-5">
              {comments.length === 0 ? (
                <div className="text-center text-sm text-cyan-400/70 pt-6">
                  Brak komentarzy. Napisz pierwszy cytat na tablicy.
                </div>
              ) : comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <img
                    src={comment.author.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
                    alt={comment.author.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white mr-2">{comment.author.name}</span>
                    <span className="text-xs text-cyan-500/60">{formatRelativeTime(comment.created_at)}</span>
                    <p className="text-[14px] text-cyan-300/70 mt-1 font-light leading-snug">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="pt-5 mt-4 shrink-0 border-t border-cyan-500/20">
              {commentsError && (
                <p className="text-sm text-red-300 mb-3">{commentsError}</p>
              )}
              <div className="relative group border-glow-cyan rounded-full transition-all">
                <input
                  ref={generalCommentInputRef}
                  type="text"
                  placeholder="Dodaj komentarz..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddGeneralComment();
                    }
                  }}
                  className="w-full bg-black/40 border border-cyan-500/20 rounded-full py-3.5 pl-6 pr-14 text-base text-white placeholder-cyan-400/40 outline-none backdrop-blur-md transition-all focus:bg-black/60 focus:border-cyan-500/50 shadow-[inset_0_0_10px_rgba(0,255,255,0.05)]"
                />
                <button
                  onClick={() => void handleAddGeneralComment()}
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-cyan-300 transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
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
              onClick={() => openPhotoCommentModal(0)}
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
                  <ChatCircle size={30} weight="fill" className="text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider text-glow-cyan absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity">
                Napisz
              </span>
            </button>

            <button
              onClick={() => openPhotoCommentModal(0)}
              className="cta-dock-btn flex flex-col items-center justify-center gap-1 p-2 group w-16"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all shadow-inner">
                <Quotes size={20} weight="fill" className="text-cyan-400 group-hover:text-cyan-300 drop-shadow-[0_0_8px_rgba(0,255,255,0)] group-hover:drop-shadow-[0_0_12px_rgba(0,255,255,0.8)] transition-all" />
              </div>
              <span className="text-[10px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-wider mt-1">
                Cytat foto
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

      {isPhotoModalOpen && (
        <div
          className="fixed inset-0 z-[220] bg-black/92 backdrop-blur-sm"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <div
            className="w-full h-full glass border border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-black/40 flex items-center justify-center p-4 md:p-8">
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white hover:text-cyan-300 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>

              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => goToPhoto('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white hover:text-cyan-300 transition-colors"
                  >
                    <CaretLeft size={18} weight="bold" />
                  </button>
                  <button
                    onClick={() => goToPhoto('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white hover:text-cyan-300 transition-colors"
                  >
                    <CaretRight size={18} weight="bold" />
                  </button>
                </>
              )}

              <img
                src={allPhotos[activePhotoIndex] || profile.image_url || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1400&q=80'}
                alt={`${profile.name} - foto ${activePhotoIndex + 1}`}
                className="max-h-full max-w-full object-contain rounded-2xl"
                onClick={() => photoCommentInputRef.current?.focus()}
              />

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 border border-white/15 text-xs text-white">
                Zdjęcie {Math.min(activePhotoIndex + 1, Math.max(allPhotos.length, 1))} / {Math.max(allPhotos.length, 1)}
              </div>
            </div>

            <div className="p-6 md:p-8 flex flex-col bg-[#0a0710]/90">
              <h3 className="text-base font-medium text-cyan-300/80 tracking-wider uppercase flex items-center gap-2 pb-4 border-b border-cyan-500/20">
                <Quotes size={20} weight="fill" className="text-cyan-400" /> Komentarze do zdjęcia
              </h3>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mt-5">
                {photoCommentsLoading ? (
                  <div className="text-sm text-cyan-300/70">Ładowanie komentarzy...</div>
                ) : !photoCommentsTableAvailable ? (
                  <div className="text-sm text-amber-300/80">
                    Funkcja komentarzy zdjęć wymaga migracji SQL (`supabase/migration_photo_comments.sql`).
                  </div>
                ) : photoComments.length === 0 ? (
                  <div className="text-sm text-cyan-300/70">Brak komentarzy do tego zdjęcia. Dodaj pierwszy cytat.</div>
                ) : (
                  photoComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <img
                        src={comment.author.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
                        alt={comment.author.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-white">
                          <span className="font-medium">{comment.author.name}</span>
                          <span className="text-cyan-500/60 text-xs ml-2">{formatRelativeTime(comment.created_at)}</span>
                        </p>
                        <p className="text-sm text-cyan-300/80 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {commentsError && (
                <p className="text-sm text-red-300 mt-3">{commentsError}</p>
              )}

              <div className="pt-4 mt-4 border-t border-cyan-500/20">
                <div className="relative border-glow-cyan rounded-full transition-all">
                  <input
                    ref={photoCommentInputRef}
                    type="text"
                    placeholder="Dodaj komentarz do zdjęcia..."
                    value={photoCommentText}
                    onChange={(e) => setPhotoCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddPhotoComment();
                      }
                    }}
                    disabled={!photoCommentsTableAvailable}
                    className="w-full bg-black/40 border border-cyan-500/20 rounded-full py-3 pl-5 pr-14 text-sm text-white placeholder-cyan-400/40 outline-none focus:border-cyan-500/50 transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={() => void handleAddPhotoComment()}
                    disabled={isSubmittingPhotoComment || !photoCommentText.trim() || !photoCommentsTableAvailable}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PaperPlaneTilt size={16} weight="fill" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCircle,
  Images,
  IdentificationCard,
  ListDashes,
  GameController,
  Camera,
  X,
  Plus,
  CheckCircle,
  Ruler,
  Star,
  CaretDown,
  Tag,
  Wine,
  Dog,
  GenderIntersex,
  HeartStraight,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { uploadProfilePhoto } from '@/lib/photoUpload';
import { POLISH_CITIES, ZODIAC_SIGNS, ALL_INTERESTS, DRINKING_OPTIONS, PETS_OPTIONS, SEXUAL_ORIENTATION_OPTIONS, LOOKING_FOR_OPTIONS } from './constants/profileFormOptions';
import type { Profile } from '@/lib/types';

const MAX_GALLERY_PHOTOS = 9;
const ACCOUNT_DELETION_GRACE_DAYS = 30;
const DEFAULT_MAIN_PHOTO = 'https://ui-avatars.com/api/?name=Brak+zdjecia&background=111827&color=e5e7eb&size=512';

type EditableProfile = Profile & {
  id: string;
  image_url?: string | null;
  photos?: string[] | null;
  occupation?: string | null;
  zodiac?: string | null;
  drinking?: string | null;
  pets?: string | null;
  sexual_orientation?: string | null;
  looking_for?: string | null;
  is_blocked?: boolean;
  suspended_at?: string | null;
  deletion_requested_at?: string | null;
  deletion_scheduled_at?: string | null;
};

type PhotoCommentSyncRow = {
  id: string;
  author_profile_id: string;
  content: string;
  photo_index: number;
  created_at: string;
};

export default function NewMyProfileView() {
  const router = useRouter();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState<
    'suspend' | 'resume' | 'delete' | 'cancel-delete' | null
  >(null);
  const [galleryUploadCount, setGalleryUploadCount] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState(18);
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [height, setHeight] = useState(170);
  const [zodiac, setZodiac] = useState('');
  const [drinking, setDrinking] = useState('');
  const [pets, setPets] = useState('');
  const [sexualOrientation, setSexualOrientation] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedInterest, setSelectedInterest] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User not authenticated:', userError);
        setLoading(false);
        return;
      }

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
        return;
      }

      if (prof) {
        setProfile(prof as EditableProfile);
        setName(prof.name || '');
        setAge(prof.age || 18);
        setOccupation(prof.occupation || '');
        setCity(prof.city || '');
        setBio(prof.bio || '');
        setHeight(170);
        setZodiac(prof.zodiac || '');
        setDrinking(prof.drinking || '');
        setPets(prof.pets || '');
        setSexualOrientation(prof.sexual_orientation || '');
        setLookingFor(prof.looking_for || '');
        setInterests(prof.interests || []);
      }
    } catch (err) {
      console.error('Error in loadProfile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const { url, error } = await uploadProfilePhoto(file, profile.id);
      
      if (url) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ image_url: url })
          .eq('id', profile.id);

        if (!updateError) {
          setProfile({ ...profile, image_url: url });
          alert('✓ Zdjęcie główne zaktualizowane!');
        } else {
          alert(`Błąd aktualizacji: ${updateError.message}`);
        }
      } else {
        alert(`Błąd uploadu: ${error}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Błąd uploadu zdjęcia');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMainPhoto = async () => {
    if (!profile) return;

    if (!profile.image_url) {
      alert('Nie masz ustawionego zdjecia glownego.');
      return;
    }

    const shouldRemove = window.confirm(
      'Usuniecie zdjecia glownego wyczysci komentarze do tego zdjecia i przesunie komentarze galerii. Kontynuowac?',
    );

    if (!shouldRemove) return;

    const previousImage = profile.image_url;
    setUploading(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ image_url: '' })
        .eq('id', profile.id);

      if (updateError) {
        alert(`Blad usuwania zdjecia glownego: ${updateError.message}`);
        return;
      }

      setProfile({ ...profile, image_url: '' });

      const syncError = await syncPhotoCommentsAfterGalleryRemoval(profile.id, 0);
      if (!syncError) {
        alert('✓ Zdjecie glowne zostalo usuniete.');
        return;
      }

      console.error('Blad synchronizacji komentarzy po usunieciu glownego zdjecia:', syncError);

      const { error: rollbackError } = await supabase
        .from('profiles')
        .update({ image_url: previousImage })
        .eq('id', profile.id);

      if (!rollbackError) {
        setProfile({ ...profile, image_url: previousImage });
        alert(`Nie udalo sie zsynchronizowac komentarzy (${syncError}). Zmiana zdjecia zostala cofnieta.`);
        return;
      }

      alert(`Zdjecie glowne zostalo usuniete, ale synchronizacja komentarzy sie nie powiodla: ${syncError}`);
    } catch (err) {
      console.error('Error removing main photo:', err);
      alert('Nie udalo sie usunac zdjecia glownego.');
    } finally {
      setUploading(false);
    }
  };

  const formatLifecycleDate = (value?: string | null): string | null => {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSuspendAccount = async () => {
    if (!profile) return;

    if (profile.deletion_scheduled_at) {
      alert('Konto jest juz oznaczone do usuniecia. Nie mozna go ponownie zawiesic.');
      return;
    }

    if (profile.is_blocked) {
      alert('Konto jest juz zawieszone i ukryte w portalu.');
      return;
    }

    const shouldSuspend = window.confirm(
      'Zawieszenie konta ukryje profil w portalu i w wyszukiwarce. Kontynuowac?',
    );

    if (!shouldSuspend) return;

    setAccountActionLoading('suspend');

    try {
      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: true, suspended_at: nowIso })
        .eq('id', profile.id);

      if (error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('suspended_at')) {
          const { error: fallbackError } = await supabase
            .from('profiles')
            .update({ is_blocked: true })
            .eq('id', profile.id);

          if (fallbackError) {
            alert(`Blad zawieszania konta: ${fallbackError.message}`);
            return;
          }
        } else {
          alert(`Blad zawieszania konta: ${error.message}`);
          return;
        }
      }

      await loadProfile();
      alert('✓ Konto zostalo zawieszone. Profil jest teraz ukryty w portalu.');
    } catch (err) {
      console.error('Error suspending account:', err);
      alert('Nie udalo sie zawiesic konta.');
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleResumeAccount = async () => {
    if (!profile) return;

    if (profile.deletion_scheduled_at) {
      alert('Najpierw anuluj wniosek o usuniecie konta.');
      return;
    }

    if (!profile.is_blocked) {
      alert('Konto jest juz aktywne.');
      return;
    }

    const shouldResume = window.confirm('Wznowic konto i przywrocic widocznosc profilu w portalu?');
    if (!shouldResume) return;

    setAccountActionLoading('resume');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: false, suspended_at: null })
        .eq('id', profile.id);

      if (error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('suspended_at')) {
          const { error: fallbackError } = await supabase
            .from('profiles')
            .update({ is_blocked: false })
            .eq('id', profile.id);

          if (fallbackError) {
            alert(`Blad wznawiania konta: ${fallbackError.message}`);
            return;
          }
        } else {
          alert(`Blad wznawiania konta: ${error.message}`);
          return;
        }
      }

      await loadProfile();
      alert('✓ Konto zostalo wznowione i jest znowu widoczne w portalu.');
    } catch (err) {
      console.error('Error resuming account:', err);
      alert('Nie udalo sie wznowic konta.');
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleRequestPermanentDeletion = async () => {
    if (!profile) return;

    if (profile.deletion_scheduled_at) {
      alert('Wniosek o trwale usuniecie konta jest juz aktywny.');
      return;
    }

    const confirmation = window.prompt(
      `Aby potwierdzic trwale usuniecie konta z opoznieniem ${ACCOUNT_DELETION_GRACE_DAYS} dni, wpisz: USUN`,
    );

    if ((confirmation || '').trim().toUpperCase() !== 'USUN') {
      return;
    }

    setAccountActionLoading('delete');

    try {
      const now = new Date();
      const scheduled = new Date(now.getTime() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          suspended_at: now.toISOString(),
          deletion_requested_at: now.toISOString(),
          deletion_scheduled_at: scheduled.toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('deletion_requested_at') || errorText.includes('deletion_scheduled_at')) {
          alert('Brak kolumn cyklu zycia konta. Uruchom SQL: supabase/account_lifecycle_migration.sql');
          return;
        }

        alert(`Blad ustawiania wniosku o usuniecie: ${error.message}`);
        return;
      }

      await loadProfile();
      alert(`Wniosek przyjety. Konto zostanie usuniete po ${ACCOUNT_DELETION_GRACE_DAYS} dniach.`);
      await supabase.auth.signOut();
      router.replace('/auth');
    } catch (err) {
      console.error('Error scheduling account deletion:', err);
      alert('Nie udalo sie ustawic wniosku o usuniecie konta.');
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleCancelDeletionRequest = async () => {
    if (!profile) return;

    if (!profile.deletion_scheduled_at) {
      alert('Brak aktywnego wniosku o usuniecie konta.');
      return;
    }

    const shouldCancel = window.confirm(
      'Anulowac wniosek o trwałe usuniecie i od razu przywrocic konto do portalu?',
    );
    if (!shouldCancel) return;

    setAccountActionLoading('cancel-delete');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: false,
          suspended_at: null,
          deletion_requested_at: null,
          deletion_scheduled_at: null,
        })
        .eq('id', profile.id);

      if (error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('deletion_requested_at') || errorText.includes('deletion_scheduled_at')) {
          alert('Brak kolumn cyklu zycia konta. Uruchom SQL: supabase/account_lifecycle_migration.sql');
          return;
        }

        alert(`Blad anulowania wniosku: ${error.message}`);
        return;
      }

      await loadProfile();
      alert('✓ Wniosek o usuniecie zostal anulowany, konto jest znowu widoczne.');
    } catch (err) {
      console.error('Error canceling account deletion request:', err);
      alert('Nie udalo sie anulowac wniosku o usuniecie konta.');
    } finally {
      setAccountActionLoading(null);
    }
  };

  const formatPhotoCountLabel = (count: number): string => {
    if (count === 1) return '1 zdjęcie';
    return `${count} zdjęć`;
  };

  const uploadGalleryFiles = async (files: FileList | null) => {
    if (!files || !profile) return;

    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (selectedFiles.length === 0) {
      alert('Wybierz poprawny plik graficzny.');
      return;
    }

    const currentPhotos = profile.photos || [];
    const availableSlots = Math.max(0, MAX_GALLERY_PHOTOS - currentPhotos.length);

    if (availableSlots <= 0) {
      alert(`Galeria jest pełna (${MAX_GALLERY_PHOTOS}/${MAX_GALLERY_PHOTOS}). Usuń zdjęcie, aby dodać nowe.`);
      return;
    }

    const filesToUpload = selectedFiles.slice(0, availableSlots);
    const skippedByLimit = selectedFiles.length - filesToUpload.length;

    setUploading(true);
    setGalleryUploadCount(filesToUpload.length);

    try {
      const uploadedUrls: string[] = [];
      let failedUploads = 0;

      for (const file of filesToUpload) {
        const { url, error } = await uploadProfilePhoto(file, profile.id);
        if (url) {
          uploadedUrls.push(url);
        } else {
          failedUploads += 1;
          console.error('Błąd uploadu zdjęcia galerii:', error);
        }
      }

      if (uploadedUrls.length === 0) {
        alert('Nie udało się dodać żadnego zdjęcia do galerii. Spróbuj ponownie.');
        return;
      }

      const newPhotos = [...currentPhotos, ...uploadedUrls];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photos: newPhotos })
        .eq('id', profile.id);

      if (updateError) {
        alert(`Błąd aktualizacji: ${updateError.message}`);
        return;
      }

      setProfile({ ...profile, photos: newPhotos });

      const notices: string[] = [`✓ Dodano ${formatPhotoCountLabel(uploadedUrls.length)} do galerii.`];
      if (failedUploads > 0) {
        notices.push(`${failedUploads} plików nie udało się wysłać.`);
      }
      if (skippedByLimit > 0) {
        notices.push(`${skippedByLimit} plików pominięto (limit galerii).`);
      }

      alert(notices.join(' '));
    } catch (err) {
      console.error('Upload error:', err);
      alert('Błąd uploadu zdjęcia');
    } finally {
      setUploading(false);
      setGalleryUploadCount(0);
    }
  };

  const handleSingleGalleryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadGalleryFiles(e.target.files);
    e.target.value = '';
  };

  const handleBatchGalleryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadGalleryFiles(e.target.files);
    e.target.value = '';
  };

  const syncPhotoCommentsAfterGalleryRemoval = async (profileId: string, removedPhotoIndex: number): Promise<string | null> => {
    const { data, error: fetchError } = await supabase
      .from('profile_photo_comments')
      .select('id, author_profile_id, content, photo_index, created_at')
      .eq('profile_id', profileId)
      .gte('photo_index', removedPhotoIndex)
      .order('photo_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchError) {
      return fetchError.message || 'Nie udalo sie pobrac komentarzy do zdjec.';
    }

    const affectedRows = (data || []) as PhotoCommentSyncRow[];
    if (affectedRows.length === 0) return null;

    const rowsToShift = affectedRows.filter((row) => Number(row.photo_index) > removedPhotoIndex);

    if (rowsToShift.length > 0) {
      const shiftPayload = rowsToShift.map((row) => ({
        profile_id: profileId,
        photo_index: Number(row.photo_index) - 1,
        author_profile_id: row.author_profile_id,
        content: row.content,
        created_at: row.created_at,
      }));

      const { error: insertError } = await supabase
        .from('profile_photo_comments')
        .insert(shiftPayload);

      if (insertError) {
        return insertError.message || 'Nie udalo sie przeniesc komentarzy do nowych pozycji zdjec.';
      }
    }

    const oldRowIds = affectedRows.map((row) => row.id);
    const { error: deleteError } = await supabase
      .from('profile_photo_comments')
      .delete()
      .in('id', oldRowIds);

    if (deleteError) {
      return deleteError.message || 'Nie udalo sie usunac starych wpisow komentarzy.';
    }

    return null;
  };

  const handleRemoveGalleryPhoto = async (index: number) => {
    if (!profile || !profile.photos) return;

    const shouldRemove = window.confirm(
      'Usuniecie zdjecia spowoduje tez usuniecie komentarzy do tego zdjecia. Kontynuowac?',
    );

    if (!shouldRemove) return;

    const previousPhotos = profile.photos;
    const newPhotos = profile.photos.filter((_, i) => i !== index);
    const removedPhotoIndex = index + 1;
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ photos: newPhotos })
      .eq('id', profile.id);

    if (updateError) {
      alert(`Błąd usuwania: ${updateError.message}`);
      return;
    }

    setProfile({ ...profile, photos: newPhotos });

    const syncError = await syncPhotoCommentsAfterGalleryRemoval(profile.id, removedPhotoIndex);
    if (!syncError) {
      return;
    }

    console.error('Blad synchronizacji komentarzy po usunieciu zdjecia:', syncError);

    const { error: rollbackError } = await supabase
      .from('profiles')
      .update({ photos: previousPhotos })
      .eq('id', profile.id);

    if (!rollbackError) {
      setProfile({ ...profile, photos: previousPhotos });
      alert(`Nie udało się zsynchronizować komentarzy (${syncError}). Zmiana zdjęcia została cofnięta.`);
      return;
    }

    alert(`Zdjęcie zostało usunięte, ale wystąpił błąd synchronizacji komentarzy: ${syncError}`);
  };

  const handleAddInterest = () => {
    if (!selectedInterest || interests.includes(selectedInterest)) {
      return;
    }
    setInterests([...interests, selectedInterest]);
    setSelectedInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          age,
          city,
          bio,
          interests,
          occupation,
          zodiac,
          drinking,
          pets,
          sexual_orientation: sexualOrientation,
          looking_for: lookingFor,
        })
        .eq('id', profile.id);

      if (error) {
        alert(`Błąd zapisu: ${error.message}`);
      } else {
        alert('✓ Profil zapisany pomyślnie!');
        await loadProfile();
      }
    } catch (err) {
      console.error('Error saving:', err);
      alert('Błąd zapisu profilu');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    loadProfile();
  };

  if (loading) {
    return (
      <div className="pt-28 pb-16 px-6 text-center">
        <div className="text-cyan-400 text-lg">Ładowanie profilu...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-28 pb-16 px-6 text-center">
        <div className="text-red-400 text-lg">Nie znaleziono profilu. Zaloguj się ponownie.</div>
      </div>
    );
  }

  const galleryPhotos = profile.photos || [];
  const maxGalleryPhotos = MAX_GALLERY_PHOTOS;
  const deletionScheduledLabel = formatLifecycleDate(profile.deletion_scheduled_at);
  const deletionRequestedLabel = formatLifecycleDate(profile.deletion_requested_at);
  const suspendedAtLabel = formatLifecycleDate(profile.suspended_at);
  const hasDeletionRequest = Boolean(profile.deletion_scheduled_at);
  const isBlocked = Boolean(profile.is_blocked);
  const isSuspendedOnly = isBlocked && !hasDeletionRequest;
  const isBusy = Boolean(accountActionLoading);

  return (
    <main className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto">
      <div className="mb-8 relative">
        <h1 className="text-4xl font-light text-white">
          Edycja <span className="text-gradient font-medium">Profilu</span>
        </h1>
        <p className="text-gray-400 font-light mt-2">
          Dostosuj to, jak widzą Cię inni użytkownicy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* LEFT COLUMN: Photos */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Main Photo */}
          <div className="glass rounded-[2rem] p-6 relative overflow-hidden group hover:shadow-[0_0_40px_rgba(0,255,255,0.15)] transition-all duration-500">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl group-hover:blur-3xl group-hover:bg-cyan-400/20 transition-all duration-700"></div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2 relative z-10">
              <UserCircle size={24} className="text-cyan-400" weight="fill" /> Zdjęcie główne
            </h3>
            <label className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer border border-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] transition-all duration-500 block z-10">
              <img
                src={profile.image_url || DEFAULT_MAIN_PHOTO}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                alt="Główne zdjęcie"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                <div className="bg-cyan-500/20 p-4 rounded-full text-cyan-400 shadow-[0_0_30px_rgba(0,255,255,0.6)] mb-2 animate-pulse">
                  <Camera size={32} weight="fill" />
                </div>
                <span className="text-white font-medium tracking-wide">
                  {uploading ? 'Wysylanie...' : profile.image_url ? 'Zmien zdjecie' : 'Dodaj zdjecie'}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleMainPhotoUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>

            <div className="mt-4 flex items-center justify-between gap-3 relative z-10">
              <span className="text-xs text-white/60">
                {profile.image_url ? 'Zdjecie glowne ustawione' : 'Brak zdjecia glownego'}
              </span>
              <button
                onClick={handleRemoveMainPhoto}
                disabled={uploading || !profile.image_url}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Usun zdjecie
              </button>
            </div>
          </div>

          {/* Gallery */}
          <div className="glass rounded-[2rem] p-6 relative overflow-hidden group hover:shadow-[0_0_40px_rgba(255,0,255,0.15)] transition-all duration-500">
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-fuchsia-400/10 rounded-full blur-2xl group-hover:blur-3xl group-hover:bg-fuchsia-400/20 transition-all duration-700"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Images size={24} className="text-fuchsia-400" weight="fill" /> Galeria
              </h3>
              <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {galleryPhotos.length} / {maxGalleryPhotos} zdjęć
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 relative z-10">
              {galleryPhotos.slice(0, maxGalleryPhotos).map((photo, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl relative group overflow-hidden border border-white/10 hover:border-fuchsia-500/50 hover:shadow-[0_0_20px_rgba(255,0,255,0.2)] transition-all duration-300"
                >
                  <img src={photo} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" alt={`Galeria ${i + 1}`} />
                  <button
                    onClick={() => handleRemoveGalleryPhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-red-500 shadow-lg"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ))}

              {galleryPhotos.length < maxGalleryPhotos && (
                <>
                  <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] flex flex-col items-center justify-center text-white/50 hover:text-cyan-400 transition-all duration-300 group cursor-pointer">
                    <Plus size={24} className="group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" weight="bold" />
                    <span className="text-[10px] uppercase tracking-wider mt-1">1 szt.</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSingleGalleryPhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>

                  <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-fuchsia-400 hover:bg-fuchsia-500/10 hover:shadow-[0_0_20px_rgba(255,0,255,0.15)] flex flex-col items-center justify-center text-white/50 hover:text-fuchsia-300 transition-all duration-300 group cursor-pointer">
                    <Images size={22} className="group-hover:scale-110 transition-transform duration-300" weight="duotone" />
                    <span className="text-[10px] uppercase tracking-wider mt-1">Stos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleBatchGalleryPhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </>
              )}
            </div>

            {uploading && galleryUploadCount > 0 && (
              <p className="text-xs text-cyan-300/80 mt-4 relative z-10">
                Wysyłanie do galerii: {formatPhotoCountLabel(galleryUploadCount)}...
              </p>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Form */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Basic Data */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-[0_0_40px_rgba(0,255,255,0.1)] transition-all duration-500">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 group-hover:blur-[120px] transition-all duration-700"></div>
            <div className="absolute -left-10 top-1/2 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <h2 className="text-xl font-medium text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2 relative z-10">
              <div className="p-2 bg-cyan-500/10 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.1)]">
                <IdentificationCard size={28} className="text-cyan-400" />
              </div>
              <span>Dane podstawowe</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Imię</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300 border-glow-cyan"
                  placeholder="Twoje imię"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Wiek</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300 border-glow-cyan"
                  min={18}
                  max={120}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Zawód / Edukacja</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300 border-glow-cyan"
                  placeholder="Twój zawód"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Lokalizacja</label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300 border-glow-cyan appearance-none"
                  >
                    <option value="" className="bg-gray-900">Wybierz miasto...</option>
                    {POLISH_CITIES.map((c) => (
                      <option key={c} value={c} className="bg-gray-900">
                        {c}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    weight="bold"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2 relative z-10">
              <label className="text-sm text-gray-400 ml-1 flex justify-between">
                O mnie <span className="text-xs text-gray-600">Max 500 znaków</span>
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300 border-glow-cyan resize-none"
                placeholder="Opowiedz coś o sobie..."
              />
            </div>
          </div>

          {/* Profile Attributes */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-[0_0_40px_rgba(255,0,255,0.1)] transition-all duration-500">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-fuchsia-500/20 group-hover:blur-[120px] transition-all duration-700"></div>
            
            <h2 className="text-xl font-medium text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2 relative z-10">
              <div className="p-2 bg-fuchsia-500/10 rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.1)]">
                <ListDashes size={28} className="text-fuchsia-400" />
              </div>
              <span>Cechy profilu</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Wzrost</label>
                <div className="relative">
                  <Ruler
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value) || 170)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-fuchsia-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(255,0,255,0.1)] transition-all duration-300 border-glow-magenta"
                    min={120}
                    max={250}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    cm
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Znak zodiaku</label>
                <div className="relative">
                  <Star
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                    weight="fill"
                  />
                  <select
                    value={zodiac}
                    onChange={(e) => setZodiac(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-fuchsia-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(255,0,255,0.1)] transition-all duration-300 border-glow-magenta appearance-none"
                  >
                    <option value="" className="bg-gray-900">Wybierz znak...</option>
                    {ZODIAC_SIGNS.map((z) => (
                      <option key={z.value} value={z.value} className="bg-gray-900">
                        {z.label}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    weight="bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Stosunek do alkoholu</label>
                <div className="relative">
                  <Wine
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <select
                    value={drinking}
                    onChange={(e) => setDrinking(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-fuchsia-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(255,0,255,0.1)] transition-all duration-300 border-glow-magenta appearance-none"
                  >
                    <option value="" className="bg-gray-900">Wybierz...</option>
                    {DRINKING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-gray-900">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    weight="bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Zwierzęta</label>
                <div className="relative">
                  <Dog
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <select
                    value={pets}
                    onChange={(e) => setPets(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-fuchsia-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(255,0,255,0.1)] transition-all duration-300 border-glow-magenta appearance-none"
                  >
                    <option value="" className="bg-gray-900">Wybierz...</option>
                    {PETS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-gray-900">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    weight="bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Orientacja</label>
                <div className="relative">
                  <GenderIntersex
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400"
                    weight="duotone"
                  />
                  <select
                    value={sexualOrientation}
                    onChange={(e) => setSexualOrientation(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300 appearance-none"
                  >
                    <option value="" className="bg-gray-900">Wybierz...</option>
                    {SEXUAL_ORIENTATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    weight="bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Czego szukam</label>
                <div className="relative">
                  <HeartStraight
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-400"
                    weight="fill"
                  />
                  <select
                    value={lookingFor}
                    onChange={(e) => setLookingFor(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-fuchsia-500/50 focus:bg-black/50 focus:shadow-[0_0_20px_rgba(255,0,255,0.1)] transition-all duration-300 appearance-none"
                  >
                    <option value="" className="bg-gray-900">Wybierz...</option>
                    {LOOKING_FOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    weight="bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interests */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-[0_0_40px_rgba(0,255,255,0.1)] transition-all duration-500">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition-all duration-700"></div>
            
            <h2 className="text-xl font-medium text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2 relative z-10">
              <div className="p-2 bg-cyan-500/10 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.1)]">
                <GameController size={28} className="text-cyan-400" weight="fill" />
              </div>
              <span>Moje zajawki</span>
            </h2>

            {/* Selected Interests */}
            <div className="flex flex-wrap gap-3 mb-6 relative z-10">
              {interests.map((interest) => {
                const interestData = ALL_INTERESTS.find((i) => i.value === interest);
                const InterestIcon = interestData?.icon;
                const color = interestData?.color || 'text-cyan-400';

                return (
                  <span
                    key={interest}
                    className="px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-white flex items-center gap-2 text-sm shadow-[0_0_10px_rgba(0,255,255,0.05)] hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:border-cyan-500/50 transition-all duration-300"
                  >
                    {InterestIcon && <InterestIcon size={16} className={color} />}
                    <span>{interest}</span>
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="hover:text-red-400 hover:scale-110 ml-1 bg-black/20 rounded-full w-5 h-5 flex items-center justify-center transition-all duration-200"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Add Interest */}
            <div className="flex gap-3 relative z-10">
              <div className="relative flex-1">
                <Tag size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  value={selectedInterest}
                  onChange={(e) => setSelectedInterest(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-11 pr-10 text-white outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300 appearance-none"
                >
                  <option value="" disabled>
                    Wybierz zainteresowanie...
                  </option>
                  {ALL_INTERESTS.map((interest) => (
                    <option key={interest.value} value={interest.value} className="bg-gray-900">
                      {interest.label}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  weight="bold"
                />
              </div>
              <button
                onClick={handleAddInterest}
                className="bg-white/10 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] border border-white/10 hover:border-cyan-500/30 px-6 rounded-xl font-medium text-white transition-all duration-300 flex items-center gap-2"
              >
                <Plus size={16} weight="bold" /> Dodaj
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-2 relative z-10">
            <button
              onClick={handleDiscard}
              className="px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 font-medium"
              disabled={saving}
            >
              Odrzuć zmiany
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold text-white shadow-[0_0_30px_rgba(0,255,255,0.4)] hover:shadow-[0_0_40px_rgba(0,255,255,0.6)] hover:scale-105 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <CheckCircle size={20} weight="fill" />
              {saving ? 'Zapisywanie...' : 'Zapisz profil'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 glass rounded-2xl p-6 border border-red-500/25 flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-red-200/70 mb-1">Zarzadzanie kontem</p>
          <h2 className="text-2xl text-white font-light">Widocznosc i usuniecie konta</h2>
          <p className="text-red-100/75 mt-2 text-sm">
            Zawieszenie ukrywa konto w portalu. Trwale usuniecie uruchamia 30-dniowe odliczanie i blokuje profil natychmiast.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-white/55">Status widocznosci</p>
            <p className="text-white mt-1">
              {hasDeletionRequest
                ? 'Konto oznaczone do usuniecia'
                : isBlocked
                ? 'Konto ukryte w portalu'
                : 'Konto publiczne'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-white/55">Wniosek o usuniecie</p>
            <p className="text-white mt-1">
              {deletionRequestedLabel || 'Brak aktywnego wniosku'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-white/55">Termin trwalego usuniecia</p>
            <p className="text-white mt-1">
              {deletionScheduledLabel || 'Nie zaplanowano'}
            </p>
          </div>
        </div>

        {suspendedAtLabel && isSuspendedOnly && (
          <p className="text-xs text-white/55">Konto zostalo zawieszone: {suspendedAtLabel}</p>
        )}

        {hasDeletionRequest && (
          <p className="text-xs text-red-200/80">
            Konto jest ukryte i czeka na trwale usuniecie. Mozesz anulowac ten wniosek przed uplywem terminu.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={isBlocked ? handleResumeAccount : handleSuspendAccount}
            disabled={isBusy || hasDeletionRequest}
            className={`rounded-xl border px-5 py-2.5 transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
              isBlocked
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
            }`}
          >
            {accountActionLoading === 'suspend'
              ? 'Zawieszanie...'
              : accountActionLoading === 'resume'
              ? 'Wznawianie...'
              : isBlocked
              ? 'Wznow konto'
              : 'Zawies konto'}
          </button>

          <button
            onClick={hasDeletionRequest ? handleCancelDeletionRequest : handleRequestPermanentDeletion}
            disabled={isBusy}
            className={`rounded-xl border px-5 py-2.5 transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
              hasDeletionRequest
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25'
                : 'border-red-500/40 bg-red-500/15 text-red-100 hover:bg-red-500/25'
            }`}
          >
            {accountActionLoading === 'delete'
              ? 'Ustawianie wniosku...'
              : accountActionLoading === 'cancel-delete'
              ? 'Anulowanie wniosku...'
              : hasDeletionRequest
              ? 'Anuluj wniosek o usuniecie'
              : `Usun konto bezpowrotnie (${ACCOUNT_DELETION_GRACE_DAYS} dni)`}
          </button>
        </div>
      </div>
    </main>
  );
}

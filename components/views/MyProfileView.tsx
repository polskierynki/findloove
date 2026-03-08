import { useEffect, useState } from 'react';
import { GENDERS, ORIENTATION_OPTIONS, POLISH_CITIES, ZODIAC_SIGNS, OCCUPATION_OPTIONS, SMOKING_OPTIONS, CHILDREN_OPTIONS, ALL_INTERESTS } from './constants/profileFormOptions';
import { LOOKING_FOR_OPTIONS } from '@/lib/types';
// Funkcja pomocnicza do pobierania statystyk aktywności
async function fetchUserStats(userId: string) {
  try {
    // Liczba wysłanych wiadomości
    const { count: sentMessages, error: sentMsgError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('from_profile_id', userId);
    
    // Liczba otrzymanych wiadomości
    const { count: receivedMessages, error: recvMsgError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_profile_id', userId);
    
    // Liczba polubień otrzymanych
    const { count: receivedLikes, error: recvLikesError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('to_profile_id', userId);
    
    // Liczba polubień wysłanych
    const { count: sentLikes, error: sentLikesError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('from_profile_id', userId);
    
    // Loguj błędy ale nie przerywaj działania
    if (sentMsgError) console.warn('Error fetching sent messages:', sentMsgError);
    if (recvMsgError) console.warn('Error fetching received messages:', recvMsgError);
    if (recvLikesError) console.warn('Error fetching received likes:', recvLikesError);
    if (sentLikesError) console.warn('Error fetching sent likes:', sentLikesError);
    
    return {
      sentMessages: sentMessages ?? 0,
      receivedMessages: receivedMessages ?? 0,
      receivedLikes: receivedLikes ?? 0,
      sentLikes: sentLikes ?? 0,
    };
  } catch (error) {
    console.error('Error in fetchUserStats:', error);
    return {
      sentMessages: 0,
      receivedMessages: 0,
      receivedLikes: 0,
      sentLikes: 0,
    };
  }
}
import { supabase } from '@/lib/supabase';

import { uploadProfilePhoto, addPhotoToProfilePhotos, removePhotoFromProfilePhotos, setMainProfilePhoto } from '@/lib/photoUpload';
import { FaceVerificationModal } from './FaceVerificationModal';

export default function MyProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Pobierz dane profilu i zdjęcia po zalogowaniu
  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error getting user:', userError);
          setLoading(false);
          return;
        }
        if (!user) {
          console.log('No user logged in');
          setLoading(false);
          return;
        }
        
        const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        console.log('PROFILE DEBUG:', { prof, error, user });
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }
        
        // Jeśli profil nie istnieje (lub nie jest widoczny przez RLS), utwórz/zaktualizuj
        if (!prof && error?.code === 'PGRST116') {
          const newProfile = {
            id: user.id,
            // email: user.email || '', // NIE wysyłaj email w UPSERT - to dane auth, mogą się konfliktować
            name: '',
            age: 18,
            city: '',
            bio: '',
            interests: [],
            status: '',
            image_url: '',
            is_verified: false,
            occupation: '',
            zodiac: '',
            smoking: '',
            children: '',
            gender: '',
            seeking_gender: '',
            seeking_age_min: 18,
            seeking_age_max: 82,
          };
          
          // Użyj UPSERT - jeśli profil istnieje, zaktualizuj go (napraw RLS)
          const { data: upsertedProfile, error: upsertError } = await supabase
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' })
            .select()
            .single();
          
          if (upsertError) {
            console.error('=== ERROR UPSERTING PROFILE ===');
            console.error('Error object:', upsertError);
            console.error('User ID:', user.id);
            console.error('User email:', user.email);
            alert(
              `Nie udalo sie utworzyc/zaktualizowac profilu.\n\nSzczegoly: ${upsertError.message}\n\nOtworz konsole (F12) aby zobaczyc wiecej szczegolow.\n\nUpewnij sie, ze wykonales SQL: supabase/fix_photo_permissions_relaxed.sql`,
            );
            setLoading(false);
            return;
          }
          
          setProfile(upsertedProfile || newProfile);
          setForm(upsertedProfile || newProfile);
          setEdit(true); // Włącz tryb edycji dla nowego profilu
        } else {
          setProfile(prof);
          setForm(prof || {});
          
          // Automatycznie włącz tryb edycji jeśli profil jest pusty/niepełny
          const isIncomplete = !prof?.name || !prof?.age || !prof?.city || !prof?.bio;
          setEdit(isIncomplete);
        }
        
        const { data: ph } = await supabase.from('profile_photos').select('*').eq('profile_id', user.id).order('sort_order');
        setPhotos(ph || []);
        
        // Pobierz statystyki aktywności
        const stats = await fetchUserStats(user.id);
        setStats(stats);
      } catch (err) {
        console.error('Unexpected error in MyProfile useEffect:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Obsługa zmiany pól formularza
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Zapisz zmiany profilu
  const handleSave = async () => {
    setLoading(true);
    try {
      // Sprawdź czy profil będzie kompletny po zapisaniu
      const isComplete =
        Boolean(form?.name) &&
        Boolean(form?.age) &&
        Boolean(form?.city) &&
        Boolean(form?.bio) &&
        Boolean(form?.interests?.length) &&
        photos.length > 0;

      // Jeśli kompletny, ustaw status na 'active'
      const updateData = isComplete && form?.status !== 'active' ? { ...form, status: 'active' } : form;

      const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id);
      if (error) {
        console.error('Error updating profile:', error);
        alert('Błąd podczas zapisywania profilu. Sprawdź konsolę.');
      } else {
        setProfile(updateData);
        setEdit(false);
        if (isComplete && form?.status !== 'active') {
          alert('✓ Profil uzupełniony i aktywowany!');
        }
      }
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      alert('Nieoczekiwany błąd. Sprawdź konsolę.');
    } finally {
      setLoading(false);
    }
  };

  // Upload nowego zdjęcia
  const handlePhotoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Sprawdź czy profil istnieje
    if (!profile || !profile.id) {
      alert('Profil nie zostal jeszcze utworzony. Odswierz strone lub wypelnij dane profilu.');
      return;
    }
    
    setUploading(true);

    const { url, error } = await uploadProfilePhoto(file, profile.id);
    if (!url) {
      alert(
        `Nie udalo sie wyslac zdjecia do storage.objects.\n\nSzczegoly: ${error || 'Bucket profile-photos moze nie istniec lub brak uprawnien.'}\n\nUpewnij sie, ze wykonales SQL: supabase/fix_photo_permissions_relaxed.sql`,
      );
      setUploading(false);
      return;
    }

    const added = await addPhotoToProfilePhotos(profile.id, url, photos.length === 0, photos.length);
    if (!added.success) {
      const errorMsg = `BLAD DODAWANIA ZDJECIA\n\nProfile ID: ${profile.id}\nURL: ${url}\n\nSzczegoly bledu:\n${added.error || 'brak dodatkowych informacji'}\n\nOtworz konsole przegladarki (F12) aby zobaczyc wiecej szczegolow.`;
      console.error('ALERT TEXT:', errorMsg);
      alert(errorMsg);
      setUploading(false);
      return;
    }

    const { data: ph } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('profile_id', profile.id)
      .order('sort_order');
    setPhotos(ph || []);

    // Sprawdź czy profil jest teraz kompletny - jeśli tak, zmień status na 'active'
    const isNowComplete =
      Boolean(profile?.name) &&
      Boolean(profile?.age) &&
      Boolean(profile?.city) &&
      Boolean(profile?.bio) &&
      Boolean(profile?.interests?.length) &&
      (ph?.length || 0) > 0;

    if (isNowComplete && profile?.status !== 'active') {
      console.log('Profile is now complete! Updating status to active...');
      await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', profile.id);
      setProfile({ ...profile, status: 'active' });
    }

    setUploading(false);
    setPhotoSaved(true);
    setTimeout(() => setPhotoSaved(false), 3000); // Schowaj komunikat po 3 sekundach
  };

  // Usuń zdjęcie
  const handleRemovePhoto = async (photoId: string) => {
    const removed = await removePhotoFromProfilePhotos(photoId);
    if (!removed.success) {
      alert(`Nie udalo sie usunac zdjecia.\n\nSzczegoly: ${removed.error || 'brak dodatkowych informacji'}`);
      return;
    }
    setPhotos(photos.filter((p) => p.id !== photoId));
  };

  // Ustaw zdjęcie główne
  const handleSetMain = async (photoId: string) => {
    const changed = await setMainProfilePhoto(profile.id, photoId);
    if (!changed.success) {
      alert(`Nie udalo sie ustawic glownego zdjecia.\n\nSzczegoly: ${changed.error || 'brak dodatkowych informacji'}`);
      return;
    }

    const { data: ph } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('profile_id', profile.id)
      .order('sort_order');
    setPhotos(ph || []);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="animate-pulse rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="mb-4 h-7 w-40 rounded bg-slate-200" />
          <div className="mb-6 h-4 w-72 rounded bg-slate-100" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 rounded-2xl bg-slate-100" />
            <div className="h-28 rounded-2xl bg-slate-100" />
            <div className="h-28 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  const handleFaceSuccess = async (imageSrc: string) => {
    setVerifying(true);
    await supabase.from('profiles').update({ is_verified: true }).eq('id', profile.id);
    setProfile({ ...profile, is_verified: true });
    setShowFaceModal(false);
    setVerifying(false);
  };

  const mainPhotoUrl =
    photos.find((photo) => photo.is_main)?.url ||
    photos[0]?.url ||
    profile?.image_url ||
    '/logo/logo.jpg';

  const completionChecks = [
    Boolean(profile?.name),
    Boolean(profile?.age),
    Boolean(profile?.city),
    Boolean(profile?.bio),
    Boolean(profile?.interests?.length),
    photos.length > 0,
  ];
  const completionPercent = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
  );

  // Debug logging
  if (photos.length > 0) {
    console.log('=== COMPLETION PROGRESS ===');
    console.log('Profile name:', profile?.name);
    console.log('Profile age:', profile?.age);
    console.log('Profile city:', profile?.city);
    console.log('Profile bio:', profile?.bio);
    console.log('Profile interests:', profile?.interests?.length);
    console.log('Photos count:', photos.length);
    console.log('Completion checks:', completionChecks);
    console.log('Completion percent:', completionPercent);
  }

  const renderValue = (value: string | number | undefined | null) =>
    value ? value : <span className="text-slate-400 italic">Nie podano</span>;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-8">
      <section className="relative overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-amber-50 p-5 md:p-7 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-100/60 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-amber-100/60 blur-2xl" />

        <div className="relative grid gap-4 md:grid-cols-[96px_1fr_auto] md:items-center">
          <img
            src={mainPhotoUrl}
            alt="Zdjecie glowne profilu"
            className="h-24 w-24 rounded-2xl object-cover border-2 border-white shadow"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Moj profil</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-800">
              {profile?.name || 'Uzupelnij swoja wizytowke'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {profile?.city ? `${profile.city} · ` : ''}
              {profile?.age ? `${profile.age} lat` : 'Brak podstawowych danych'}
            </p>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Kompletnosc profilu</span>
                <span>{completionPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
            <button
              onClick={() => setEdit(true)}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
            >
              Edytuj profil
            </button>
            {profile?.is_verified ? (
              <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Zweryfikowany profil
              </span>
            ) : (
              <button
                className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                onClick={() => setShowFaceModal(true)}
                disabled={verifying}
              >
                {verifying ? 'Weryfikacja...' : 'Zweryfikuj przez selfie'}
              </button>
            )}
          </div>
        </div>
      </section>

      <FaceVerificationModal
        isOpen={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        onSuccess={handleFaceSuccess}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          {!profile?.name && !edit && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Profil jest niekompletny. Uzupelnij dane, aby wygladac wiarygodnie i pojawiac sie wyzej w wynikach.
            </div>
          )}

          {edit ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Imie</label>
                  <input
                    name="name"
                    value={form.name || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    placeholder="Twoje imie"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Wiek</label>
                  <input
                    name="age"
                    value={form.age || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    placeholder="Wiek"
                    type="number"
                    min="18"
                    max="120"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Plec</label>
                  <select
                    name="gender"
                    value={form.gender || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Wybierz...</option>
                    {GENDERS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Kogo szukasz?</label>
                  <select
                    name="seeking_gender"
                    value={form.seeking_gender || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Wybierz...</option>
                    <option value="K">Kobiety</option>
                    <option value="M">Mezczyzni</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Miasto</label>
                  <input
                    name="city"
                    value={form.city || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    placeholder="Miasto"
                    list="cities"
                  />
                  <datalist id="cities">
                    {POLISH_CITIES.map((city) => <option key={city} value={city} />)}
                  </datalist>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Cel</label>
                  <select
                    name="status"
                    value={form.status || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Wybierz...</option>
                    {LOOKING_FOR_OPTIONS.map((opt) => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Zawod</label>
                  <select
                    name="occupation"
                    value={form.occupation || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Wybierz...</option>
                    {OCCUPATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Znak zodiaku</label>
                  <select
                    name="zodiac"
                    value={form.zodiac || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Wybierz...</option>
                    {ZODIAC_SIGNS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Palenie</label>
                  <select
                    name="smoking"
                    value={form.smoking || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Wybierz...</option>
                    {SMOKING_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Dzieci</label>
                  <select
                    name="children"
                    value={form.children || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Wybierz...</option>
                    {CHILDREN_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">O sobie</label>
                <textarea
                  name="bio"
                  value={form.bio || ''}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  placeholder="Opowiedz cos o sobie..."
                  rows={4}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Zainteresowania</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_INTERESTS.map((interest) => (
                    <label
                      key={interest}
                      className={`rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${form.interests?.includes(interest) ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200'}`}
                    >
                      <input
                        type="checkbox"
                        name="interests"
                        value={interest}
                        checked={form.interests?.includes(interest) || false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((prev: any) => ({
                            ...prev,
                            interests: checked
                              ? [...(prev.interests || []), interest]
                              : (prev.interests || []).filter((i: string) => i !== interest),
                          }));
                        }}
                        className="mr-1"
                      />
                      {interest}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 font-semibold text-white hover:bg-rose-600"
                  disabled={loading}
                >
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
                <button
                  onClick={() => { setEdit(false); setForm(profile); }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Twoja wizytowka</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Profil przypomina karte randkowa: konkretne informacje + naturalny opis + dobre zdjecie glowne.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Imie</p><p className="mt-1 font-semibold text-slate-800">{renderValue(profile?.name)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Wiek</p><p className="mt-1 font-semibold text-slate-800">{renderValue(profile?.age)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Plec</p><p className="mt-1 font-semibold text-slate-800">{renderValue(GENDERS.find((g) => g.id === profile?.gender)?.label)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Miasto</p><p className="mt-1 font-semibold text-slate-800">{renderValue(profile?.city)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Zawod</p><p className="mt-1 font-semibold text-slate-800">{renderValue(profile?.occupation)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Znak zodiaku</p><p className="mt-1 font-semibold text-slate-800">{renderValue(profile?.zodiac)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Palenie</p><p className="mt-1 font-semibold text-slate-800">{renderValue(profile?.smoking)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Dzieci</p><p className="mt-1 font-semibold text-slate-800">{renderValue(profile?.children)}</p></div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">O sobie</p>
                <p className="mt-1 text-sm text-slate-700">{renderValue(profile?.bio)}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Zainteresowania</p>
                {profile?.interests?.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.interests.map((interest: string) => (
                      <span key={interest} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-400 italic">Nie podano</p>
                )}
              </div>

              <button
                onClick={() => setEdit(true)}
                className="rounded-xl bg-rose-500 px-4 py-2.5 font-semibold text-white hover:bg-rose-600"
              >
                Edytuj dane
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {stats && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Aktywnosc</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-rose-500">{stats.sentMessages}</p><p className="text-[11px] text-slate-500">Wyslane</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-rose-500">{stats.receivedMessages}</p><p className="text-[11px] text-slate-500">Otrzymane</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-rose-500">{stats.sentLikes}</p><p className="text-[11px] text-slate-500">Lajki wyslane</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-rose-500">{stats.receivedLikes}</p><p className="text-[11px] text-slate-500">Lajki otrzymane</p></div>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Galeria</h3>
              <span className="text-xs font-medium text-slate-500">{photos.length}/6</span>
            </div>

            {photoSaved && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                ✓ Zdjęcie zapisane
              </div>
            )}

            {photos.length === 0 && (
              <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                Dodaj minimum 1 zdjecie. Profile ze zdjeciem sa znacznie czesciej otwierane.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-slate-200">
                  <img src={photo.url} alt="Profil" className="h-28 w-full object-cover" />
                  {photo.is_main && (
                    <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">Glowne</span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => handleRemovePhoto(photo.id)} className="font-semibold">Usun</button>
                    {!photo.is_main && (
                      <button onClick={() => handleSetMain(photo.id)} className="font-semibold text-amber-200">Ustaw glowne</button>
                    )}
                  </div>
                </div>
              ))}

              <label className="flex h-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500 hover:border-rose-300 hover:text-rose-500">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                {uploading ? 'Wysylanie...' : '+ Dodaj'}
              </label>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

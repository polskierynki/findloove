import { useEffect, useState } from 'react';
import { GENDERS, ORIENTATION_OPTIONS, POLISH_CITIES, ZODIAC_SIGNS, OCCUPATION_OPTIONS, SMOKING_OPTIONS, CHILDREN_OPTIONS, ALL_INTERESTS } from './constants/profileFormOptions';
import { LOOKING_FOR_OPTIONS } from '@/lib/types';
// Funkcja pomocnicza do pobierania statystyk aktywności
async function fetchUserStats(userId: string) {
  // Liczba wysłanych wiadomości
  const { count: sentMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('from_profile_id', userId);
  // Liczba otrzymanych wiadomości
  const { count: receivedMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('to_profile_id', userId);
  // Liczba polubień otrzymanych
  const { count: receivedLikes } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('to_profile_id', userId);
  // Liczba polubień wysłanych
  const { count: sentLikes } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('from_profile_id', userId);
  // Liczba logowań (jeśli masz taką kolumnę/logi, tu uproszczone)
  // Możesz rozbudować o inne statystyki
  return {
    sentMessages: sentMessages ?? 0,
    receivedMessages: receivedMessages ?? 0,
    receivedLikes: receivedLikes ?? 0,
    sentLikes: sentLikes ?? 0,
  };
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
  const [stats, setStats] = useState<any>(null);

  // Pobierz dane profilu i zdjęcia po zalogowaniu
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      console.log('PROFILE DEBUG:', { prof, error, user });
      setProfile(prof);
      setForm(prof);
      const { data: ph } = await supabase.from('profile_photos').select('*').eq('profile_id', user.id).order('sort_order');
      setPhotos(ph || []);
      // Pobierz statystyki aktywności
      const stats = await fetchUserStats(user.id);
      setStats(stats);
      setLoading(false);
    })();
  }, []);

  // Obsługa zmiany pól formularza
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Zapisz zmiany profilu
  const handleSave = async () => {
    setLoading(true);
    await supabase.from('profiles').update(form).eq('id', profile.id);
    setProfile(form);
    setEdit(false);
    setLoading(false);
  };

  // Upload nowego zdjęcia
  const handlePhotoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadProfilePhoto(file, profile.id);
    if (url) {
      await addPhotoToProfilePhotos(profile.id, url, photos.length === 0, photos.length);
      const { data: ph } = await supabase.from('profile_photos').select('*').eq('profile_id', profile.id).order('sort_order');
      setPhotos(ph || []);
    }
    setUploading(false);
  };

  // Usuń zdjęcie
  const handleRemovePhoto = async (photoId: string) => {
    await removePhotoFromProfilePhotos(photoId);
    setPhotos(photos.filter(p => p.id !== photoId));
  };

  // Ustaw zdjęcie główne
  const handleSetMain = async (photoId: string) => {
    await setMainProfilePhoto(profile.id, photoId);
    const { data: ph } = await supabase.from('profile_photos').select('*').eq('profile_id', profile.id).order('sort_order');
    setPhotos(ph || []);
  };

  if (loading) return <div className="p-8 text-center">Ładowanie profilu...</div>;

  const handleFaceSuccess = async (imageSrc: string) => {
    setVerifying(true);
    // Tu można dodać upload selfie do Supabase Storage lub API detekcji twarzy
    // Przykład: await supabase.storage.from('face-verification').upload(...)
    // Po pozytywnej weryfikacji ustawiamy is_verified na true
    await supabase.from('profiles').update({ is_verified: true }).eq('id', profile.id);
    setProfile({ ...profile, is_verified: true });
    setShowFaceModal(false);
    setVerifying(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Mój profil</h2>
      <div className="mb-4 flex items-center gap-2">
        {profile?.is_verified ? (
          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Profil zweryfikowany ✓</span>
        ) : (
          <>
            <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Niezweryfikowany</span>
            <button
              className="ml-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-60"
              onClick={() => setShowFaceModal(true)}
              disabled={verifying}
            >
              {verifying ? 'Weryfikacja...' : 'Zweryfikuj przez selfie'}
            </button>
          </>
        )}
      </div>
      <FaceVerificationModal
        isOpen={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        onSuccess={handleFaceSuccess}
      />
      {/* Statystyki aktywności */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-lg font-bold text-rose-500">{stats.sentMessages}</div>
            <div className="text-xs text-slate-500">Wysłane wiadomości</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-lg font-bold text-rose-500">{stats.receivedMessages}</div>
            <div className="text-xs text-slate-500">Otrzymane wiadomości</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-lg font-bold text-rose-500">{stats.sentLikes}</div>
            <div className="text-xs text-slate-500">Polubienia wysłane</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-lg font-bold text-rose-500">{stats.receivedLikes}</div>
            <div className="text-xs text-slate-500">Polubienia otrzymane</div>
          </div>
        </div>
      )}
      <div className="mb-6 flex gap-4 flex-wrap">
        {photos.map(photo => (
          <div key={photo.id} className="relative group">
            <img src={photo.url} alt="Profil" className={`w-28 h-28 object-cover rounded-xl border-2 ${photo.is_main ? 'border-rose-500' : 'border-slate-200'}`} />
            <button onClick={() => handleRemovePhoto(photo.id)} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-xs">✕</button>
            {!photo.is_main && (
              <button onClick={() => handleSetMain(photo.id)} className="absolute bottom-1 left-1 bg-white/80 rounded-full px-2 py-0.5 text-xs text-rose-600">Ustaw główne</button>
            )}
          </div>
        ))}
        <label className="w-28 h-28 flex items-center justify-center border-2 border-dashed rounded-xl cursor-pointer text-slate-400 hover:border-rose-400">
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          {uploading ? 'Wysyłanie...' : '+'}
        </label>
      </div>
      {edit ? (
        <div className="space-y-3">
          {/* Płeć */}
          <div>
            <label className="block text-sm font-semibold mb-1">Płeć</label>
            <select name="gender" value={form.gender || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Wybierz...</option>
              {GENDERS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
          {/* Orientacja */}
          <div>
            <label className="block text-sm font-semibold mb-1">Kogo szukasz?</label>
            <select name="seeking_gender" value={form.seeking_gender || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Wybierz...</option>
              <option value="K">Kobiety</option>
              <option value="M">Mężczyzny</option>
            </select>
          </div>
          {/* Wiek */}
          <input name="age" value={form.age || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="Wiek" type="number" min="8" max="120" />
          {/* Miasto z podpowiedziami */}
          <div>
            <input name="city" value={form.city || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="Miasto" list="cities" />
            <datalist id="cities">
              {POLISH_CITIES.map(city => <option key={city} value={city} />)}
            </datalist>
          </div>
          {/* Cel */}
          <div>
            <label className="block text-sm font-semibold mb-1">Cel</label>
            <select name="status" value={form.status || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Wybierz...</option>
              {LOOKING_FOR_OPTIONS.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
            </select>
          </div>
          {/* O sobie */}
          <textarea name="bio" value={form.bio || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="O sobie" />
          {/* Zawód */}
          <div>
            <label className="block text-sm font-semibold mb-1">Zawód</label>
            <select name="occupation" value={form.occupation || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Wybierz...</option>
              {OCCUPATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {/* Znak zodiaku */}
          <div>
            <label className="block text-sm font-semibold mb-1">Znak zodiaku</label>
            <select name="zodiac" value={form.zodiac || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Wybierz...</option>
              {ZODIAC_SIGNS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {/* Palenie */}
          <div>
            <label className="block text-sm font-semibold mb-1">Palenie</label>
            <select name="smoking" value={form.smoking || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Wybierz...</option>
              {SMOKING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {/* Dzieci */}
          <div>
            <label className="block text-sm font-semibold mb-1">Dzieci</label>
            <select name="children" value={form.children || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Wybierz...</option>
              {CHILDREN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {/* Zainteresowania */}
          <div>
            <label className="block text-sm font-semibold mb-1">Zainteresowania</label>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map(interest => (
                <label key={interest} className={`px-3 py-1 rounded-full border cursor-pointer text-sm ${form.interests?.includes(interest) ? 'bg-rose-100 border-rose-400 text-rose-700' : 'bg-white border-slate-300 text-slate-500'}`}>
                  <input
                    type="checkbox"
                    name="interests"
                    value={interest}
                    checked={form.interests?.includes(interest) || false}
                    onChange={e => {
                      const checked = e.target.checked;
                      setForm((prev: any) => ({
                        ...prev,
                        interests: checked
                          ? [...(prev.interests || []), interest]
                          : (prev.interests || []).filter((i: string) => i !== interest)
                      }));
                    }}
                    className="mr-1"
                  />
                  {interest}
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleSave} className="bg-rose-500 text-white px-4 py-2 rounded">Zapisz</button>
          <button onClick={() => setEdit(false)} className="ml-2 text-slate-500">Anuluj</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div><b>Imię:</b> {profile.name}</div>
          <div><b>Wiek:</b> {profile.age}</div>
          <div><b>Miasto:</b> {profile.city}</div>
          <div><b>O sobie:</b> {profile.bio}</div>
          <div><b>Zawód:</b> {profile.occupation}</div>
          <div><b>Znak zodiaku:</b> {profile.zodiac}</div>
          <div><b>Palenie:</b> {profile.smoking}</div>
          <div><b>Dzieci:</b> {profile.children}</div>
          <button onClick={() => setEdit(true)} className="bg-slate-200 px-4 py-2 rounded mt-2">Edytuj dane</button>
        </div>
      )}
    </div>
  );
}

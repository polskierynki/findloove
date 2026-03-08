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
        
        // Jeśli profil nie istnieje, utwórz pusty
        if (!prof && error?.code === 'PGRST116') {
          const newProfile = {
            id: user.id,
            email: user.email || '',
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
          const { error: insertError } = await supabase.from('profiles').insert(newProfile);
          if (insertError) {
            console.error('Error creating profile:', insertError);
          }
          setProfile(newProfile);
          setForm(newProfile);
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
      const { error } = await supabase.from('profiles').update(form).eq('id', profile.id);
      if (error) {
        console.error('Error updating profile:', error);
        alert('Błąd podczas zapisywania profilu. Sprawdź konsolę.');
      } else {
        setProfile(form);
        setEdit(false);
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
      
      {!profile?.name && !edit && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            Twój profil jest niekompletny. Uzupełnij swoje dane, aby inni mogli Cię poznać!
          </p>
        </div>
      )}
      
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
      
      {/* Sekcja zdjęć */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 text-slate-700">Galeria zdjęć</h3>
        {photos.length === 0 && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-800">
              📸 Dodaj swoje zdjęcia, aby zwiększyć swoje szanse na poznanie kogoś wyjątkowego!
            </p>
          </div>
        )}
        <div className="flex gap-4 flex-wrap">
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
      </div>
      {edit ? (
        <div className="space-y-3">
          {/* Imię */}
          <div>
            <label className="block text-sm font-semibold mb-1">Imię</label>
            <input 
              name="name" 
              value={form.name || ''} 
              onChange={handleChange} 
              className="w-full border rounded px-3 py-2" 
              placeholder="Twoje imię" 
              required
            />
          </div>
          {/* Wiek */}
          <div>
            <label className="block text-sm font-semibold mb-1">Wiek</label>
            <input 
              name="age" 
              value={form.age || ''} 
              onChange={handleChange} 
              className="w-full border rounded px-3 py-2" 
              placeholder="Wiek" 
              type="number" 
              min="18" 
              max="120" 
              required
            />
          </div>
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
          {/* Miasto z podpowiedziami */}
          <div>
            <label className="block text-sm font-semibold mb-1">Miasto</label>
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
          <div>
            <label className="block text-sm font-semibold mb-1">O sobie</label>
            <textarea name="bio" value={form.bio || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="Opowiedz coś o sobie..." rows={4} />
          </div>
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
          <div className="flex gap-2 pt-4">
            <button onClick={handleSave} className="flex-1 bg-rose-500 text-white px-4 py-2 rounded hover:bg-rose-600 font-semibold" disabled={loading}>
              {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
            <button onClick={() => { setEdit(false); setForm(profile); }} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50">
              Anuluj
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div><b>Imię:</b> {profile?.name ? profile.name : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>Wiek:</b> {profile?.age ? profile.age : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>Płeć:</b> {profile?.gender ? GENDERS.find(g => g.id === profile.gender)?.label : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>Miasto:</b> {profile?.city ? profile.city : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>O sobie:</b> {profile?.bio ? profile.bio : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>Zawód:</b> {profile?.occupation ? profile.occupation : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>Znak zodiaku:</b> {profile?.zodiac ? profile.zodiac : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>Palenie:</b> {profile?.smoking ? profile.smoking : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>Dzieci:</b> {profile?.children ? profile.children : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <div><b>Zainteresowania:</b> {profile?.interests?.length > 0 ? profile.interests.join(', ') : <span className="text-slate-400 italic">Nie podano</span>}</div>
          <button onClick={() => setEdit(true)} className="bg-rose-500 text-white px-4 py-2 rounded mt-4 hover:bg-rose-600">Edytuj dane</button>
        </div>
      )}
    </div>
  );
}

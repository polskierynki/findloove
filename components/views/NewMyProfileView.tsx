'use client';

import { useEffect, useState } from 'react';
import { Camera, X, Save, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadProfilePhoto, removePhotoFromProfilePhotos } from '@/lib/photoUpload';

const POLISH_CITIES = [
  'Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz',
  'Lublin', 'Białystok', 'Katowice', 'Gdynia', 'Częstochowa', 'Radom', 'Sosnowiec',
  'Toruń', 'Kielce', 'Rzeszów', 'Gliwice', 'Zabrze', 'Olsztyn',
];

const ZODIAC_SIGNS = [
  'Baran', 'Byk', 'Bliźnięta', 'Rak', 'Lew', 'Panna', 
  'Waga', 'Skorpion', 'Strzelec', 'Koziorożec', 'Wodnik', 'Ryby'
];

const INTERESTS_OPTIONS = [
  { emoji: '🎨', name: 'Sztuka' },
  { emoji: '⚽', name: 'Sport' },
  { emoji: '🎬', name: 'Kino' },
  { emoji: '🎵', name: 'Muzyka' },
  { emoji: '📚', name: 'Książki' },
  { emoji: '🍕', name: 'Jedzenie' },
  { emoji: '✈️', name: 'Podróże' },
  { emoji: '🎮', name: 'Gaming' },
  { emoji: '🏋️', name: 'Fitness' },
  { emoji: '🎭', name: 'Teatr' },
  { emoji: '📷', name: 'Fotografia' },
  { emoji: '🌿', name: 'Natura' },
];

export default function NewMyProfileView() {
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState(18);
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [height, setHeight] = useState(170);
  const [zodiac, setZodiac] = useState('');
  const [alcohol, setAlcohol] = useState('czasami');
  const [pets, setPets] = useState('lubię');
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedInterest, setSelectedInterest] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (prof) {
        setProfile(prof);
        setName(prof.name || '');
        setAge(prof.age || 18);
        setOccupation(prof.details?.occupation || '');
        setCity(prof.city || '');
        setBio(prof.bio || '');
        setHeight(prof.details?.height || 170);
        setZodiac(prof.details?.zodiac || '');
        setAlcohol(prof.details?.alcohol || 'czasami');
        setPets(prof.details?.pets || 'lubię');
        setInterests(prof.interests || []);
      }

      // Load photos
      const { data: photosData } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('profile_id', user.id)
        .order('sort_order');

      setPhotos(photosData || []);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !profile) return;

    setUploading(true);
    const { url, error } = await uploadProfilePhoto(file, profile.id);
    
    if (url) {
      const { data: newPhoto } = await supabase
        .from('profile_photos')
        .insert({
          profile_id: profile.id,
          url,
          is_main: photos.length === 0,
          sort_order: photos.length,
        })
        .select()
        .single();

      if (newPhoto) {
        setPhotos([...photos, newPhoto]);
      }
    } else {
      alert(`Błąd uploadu: ${error}`);
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (photoId: string) => {
    const removed = await removePhotoFromProfilePhotos(photoId);
    if (removed.success) {
      setPhotos(photos.filter((p) => p.id !== photoId));
    } else {
      alert(`Błąd usuwania: ${removed.error}`);
    }
  };

  const handleAddInterest = () => {
    if (!selectedInterest || interests.includes(selectedInterest)) return;
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
          details: {
            occupation,
            height,
            zodiac,
            alcohol,
            pets,
          },
        })
        .eq('id', profile.id);

      if (error) {
        alert(`Błąd zapisu: ${error.message}`);
      } else {
        alert('✓ Profil zapisany!');
        loadProfile();
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
    return <div className="pt-28 text-center text-cyan-400">Ładowanie...</div>;
  }

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[1800px] mx-auto">
      <h1 className="text-4xl font-light text-white mb-8 flex items-center gap-3">
        Mój Profil <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: Photos */}
        <aside className="lg:col-span-5">
          {/* Main Photo */}
          <div className="glass rounded-[2rem] p-6 mb-6">
            <h3 className="text-base font-medium text-cyan-300/70 tracking-wider uppercase mb-4">
              📸 Zdjęcie główne
            </h3>
            <div className="relative w-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 flex items-center justify-center overflow-hidden border border-white/10">
              {photos[0]?.url ? (
                <img src={photos[0].url} alt="Main" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-cyan-400/50">
                  <Camera size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Dodaj zdjęcie główne</p>
                </div>
              )}
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="glass rounded-[2rem] p-6">
            <h3 className="text-base font-medium text-cyan-300/70 tracking-wider uppercase mb-4">
              🖼️ Galeria
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => {
                const photo = photos[i + 1];
                return (
                  <div
                    key={i}
                    className="relative aspect-square rounded-2xl bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 flex items-center justify-center overflow-hidden border border-white/10 group"
                  >
                    {photo?.url ? (
                      <>
                        <img src={photo.url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <Camera size={32} className="text-cyan-400/20" />
                    )}
                  </div>
                );
              })}
            </div>

            <label className="mt-4 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)] flex items-center justify-center gap-2 text-white cursor-pointer">
              <Upload size={20} />
              {uploading ? 'Wysyłanie...' : 'Dodaj zdjęcie'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </aside>

        {/* RIGHT: Form */}
        <section className="lg:col-span-7 space-y-6">
          {/* Basic Info */}
          <div className="glass rounded-[2rem] p-8">
            <h3 className="text-xl font-medium text-white mb-6">Podstawowe dane</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-cyan-400 mb-2 block">Imię</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                  placeholder="Twoje imię"
                />
              </div>
              <div>
                <label className="text-sm text-cyan-400 mb-2 block">Wiek</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                  min={18}
                  max={99}
                />
              </div>
              <div>
                <label className="text-sm text-cyan-400 mb-2 block">Zawód</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                  placeholder="Twoja profesja"
                />
              </div>
              <div>
                <label className="text-sm text-cyan-400 mb-2 block">Lokalizacja</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                >
                  <option value="">Wybierz miasto</option>
                  {POLISH_CITIES.map((c) => (
                    <option key={c} value={c} className="bg-[#110a22]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-cyan-400 mb-2 block">O mnie</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all resize-none h-32"
                placeholder="Opowiedz coś o sobie..."
              />
            </div>
          </div>

          {/* Characteristics */}
          <div className="glass rounded-[2rem] p-8">
            <h3 className="text-xl font-medium text-white mb-6">Cechy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-cyan-400 mb-2 block flex items-center gap-2">
                  📏 Wzrost (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                  min={140}
                  max={220}
                />
              </div>
              <div>
                <label className="text-sm text-cyan-400 mb-2 block flex items-center gap-2">
                  ⭐ Znak zodiaku
                </label>
                <select
                  value={zodiac}
                  onChange={(e) => setZodiac(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                >
                  <option value="">Wybierz znak</option>
                  {ZODIAC_SIGNS.map((z) => (
                    <option key={z} value={z} className="bg-[#110a22]">
                      {z}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-cyan-400 mb-2 block flex items-center gap-2">
                  🍷 Alkohol
                </label>
                <select
                  value={alcohol}
                  onChange={(e) => setAlcohol(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                >
                  <option value="nie" className="bg-[#110a22]">Nie piję</option>
                  <option value="czasami" className="bg-[#110a22]">Czasami</option>
                  <option value="towarzysko" className="bg-[#110a22]">Towarzysko</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-cyan-400 mb-2 block flex items-center gap-2">
                  🐕 Zwierzęta
                </label>
                <select
                  value={pets}
                  onChange={(e) => setPets(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                >
                  <option value="lubię" className="bg-[#110a22]">Lubię</option>
                  <option value="mam" className="bg-[#110a22]">Mam</option>
                  <option value="nie lubię" className="bg-[#110a22]">Nie lubię</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interests */}
          <div className="glass rounded-[2rem] p-8">
            <h3 className="text-xl font-medium text-white mb-6">Zainteresowania</h3>
            
            <div className="flex gap-2 mb-4">
              <select
                value={selectedInterest}
                onChange={(e) => setSelectedInterest(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 transition-all"
              >
                <option value="">Wybierz zainteresowanie</option>
                {INTERESTS_OPTIONS.map((int) => (
                  <option key={int.name} value={int.name} className="bg-[#110a22]">
                    {int.emoji} {int.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddInterest}
                disabled={!selectedInterest}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-medium transition-all text-white"
              >
                Dodaj
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {interests.map((interest) => {
                const found = INTERESTS_OPTIONS.find((i) => i.name === interest);
                return (
                  <span
                    key={interest}
                    className="px-4 py-2 rounded-full border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/10 to-transparent backdrop-blur-md flex items-center gap-2 text-white"
                  >
                    {found?.emoji} {interest}
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="flex-1 glass border border-white/20 hover:border-white/30 py-4 rounded-xl font-medium transition-all text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={20} />
              Odrzuć zmiany
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 py-4 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] text-white flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {saving ? 'Zapisywanie...' : 'Zapisz profil'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

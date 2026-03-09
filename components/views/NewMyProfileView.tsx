'use client';

import { useEffect, useState } from 'react';
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
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { uploadProfilePhoto } from '@/lib/photoUpload';
import { POLISH_CITIES, ZODIAC_SIGNS, ALL_INTERESTS } from './constants/profileFormOptions';
import type { Profile } from '@/lib/types';

export default function NewMyProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState(18);
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [height, setHeight] = useState(170);
  const [zodiac, setZodiac] = useState('');
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
        setProfile(prof as Profile);
        setName(prof.name || '');
        setAge(prof.age || 18);
        setOccupation(prof.occupation || '');
        setCity(prof.city || '');
        setBio(prof.bio || '');
        setHeight(170); // Default, można dodać do bazy
        setZodiac(prof.zodiac || '');
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
        // Update main image_url in profile
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

  const handleGalleryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const { url, error } = await uploadProfilePhoto(file, profile.id);
      
      if (url) {
        // Add to photos array
        const currentPhotos = profile.photos || [];
        const newPhotos = [...currentPhotos, url];
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ photos: newPhotos })
          .eq('id', profile.id);

        if (!updateError) {
          setProfile({ ...profile, photos: newPhotos });
          alert('✓ Zdjęcie dodane do galerii!');
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

  const handleRemoveGalleryPhoto = async (index: number) => {
    if (!profile || !profile.photos) return;

    const newPhotos = profile.photos.filter((_, i) => i !== index);
    
    const { error } = await supabase
      .from('profiles')
      .update({ photos: newPhotos })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, photos: newPhotos });
    } else {
      alert(`Błąd usuwania: ${error.message}`);
    }
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
  const maxGalleryPhotos = 9;

  return (
    <main className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto">
      <div className="mb-8">
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
          <div className="glass rounded-[2rem] p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <UserCircle size={24} className="text-cyan-400" weight="fill" /> Zdjęcie główne
            </h3>
            <label className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer border border-white/10 hover:border-cyan-500/50 transition-colors block">
              <img
                src={profile.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'}
                className="w-full h-full object-cover"
                alt="Główne zdjęcie"
              />
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <div className="bg-cyan-500/20 p-4 rounded-full text-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)] mb-2">
                  <Camera size={32} weight="fill" />
                </div>
                <span className="text-white font-medium tracking-wide">
                  {uploading ? 'Wysyłanie...' : 'Zmień zdjęcie'}
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
          </div>

          {/* Gallery */}
          <div className="glass rounded-[2rem] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Images size={24} className="text-fuchsia-400" weight="fill" /> Galeria
              </h3>
              <span className="text-xs text-gray-400">
                {galleryPhotos.length} / {maxGalleryPhotos} zdjęć
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {galleryPhotos.slice(0, maxGalleryPhotos).map((photo, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl relative group overflow-hidden border border-white/10"
                >
                  <img src={photo} className="w-full h-full object-cover" alt={`Galeria ${i + 1}`} />
                  <button
                    onClick={() => handleRemoveGalleryPhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ))}

              {galleryPhotos.length < maxGalleryPhotos && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-400 hover:bg-cyan-500/5 flex flex-col items-center justify-center text-white/50 hover:text-cyan-400 transition-all group cursor-pointer">
                  <Plus size={24} className="group-hover:scale-110 transition-transform" weight="bold" />
                  <span className="text-[10px] uppercase tracking-wider mt-1">Dodaj</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryPhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Form */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Basic Data */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <h2 className="text-xl font-medium text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
              <IdentificationCard size={28} className="text-cyan-400" /> Dane podstawowe
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Imię</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 transition-all border-glow-cyan"
                  placeholder="Twoje imię"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Wiek</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 transition-all border-glow-cyan"
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
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 transition-all border-glow-cyan"
                  placeholder="Twój zawód"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Lokalizacja</label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 transition-all border-glow-cyan appearance-none"
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

            <div className="mt-6 space-y-2">
              <label className="text-sm text-gray-400 ml-1 flex justify-between">
                O mnie <span className="text-xs text-gray-600">Max 500 znaków</span>
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500/50 focus:bg-black/50 transition-all border-glow-cyan resize-none"
                placeholder="Opowiedz coś o sobie..."
              />
            </div>
          </div>

          {/* Profile Attributes */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden">
            <h2 className="text-xl font-medium text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
              <ListDashes size={28} className="text-fuchsia-400" /> Cechy profilu
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-fuchsia-500/50 focus:bg-black/50 transition-all border-glow-magenta"
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
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-fuchsia-500/50 focus:bg-black/50 transition-all border-glow-magenta appearance-none"
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
            </div>
          </div>

          {/* Interests */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden">
            <h2 className="text-xl font-medium text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
              <GameController size={28} className="text-cyan-400" weight="fill" /> Moje zajawki
            </h2>

            {/* Selected Interests */}
            <div className="flex flex-wrap gap-3 mb-6">
              {interests.map((interest) => {
                const interestData = ALL_INTERESTS.find((i) => i.value === interest);
                const InterestIcon = interestData?.icon;
                const color = interestData?.color || 'text-cyan-400';

                return (
                  <span
                    key={interest}
                    className="px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-white flex items-center gap-2 text-sm shadow-[0_0_10px_rgba(0,255,255,0.05)]"
                  >
                    {InterestIcon && <InterestIcon size={16} className={color} />}
                    <span>{interest}</span>
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="hover:text-red-400 ml-1 bg-black/20 rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Add Interest */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Tag size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  value={selectedInterest}
                  onChange={(e) => setSelectedInterest(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-11 pr-10 text-white outline-none focus:border-cyan-500/50 appearance-none"
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
                className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 rounded-xl font-medium text-white transition-colors flex items-center gap-2"
              >
                <Plus size={16} weight="bold" /> Dodaj
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-2">
            <button
              onClick={handleDiscard}
              className="px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all font-medium"
              disabled={saving}
            >
              Odrzuć zmiany
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold text-white shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={20} weight="fill" />
              {saving ? 'Zapisywanie...' : 'Zapisz profil'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

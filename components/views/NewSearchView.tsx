'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import { MapPin, Sliders } from '@phosphor-icons/react';
import { 
  LOOKING_FOR_OPTIONS, 
  SEXUAL_ORIENTATION_OPTIONS, 
  PETS_OPTIONS, 
  DRINKING_OPTIONS 
} from './constants/profileFormOptions';

export default function NewSearchView() {
  const router = useRouter();
  const [ageRange, setAgeRange] = useState(45);
  const [distance, setDistance] = useState(50);
  const [selectedInterests, setSelectedInterests] = useState(new Set(['Podróże']));
  const [selectedLookingFor, setSelectedLookingFor] = useState<Set<string>>(new Set());
  const [selectedOrientation, setSelectedOrientation] = useState<Set<string>>(new Set());
  const [selectedPets, setSelectedPets] = useState<Set<string>>(new Set());
  const [selectedDrinking, setSelectedDrinking] = useState<Set<string>>(new Set());

  const profiles = [
    {
      id: '1',
      name: 'Anna',
      age: 25,
      city: 'Warszawa',
      distance: 12,
      image_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80',
      matchScore: 91,
      looking_for: 'miłość',
    },
    {
      id: '2',
      name: 'Kamil',
      age: 30,
      city: 'Kraków',
      distance: 4,
      image_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80',
      matchScore: 88,
      looking_for: 'przygoda',
    },
  ];

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Panel */}
        <aside className="lg:col-span-1 glass rounded-3xl p-6 h-fit sticky top-28">
          <h2 className="text-2xl font-light text-white mb-6 flex items-center gap-2">
            <Sliders size={20} weight="duotone" className="text-cyan-400" /> Filtry
          </h2>

          <div className="space-y-6">
            {/* Age */}
            <div>
              <div className="flex justify-between text-sm text-cyan-400 mb-2">
                <label>Wiek</label>
                <span>18 - {ageRange} lat</span>
              </div>
              <input
                type="range"
                min="18"
                max="70"
                value={ageRange}
                onChange={(e) => setAgeRange(parseInt(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Distance */}
            <div>
              <div className="flex justify-between text-sm text-cyan-400 mb-2">
                <label>Odległość</label>
                <span>do {distance} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                className="w-full accent-fuchsia-400 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Interests */}
            <div>
              <label className="text-sm text-cyan-400 mb-3 block">Zainteresowania</label>
              <div className="flex flex-wrap gap-2">
                {['Podróże', 'Kino', 'Sport', 'Muzyka', 'Książki'].map((interest) => (
                  <button
                    key={interest}
                    onClick={() => {
                      const newSet = new Set(selectedInterests);
                      if (newSet.has(interest)) newSet.delete(interest);
                      else newSet.add(interest);
                      setSelectedInterests(newSet);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedInterests.has(interest)
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-white shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                        : 'bg-white/10 border border-cyan-500/20 text-cyan-300 hover:border-cyan-500/30'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Looking For */}
            <div>
              <label className="text-sm text-cyan-400 mb-3 block">Czego szukają</label>
              <div className="flex flex-wrap gap-2">
                {LOOKING_FOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newSet = new Set(selectedLookingFor);
                      if (newSet.has(option.value)) newSet.delete(option.value);
                      else newSet.add(option.value);
                      setSelectedLookingFor(newSet);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedLookingFor.has(option.value)
                        ? 'bg-fuchsia-500/20 border border-fuchsia-500/50 text-white shadow-[0_0_10px_rgba(255,0,255,0.2)]'
                        : 'bg-white/10 border border-fuchsia-500/20 text-fuchsia-300 hover:border-fuchsia-500/30'
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sexual Orientation */}
            <div>
              <label className="text-sm text-cyan-400 mb-3 block">Orientacja</label>
              <div className="flex flex-wrap gap-2">
                {SEXUAL_ORIENTATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newSet = new Set(selectedOrientation);
                      if (newSet.has(option.value)) newSet.delete(option.value);
                      else newSet.add(option.value);
                      setSelectedOrientation(newSet);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedOrientation.has(option.value)
                        ? 'bg-purple-500/20 border border-purple-500/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'bg-white/10 border border-purple-500/20 text-purple-300 hover:border-purple-500/30'
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pets */}
            <div>
              <label className="text-sm text-cyan-400 mb-3 block">Zwierzęta</label>
              <div className="flex flex-wrap gap-2">
                {PETS_OPTIONS.map((pet) => (
                  <button
                    key={pet}
                    onClick={() => {
                      const newSet = new Set(selectedPets);
                      if (newSet.has(pet)) newSet.delete(pet);
                      else newSet.add(pet);
                      setSelectedPets(newSet);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedPets.has(pet)
                        ? 'bg-green-500/20 border border-green-500/50 text-white shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                        : 'bg-white/10 border border-green-500/20 text-green-300 hover:border-green-500/30'
                    }`}
                  >
                    {pet}
                  </button>
                ))}
              </div>
            </div>

            {/* Drinking */}
            <div>
              <label className="text-sm text-cyan-400 mb-3 block">Stosunek do alkoholu</label>
              <div className="flex flex-wrap gap-2">
                {DRINKING_OPTIONS.map((drink) => (
                  <button
                    key={drink}
                    onClick={() => {
                      const newSet = new Set(selectedDrinking);
                      if (newSet.has(drink)) newSet.delete(drink);
                      else newSet.add(drink);
                      setSelectedDrinking(newSet);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedDrinking.has(drink)
                        ? 'bg-amber-500/20 border border-amber-500/50 text-white shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-white/10 border border-amber-500/20 text-amber-300 hover:border-amber-500/30'
                    }`}
                  >
                    {drink}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              Zastosuj filtry
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="mb-6 flex justify-between items-center">
            <p className="text-cyan-300 font-light">
              Znaleziono <span className="text-white font-medium">{profiles.length}</span> profile
            </p>
            <select className="bg-black/30 border border-cyan-500/20 rounded-xl py-2 px-4 text-sm text-white outline-none focus:border-cyan-500 transition-colors">
              <option>Najlepsze dopasowanie</option>
              <option>Najnowsze</option>
              <option>Najbliżej</option>
            </select>
          </div>

          {/* Profile Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => router.push(`/profile/${profile.id}`)}
                className="profile-card glass rounded-[2rem] overflow-hidden relative group cursor-pointer"
              >
                <div className="aspect-[3/4] w-full relative">
                  <img src={profile.image_url} alt={profile.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07050f] via-[#07050f]/40 to-transparent"></div>

                  {/* Match Badge */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-fuchsia-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,0,255,0.2)]">
                      <Sparkles className="text-fuchsia-400" size={14} />
                      <span className="text-xs font-semibold text-white">{profile.matchScore}% Match</span>
                    </div>
                    {profile.looking_for && (
                      <div className={`bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                        profile.looking_for === 'miłość' 
                          ? 'border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.2)]'
                          : profile.looking_for === 'przygoda'
                          ? 'border-cyan-500/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                          : 'border-cyan-500/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                      }`}>
                        <span className="text-xs font-semibold text-white">
                          {LOOKING_FOR_OPTIONS.find(opt => opt.value === profile.looking_for)?.emoji} {LOOKING_FOR_OPTIONS.find(opt => opt.value === profile.looking_for)?.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="absolute bottom-0 left-0 w-full p-6 z-10">
                    <div className="card-meta flex flex-col gap-2">
                      <h2 className="text-2xl font-medium text-white">
                        {profile.name}, {profile.age} lat
                      </h2>
                      <p className="text-sm text-cyan-400 flex items-center gap-1">
                        <MapPin size={14} weight="fill" /> {profile.city} • {profile.distance} km stąd
                      </p>

                      {/* Actions */}
                      <div className="card-actions flex gap-3 mt-3 relative z-30">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="pointer-events-auto flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-cyan-500/20 py-2.5 rounded-xl flex items-center justify-center gap-2 text-white transition-all hover:border-red-400/50 hover:text-red-400"
                        >
                          <Heart size={20} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push('/messages');
                          }}
                          className="pointer-events-auto flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(0,255,255,0.3)] py-2.5 rounded-xl flex items-center justify-center gap-2 text-white"
                        >
                          <MessageCircle size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

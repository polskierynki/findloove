'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ChatCircle, Sparkle, MapPin, Sliders, MagnifyingGlass, X } from '@phosphor-icons/react';
import { 
  LOOKING_FOR_OPTIONS, 
  SEXUAL_ORIENTATION_OPTIONS, 
  PETS_OPTIONS, 
  DRINKING_OPTIONS,
  POLISH_CITIES,
} from './constants/profileFormOptions';
import { supabase } from '@/lib/supabase';
import { useLikes } from '@/lib/hooks/useLikes';

// Współrzędne geograficzne polskich miast (lat, lon)
const CITY_COORDS: Record<string, [number, number]> = {
  'Warszawa':       [52.2297, 21.0122],
  'Kraków':         [50.0647, 19.9450],
  'Łódź':           [51.7592, 19.4560],
  'Wrocław':        [51.1079, 17.0385],
  'Poznań':         [52.4064, 16.9252],
  'Gdańsk':         [54.3520, 18.6466],
  'Szczecin':       [53.4285, 14.5528],
  'Bydgoszcz':      [53.1235, 18.0084],
  'Lublin':         [51.2465, 22.5684],
  'Białystok':      [53.1325, 23.1688],
  'Katowice':       [50.2599, 19.0216],
  'Gdynia':         [54.5189, 18.5305],
  'Częstochowa':    [50.8118, 19.1203],
  'Radom':          [51.4027, 21.1471],
  'Sosnowiec':      [50.2863, 19.1042],
  'Toruń':          [53.0138, 18.5981],
  'Kielce':         [50.8661, 20.6286],
  'Rzeszów':        [50.0412, 21.9991],
  'Gliwice':        [50.2945, 18.6714],
  'Zabrze':         [50.3249, 18.7857],
  'Olsztyn':        [53.7784, 20.4801],
  'Bielsko-Biała':  [49.8224, 19.0444],
  'Bytom':          [50.3484, 18.9076],
  'Zielona Góra':   [51.9356, 15.5062],
  'Rybnik':         [50.0968, 18.5413],
  'Ruda Śląska':    [50.2595, 18.8563],
  'Tychy':          [50.1333, 18.9833],
  'Opole':          [50.6667, 17.9333],
  'Gorzów Wielkopolski': [52.7368, 15.2288],
  'Dąbrowa Górnicza':    [50.3224, 19.1874],
  'Elbląg':         [54.1522, 19.4044],
  'Płock':          [52.5463, 19.7065],
  'Wałbrzych':      [50.7714, 16.2845],
  'Włocławek':      [52.6483, 19.0677],
  'Tarnów':         [50.0121, 20.9858],
  'Chorzów':        [50.2969, 18.9541],
};

const HIDDEN_ADMIN_EMAILS = new Set([
  'lio1985lodz@gmail.com',
]);

function isHiddenAdminProfile(profile: { role?: string | null; email?: string | null }): boolean {
  const normalizedRole = (profile.role || '').trim().toLowerCase();
  const normalizedEmail = (profile.email || '').trim().toLowerCase();

  return (
    normalizedRole === 'admin' ||
    normalizedRole === 'super_admin' ||
    HIDDEN_ADMIN_EMAILS.has(normalizedEmail)
  );
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type GeoCoords = { lat: number; lon: number };

function distanceFromPointToCity(point: GeoCoords, city: string): number | null {
  const cityCoords = CITY_COORDS[city];
  if (!cityCoords) return null;
  return Math.round(haversineKm(point.lat, point.lon, cityCoords[0], cityCoords[1]));
}

type SearchProfile = {
  id: string;
  name: string;
  age: number;
  city: string;
  image_url: string;
  looking_for?: string;
  interests?: string[];
  drinking?: string;
  pets?: string;
  sexual_orientation?: string;
  created_at?: string;
  is_blocked?: boolean;
  role?: string | null;
  email?: string | null;
  distanceKm?: number | null;
  matchScore?: number;
};

type SearchSort = 'match' | 'closest' | 'newest' | 'ageAsc' | 'ageDesc';

function calculateMatchScore(
  profile: SearchProfile,
  params: {
    ageMin: number;
    ageMax: number;
    distanceLimit: number;
    selectedLookingFor: Set<string>;
    selectedOrientation: Set<string>;
    selectedPets: Set<string>;
    selectedDrinking: Set<string>;
  },
): number {
  let score = 45;

  // Age alignment around selected age center.
  const ageCenter = (params.ageMin + params.ageMax) / 2;
  const ageRadius = Math.max(1, (params.ageMax - params.ageMin) / 2);
  const ageDelta = Math.abs(profile.age - ageCenter);
  const ageFactor = Math.max(0, 1 - ageDelta / ageRadius);
  score += Math.round(ageFactor * 20);

  if (params.selectedLookingFor.size > 0 && profile.looking_for && params.selectedLookingFor.has(profile.looking_for)) {
    score += 12;
  }

  if (
    params.selectedOrientation.size > 0 &&
    profile.sexual_orientation &&
    params.selectedOrientation.has(profile.sexual_orientation)
  ) {
    score += 8;
  }

  if (params.selectedPets.size > 0 && profile.pets && params.selectedPets.has(profile.pets)) {
    score += 7;
  }

  if (params.selectedDrinking.size > 0 && profile.drinking && params.selectedDrinking.has(profile.drinking)) {
    score += 8;
  }

  if (profile.distanceKm !== null && profile.distanceKm !== undefined) {
    const distanceFactor = Math.max(0, 1 - profile.distanceKm / Math.max(params.distanceLimit, 50));
    score += Math.round(distanceFactor * 15);
  }

  return Math.min(99, Math.max(30, score));
}

export default function NewSearchView() {
  const router = useRouter();
  const { likeProfile, unlikeProfile, getLikedProfileIds } = useLikes();

  // Filters
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(80);
  const [distance, setDistance] = useState(200);
  const [baseCity, setBaseCity] = useState('');
  const [sortBy, setSortBy] = useState<SearchSort>('match');
  const [selectedLookingFor, setSelectedLookingFor] = useState<Set<string>>(new Set());
  const [selectedOrientation, setSelectedOrientation] = useState<Set<string>>(new Set());
  const [selectedPets, setSelectedPets] = useState<Set<string>>(new Set());
  const [selectedDrinking, setSelectedDrinking] = useState<Set<string>>(new Set());

  // Data
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoCoords, setGeoCoords] = useState<GeoCoords | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const detectMyLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError('Twoja przeglądarka nie wspiera geolokalizacji.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setGeoError('Brak zgody na lokalizację. Wybierz miasto ręcznie.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, []);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Pre-load liked IDs
  useEffect(() => {
    getLikedProfileIds().then((ids) => setLikedIds(new Set(ids)));
  }, [getLikedProfileIds]);

  // Try to get precise user location once (fallback to selected city when unavailable)
  useEffect(() => {
    detectMyLocation();
  }, [detectMyLocation]);

  // Fetch real profiles
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, name, age, city, image_url, looking_for, interests, drinking, pets, sexual_orientation, created_at, is_blocked, role, email')
        .order('created_at', { ascending: false });

      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }
      // Age filter
      query = query.gte('age', ageMin).lte('age', ageMax);

      // Looking for filter
      if (selectedLookingFor.size > 0) {
        query = query.in('looking_for', Array.from(selectedLookingFor));
      }

      // Sexual orientation filter
      if (selectedOrientation.size > 0) {
        query = query.in('sexual_orientation', Array.from(selectedOrientation));
      }

      // Pets filter
      if (selectedPets.size > 0) {
        query = query.in('pets', Array.from(selectedPets));
      }

      // Drinking filter
      if (selectedDrinking.size > 0) {
        query = query.in('drinking', Array.from(selectedDrinking));
      }

      const { data, error } = await query;
      if (error) throw error;

      const cityCoords = baseCity ? CITY_COORDS[baseCity] : null;
      const referencePoint: GeoCoords | null = cityCoords
        ? { lat: cityCoords[0], lon: cityCoords[1] }
        : geoCoords;

      let results = ((data || []) as SearchProfile[])
        .filter((profile) => !profile.is_blocked)
        .filter((profile) => !isHiddenAdminProfile(profile))
        .map((profile) => ({
          ...profile,
          distanceKm: referencePoint ? distanceFromPointToCity(referencePoint, profile.city) : null,
        }));

      // Distance filter, based on selected city or current GPS
      if (referencePoint && distance < 500) {
        results = results.filter((p) => {
          if (baseCity && p.city === baseCity) return true;
          if (p.distanceKm === null) return true;
          return p.distanceKm <= distance;
        });
      }

      results = results.map((profile) => ({
        ...profile,
        matchScore: calculateMatchScore(profile, {
          ageMin,
          ageMax,
          distanceLimit: distance,
          selectedLookingFor,
          selectedOrientation,
          selectedPets,
          selectedDrinking,
        }),
      }));

      // Sort client-side
      results.sort((a, b) => {
        if (sortBy === 'match') {
          const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0);
          if (scoreDiff !== 0) return scoreDiff;

          const aDist = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
          const bDist = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
          return aDist - bDist;
        }

        if (sortBy === 'newest') {
          return Date.parse(b.created_at || '') - Date.parse(a.created_at || '');
        }

        if (sortBy === 'ageAsc') {
          return a.age - b.age;
        }

        if (sortBy === 'ageDesc') {
          return b.age - a.age;
        }

        const aDist = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const bDist = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        return aDist - bDist;
      });

      setProfiles(results);
    } catch (err) {
      console.error('Blad wyszukiwania profili:', err);
    } finally {
      setLoading(false);
    }
  }, [
    ageMin,
    ageMax,
    baseCity,
    currentUserId,
    distance,
    geoCoords,
    selectedDrinking,
    selectedLookingFor,
    selectedOrientation,
    selectedPets,
    sortBy,
  ]);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  const handleApplyFilters = () => {
    void fetchProfiles();
  };

  const toggleLike = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    const wasLiked = likedIds.has(profileId);
    setLikedIds((prev) => {
      const s = new Set(prev);
      if (wasLiked) s.delete(profileId); else s.add(profileId);
      return s;
    });
    try {
      if (wasLiked) await unlikeProfile(profileId);
      else await likeProfile(profileId);
    } catch {
      setLikedIds((prev) => {
        const s = new Set(prev);
        if (wasLiked) s.add(profileId); else s.delete(profileId);
        return s;
      });
    }
  };

  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const s = new Set(set);
    if (s.has(value)) s.delete(value); else s.add(value);
    return s;
  };

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Panel */}
        <aside className="lg:col-span-1 glass rounded-3xl p-6 h-fit sticky top-28">
          <h2 className="text-2xl font-light text-white mb-6 flex items-center gap-2">
            <Sliders size={20} weight="duotone" className="text-cyan-400" /> Filtry
          </h2>

          <div className="space-y-6">
            {/* Age range */}
            <div>
              <div className="flex justify-between text-sm text-cyan-400 mb-2">
                <label>Wiek</label>
                <span>{ageMin} – {ageMax} lat</span>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min="18"
                  max={ageMax}
                  value={ageMin}
                  onChange={(e) => setAgeMin(Math.min(parseInt(e.target.value) || 18, ageMax))}
                  className="w-16 bg-black/30 border border-white/10 rounded-lg py-1.5 px-2 text-white text-sm outline-none text-center focus:border-cyan-500/50 transition-colors"
                />
                <input
                  type="range"
                  min="18"
                  max="100"
                  value={ageMax}
                  onChange={(e) => setAgeMax(Math.max(parseInt(e.target.value), ageMin))}
                  className="flex-1 accent-cyan-400 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  min={ageMin}
                  max="100"
                  value={ageMax}
                  onChange={(e) => setAgeMax(Math.max(parseInt(e.target.value) || 80, ageMin))}
                  className="w-16 bg-black/30 border border-white/10 rounded-lg py-1.5 px-2 text-white text-sm outline-none text-center focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="text-sm text-cyan-400 mb-2 block flex items-center gap-1.5">
                <MapPin size={14} weight="fill" /> Miasto (punkt odniesienia)
              </label>
              <div className="relative">
                <select
                  value={baseCity}
                  onChange={(e) => setBaseCity(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-colors appearance-none"
                >
                  <option value="">Wszystkie miasta</option>
                  {POLISH_CITIES.map((c) => (
                    <option key={c} value={c} className="bg-gray-900">{c}</option>
                  ))}
                </select>
                {baseCity && (
                  <button
                    onClick={() => setBaseCity('')}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-cyan-300/60">
                  {baseCity
                    ? 'Odległość liczona od wybranego miasta'
                    : geoCoords
                    ? 'Odległość liczona od Twojej lokalizacji GPS'
                    : 'Brak lokalizacji GPS - wybierz miasto'}
                </span>
                <button
                  onClick={detectMyLocation}
                  disabled={isLocating}
                  className="text-[11px] text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
                >
                  {isLocating ? 'Lokalizuję...' : 'Użyj GPS'}
                </button>
              </div>
              {geoError && !baseCity && (
                <p className="mt-1 text-[11px] text-amber-300/80">{geoError}</p>
              )}
            </div>

            {/* Distance (only meaningful when city selected) */}
            <div className={baseCity || geoCoords ? '' : 'opacity-40 pointer-events-none'}>
              <div className="flex justify-between text-sm text-cyan-400 mb-2">
                <label>Zakres kilometrów</label>
                <span>{distance >= 500 ? 'Cała Polska' : `do ${distance} km`}</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                className="w-full accent-fuchsia-400 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>10 km</span><span>Cała Polska</span>
              </div>
            </div>

            {/* Looking For */}
            <div>
              <label className="text-sm text-cyan-400 mb-3 block">Czego szukają</label>
              <div className="flex flex-wrap gap-2">
                {LOOKING_FOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedLookingFor(toggleSet(selectedLookingFor, option.value))}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedLookingFor.has(option.value)
                        ? 'bg-fuchsia-500/20 border border-fuchsia-500/50 text-white shadow-[0_0_10px_rgba(255,0,255,0.2)]'
                        : 'bg-white/10 border border-fuchsia-500/20 text-fuchsia-300 hover:border-fuchsia-500/30'
                    }`}
                  >
                    {option.label}
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
                    onClick={() => setSelectedOrientation(toggleSet(selectedOrientation, option.value))}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedOrientation.has(option.value)
                        ? 'bg-purple-500/20 border border-purple-500/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'bg-white/10 border border-purple-500/20 text-purple-300 hover:border-purple-500/30'
                    }`}
                  >
                    {option.label}
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
                    onClick={() => setSelectedPets(toggleSet(selectedPets, pet))}
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
                    onClick={() => setSelectedDrinking(toggleSet(selectedDrinking, drink))}
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

            <button
              onClick={handleApplyFilters}
              className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)] flex items-center justify-center gap-2"
            >
              <MagnifyingGlass size={16} weight="bold" /> Szukaj
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="mb-6 flex justify-between items-center">
            <p className="text-cyan-300 font-light">
              {loading
                ? 'Szukam...'
                : <>Znaleziono <span className="text-white font-medium">{profiles.length}</span> {profiles.length === 1 ? 'profil' : profiles.length < 5 ? 'profile' : 'profili'}</>
              }
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SearchSort)}
              className="bg-black/30 border border-cyan-500/20 rounded-xl py-2 px-4 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="match">Najlepsze dopasowanie</option>
              <option value="closest">Najbliżej</option>
              <option value="newest">Najnowsze</option>
              <option value="ageAsc">Wiek: od najmłodszych</option>
              <option value="ageDesc">Wiek: od najstarszych</option>
            </select>
          </div>

          {/* Profile Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-cyan-400 text-lg">Ładowanie...</div>
          ) : profiles.length === 0 ? (
            <div className="glass rounded-[2rem] p-16 text-center space-y-4 border border-white/10">
              <MagnifyingGlass size={48} className="mx-auto text-cyan-400 opacity-40" />
              <p className="text-white text-xl font-light">Brak wyników dla tych filtrów</p>
              <p className="text-cyan-300/60 text-sm">Spróbuj rozszerzyć zakres wieku, zmień miasto lub usuń niektóre filtry.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {profiles.map((profile) => {
                const distFromBase = profile.distanceKm ?? null;
                const isLiked = likedIds.has(profile.id);
                return (
                  <div
                    key={profile.id}
                    onClick={() => router.push(`/profile/${profile.id}`)}
                    className="profile-card glass rounded-[2rem] overflow-hidden relative group cursor-pointer"
                  >
                    <div className="aspect-[3/4] w-full relative">
                      <img
                        src={profile.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=0d0d1a&color=00ffff&size=400`}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07050f] via-[#07050f]/40 to-transparent"></div>

                      {/* Top badges */}
                      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                        <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-fuchsia-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,0,255,0.2)]">
                          <Sparkle className="text-fuchsia-400" size={14} weight="fill" />
                          <span className="text-xs font-semibold text-white">{profile.matchScore || 0}% Match</span>
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
                              {LOOKING_FOR_OPTIONS.find(opt => opt.value === profile.looking_for)?.label}
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
                            <MapPin size={14} weight="fill" />
                            {profile.city}
                            {(baseCity || geoCoords) && distFromBase !== null && (
                              <span className="text-cyan-400/60"> • {distFromBase} km stąd</span>
                            )}
                            {baseCity && profile.city === baseCity && (
                              <span className="text-green-400/80"> • to miasto</span>
                            )}
                          </p>

                          {/* Actions */}
                          <div className="card-actions flex gap-3 mt-3 relative z-30">
                            <button
                              onClick={(e) => void toggleLike(e, profile.id)}
                              className={`pointer-events-auto flex-1 backdrop-blur-md border py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                                isLiked
                                  ? 'bg-red-500/20 border-red-400/50 text-red-400'
                                  : 'bg-white/10 border-cyan-500/20 text-white hover:border-red-400/50 hover:text-red-400'
                              }`}
                            >
                              <Heart size={20} weight={isLiked ? 'fill' : 'regular'} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/messages?user=${encodeURIComponent(profile.id)}`);
                              }}
                              className="pointer-events-auto flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(0,255,255,0.3)] py-2.5 rounded-xl flex items-center justify-center gap-2 text-white"
                            >
                              <ChatCircle size={20} weight="fill" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


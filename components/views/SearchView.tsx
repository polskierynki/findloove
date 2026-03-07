'use client';

import Image from 'next/image';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, ShieldCheck, SlidersHorizontal, X, ChevronLeft, Check, Lock } from 'lucide-react';
import { Profile, LookingForCategory, LOOKING_FOR_OPTIONS, getLookingFor, filterNonAdminProfiles } from '@/lib/types';

interface SearchViewProps {
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
  onBack: () => void;
  initialLookingFor?: LookingForCategory;
  guestRestrictions?: {
    isRestricted: boolean;
    shouldBlurPhoto: (index: number, total: number) => boolean;
    getVisibleProfilesLimit: () => number;
    canViewFullProfile: () => boolean;
  };
}

const ALL_INTERESTS = [
  'Ogrodnictwo', 'Teatr', 'Literatura', 'Podróże', 'Muzyka', 'Szachy',
  'Historia', 'Las', 'Majsterkowanie', 'Morze', 'Gotowanie', 'Krzyżówki',
  'Taniec', 'Sport', 'Kino', 'Koty',
];

const SMOKING_OPTIONS = ['Dowolnie', 'Niepalący/a', 'Okazyjnie', 'Palący/a'];
const CHILDREN_OPTIONS = ['Dowolnie', 'Bezdzietny/a', 'Mam dzieci', 'Mam wnuki'];
const RADIUS_OPTIONS = [0, 20, 50, 100, 200] as const;
type RadiusOption = typeof RADIUS_OPTIONS[number];

// Współrzędne polskich miast [lat, lng]
const CITY_COORDS: Record<string, [number, number]> = {
  'Warszawa':      [52.2297, 21.0122],
  'Kraków':        [50.0647, 19.9450],
  'Łódź':          [51.7592, 19.4560],
  'Wrocław':       [51.1079, 17.0385],
  'Poznań':        [52.4064, 16.9252],
  'Gdańsk':        [54.3520, 18.6466],
  'Szczecin':      [53.4285, 14.5528],
  'Bydgoszcz':     [53.1235, 18.0084],
  'Lublin':        [51.2465, 22.5684],
  'Katowice':      [50.2649, 19.0238],
  'Białystok':     [53.1325, 23.1688],
  'Gdynia':        [54.5189, 18.5305],
  'Częstochowa':   [50.8118, 19.1203],
  'Radom':         [51.4027, 21.1471],
  'Sosnowiec':     [50.2863, 19.1041],
  'Toruń':         [53.0138, 18.5981],
  'Kielce':        [50.8661, 20.6286],
  'Rzeszów':       [50.0412, 21.9991],
  'Gliwice':       [50.2945, 18.6714],
  'Zabrze':        [50.3249, 18.7857],
  'Olsztyn':       [53.7784, 20.4801],
  'Bielsko-Biała': [49.8224, 19.0444],
  'Bytom':         [50.3484, 18.9179],
  'Zielona Góra':  [51.9356, 15.5063],
  'Rybnik':        [50.0971, 18.5437],
  'Ruda Śląska':   [50.2577, 18.8563],
  'Opole':         [50.6751, 17.9213],
  'Tychy':         [50.1272, 18.9966],
  'Gorzów Wielkopolski': [52.7368, 15.2288],
  'Elbląg':        [54.1564, 19.4049],
  'Płock':         [52.5463, 19.7065],
  'Dąbrowa Górnicza': [50.3226, 19.1892],
  'Wałbrzych':     [50.7841, 16.2844],
  'Włocławek':     [52.6483, 19.0677],
  'Tarnów':        [50.0121, 20.9858],
  'Chorzów':       [50.2976, 18.9540],
};

const ALL_CITY_NAMES = Object.keys(CITY_COORDS).sort((a, b) => a.localeCompare(b, 'pl'));

// Odległość Haversine w km
function haversineKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
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

// Zwraca zbiór miast w promieniu (włącznie z centrum)
function citiesInRadius(center: string, radiusKm: number): Set<string> {
  const set = new Set<string>();
  const centerCoord = CITY_COORDS[center];
  if (!centerCoord) return set;
  for (const [name, coord] of Object.entries(CITY_COORDS)) {
    if (haversineKm(centerCoord, coord) <= radiusKm) set.add(name);
  }
  return set;
}

type SortOption = 'match' | 'age_asc' | 'age_desc' | 'name';

export default function SearchView({ profiles, onSelectProfile, onBack, initialLookingFor, guestRestrictions }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [ageMin, setAgeMin] = useState(55);
  const [ageMax, setAgeMax] = useState(85);
  const [cityInput, setCityInput] = useState('');
  const [citySelected, setCitySelected] = useState('');
  const [radius, setRadius] = useState<RadiusOption>(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [smokingFilter, setSmokingFilter] = useState('Dowolnie');
  const [childrenFilter, setChildrenFilter] = useState('Dowolnie');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [showFilters, setShowFilters] = useState(false);
  const [lookingFor, setLookingFor] = useState<LookingForCategory | null>(initialLookingFor ?? null);
  const [orientationFilter, setOrientationFilter] = useState<string | null>(null); // 'KM'|'KK'|'MK'|'MM'

  const cityInputRef = useRef<HTMLDivElement>(null);

  // Zamknij sugestie po kliknięciu poza
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => {
    if (!cityInput.trim()) return ALL_CITY_NAMES.slice(0, 8);
    const q = cityInput.toLowerCase();
    return ALL_CITY_NAMES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [cityInput]);

  const selectCity = (name: string) => {
    setCityInput(name);
    setCitySelected(name);
    setShowSuggestions(false);
  };

  const clearCity = () => {
    setCityInput('');
    setCitySelected('');
    setRadius(0);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const resetFilters = () => {
    setQuery('');
    setAgeMin(55);
    setAgeMax(85);
    clearCity();
    setSelectedInterests([]);
    setSmokingFilter('Dowolnie');
    setChildrenFilter('Dowolnie');
    setVerifiedOnly(false);
    setSortBy('match');
    setLookingFor(null);
    setOrientationFilter(null);
  };

  const activeFilterCount = [
    citySelected !== '',
    selectedInterests.length > 0,
    smokingFilter !== 'Dowolnie',
    childrenFilter !== 'Dowolnie',
    verifiedOnly,
    ageMin !== 55 || ageMax !== 85,
    lookingFor !== null,
    orientationFilter !== null,
  ].filter(Boolean).length;

  // Zestaw miast pasujących do filtra lokalizacji
  const allowedCities = useMemo<Set<string> | null>(() => {
    if (!citySelected) return null;
    if (radius === 0) return new Set([citySelected]);
    return citiesInRadius(citySelected, radius);
  }, [citySelected, radius]);

  const results = useMemo(() => {
    // Wykluczamy konta techniczne (adminy) z wyników wyszukiwania
    let list = filterNonAdminProfiles(profiles);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.bio?.toLowerCase().includes(q) ||
          p.interests.some((i) => i.toLowerCase().includes(q))
      );
    }

    list = list.filter((p) => p.age >= ageMin && p.age <= ageMax);

    if (allowedCities) {
      list = list.filter((p) => allowedCities.has(p.city));
    }

    if (selectedInterests.length > 0) {
      list = list.filter((p) => selectedInterests.every((i) => p.interests.includes(i)));
    }

    if (smokingFilter !== 'Dowolnie') {
      list = list.filter((p) =>
        p.details.smoking.toLowerCase().includes(smokingFilter.toLowerCase().slice(0, 5))
      );
    }

    if (childrenFilter !== 'Dowolnie') {
      list = list.filter((p) =>
        p.details.children.toLowerCase().includes(childrenFilter.toLowerCase().slice(0, 5))
      );
    }

    if (verifiedOnly) list = list.filter((p) => p.isVerified);

    if (lookingFor !== null) {
      list = list.filter((p) => getLookingFor(p.status) === lookingFor);
    }

    if (orientationFilter !== null) {
      const gCode = orientationFilter[0];
      const sCode = orientationFilter[1];
      list = list.filter((p) => {
        if (p.gender && p.seeking_gender) {
          return p.gender === gCode && p.seeking_gender === sCode;
        }
        return true; // profiles without gender set are not excluded
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'age_asc') return a.age - b.age;
      if (sortBy === 'age_desc') return b.age - a.age;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'pl');
      return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
    });

    return list;
  }, [profiles, query, ageMin, ageMax, allowedCities, selectedInterests, smokingFilter, childrenFilter, verifiedOnly, lookingFor, orientationFilter, sortBy]);
  
  // Limit results for guest users
  const visibleLimit = guestRestrictions?.getVisibleProfilesLimit() || 999;
  const limitedResults = results.slice(0, visibleLimit);

  return (
    <div className="pb-16 animate-in fade-in duration-400">
      {/* Nagłówek */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-800">Szukaj profili</h1>
      </div>

      {/* Orientacja — zawsze widoczne chipy */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Kto kogo szuka</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'MK', label: 'Pan pozna Panią',   emoji: '👨‍❤️‍👩' },
            { id: 'KM', label: 'Pani pozna Pana',   emoji: '👩‍❤️‍👨' },
            { id: 'KK', label: 'Pani pozna Panią',  emoji: '👩‍❤️‍👩' },
            { id: 'MM', label: 'Pan pozna Pana',    emoji: '👨‍❤️‍👨' },
          ].map((opt) => {
            const active = orientationFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setOrientationFilter(active ? null : opt.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border font-semibold text-sm transition-all shadow-sm ${
                  active
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50'
                }`}
              >
                <span className="text-base">{opt.emoji}</span>
                <span className="text-xs leading-tight">{opt.label}</span>
                {active && <Check size={14} className="ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Czego szukasz — zawsze widoczne chipy */}
      <div className="flex gap-2 mb-4">
        {LOOKING_FOR_OPTIONS.map((opt) => {
          const colorMap: Record<string, string> = {
            rose:   'bg-rose-500 text-white border-rose-500',
            amber:  'bg-amber-500 text-white border-amber-500',
            violet: 'bg-violet-500 text-white border-violet-500',
          };
          const inactiveMap: Record<string, string> = {
            rose:   'bg-white text-rose-600 border-rose-200 hover:bg-rose-50',
            amber:  'bg-white text-amber-600 border-amber-200 hover:bg-amber-50',
            violet: 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50',
          };
          const active = lookingFor === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setLookingFor(active ? null : opt.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border font-semibold text-sm transition-all shadow-sm ${
                active ? colorMap[opt.color] : inactiveMap[opt.color]
              }`}
            >
              <span>{opt.emoji}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Wyszukiwarka */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Imię, zainteresowanie, bio…"
            className="flex-1 bg-transparent text-sm outline-none text-slate-800 placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all shadow-sm ${
            showFilters || activeFilterCount > 0
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
          }`}
        >
          <SlidersHorizontal size={16} />
          Filtry
          {activeFilterCount > 0 && (
            <span className="bg-white text-rose-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel filtrów */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm space-y-5">

          {/* Wiek */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
              Wiek: {ageMin}–{ageMax} lat
            </label>
            <div className="flex gap-3 items-center">
              <span className="text-xs text-slate-400 w-8">{ageMin}</span>
              <input
                type="range" min={50} max={ageMax} value={ageMin}
                onChange={(e) => setAgeMin(Number(e.target.value))}
                className="flex-1 accent-rose-500"
              />
              <input
                type="range" min={ageMin} max={100} value={ageMax}
                onChange={(e) => setAgeMax(Number(e.target.value))}
                className="flex-1 accent-rose-500"
              />
              <span className="text-xs text-slate-400 w-8 text-right">{ageMax}</span>
            </div>
          </div>

          {/* Lokalizacja */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
              Lokalizacja
            </label>

            {/* Input z podpowiedziami */}
            <div className="relative" ref={cityInputRef}>
              <div className={`flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2.5 transition-all ${
                showSuggestions ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
              }`}>
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <input
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setCitySelected('');
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Wpisz miasto…"
                  className="flex-1 bg-transparent text-sm outline-none text-slate-800 placeholder:text-slate-400"
                />
                {cityInput && (
                  <button onClick={clearCity} className="text-slate-400 hover:text-slate-600 shrink-0">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Dropdown sugestii */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden max-h-52 overflow-y-auto">
                  {suggestions.map((c) => (
                    <button
                      key={c}
                      onMouseDown={(e) => { e.preventDefault(); selectCity(c); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-rose-50 transition-colors ${
                        citySelected === c ? 'bg-rose-50 text-rose-600 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      {c}
                      {CITY_COORDS[c] && citySelected && citySelected !== c && CITY_COORDS[citySelected] && (
                        <span className="ml-auto text-[10px] text-slate-400">
                          ~{Math.round(haversineKm(CITY_COORDS[citySelected], CITY_COORDS[c]))} km
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Promień — pokazuje się gdy wybrano miasto */}
            {citySelected && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-2">
                  Pokaż profile z <span className="font-semibold text-slate-700">{citySelected}</span> i okolic:
                </p>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        radius === r
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      {r === 0 ? 'Tylko to miasto' : `+${r} km`}
                    </button>
                  ))}
                </div>
                {radius > 0 && allowedCities && allowedCities.size > 1 && (
                  <p className="text-[10px] text-slate-400 mt-2">
                    Obejmuje: {[...allowedCities].sort((a, b) => a.localeCompare(b, 'pl')).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Zainteresowania */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
              Zainteresowania {selectedInterests.length > 0 && `(${selectedInterests.length} wybrane)`}
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedInterests.includes(interest)
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Palenie + Dzieci */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">Palenie</label>
              <div className="flex flex-wrap gap-2">
                {SMOKING_OPTIONS.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSmokingFilter(o)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      smokingFilter === o
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">Dzieci</label>
              <div className="flex flex-wrap gap-2">
                {CHILDREN_OPTIONS.map((o) => (
                  <button
                    key={o}
                    onClick={() => setChildrenFilter(o)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      childrenFilter === o
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Zweryfikowani */}
          <div className="flex items-center justify-between py-1">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-500" />
              Tylko zweryfikowane profile
            </label>
            <button
              onClick={() => setVerifiedOnly((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                verifiedOnly ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  verifiedOnly ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-500 transition-colors"
            >
              <X size={12} /> Wyczyść wszystkie filtry
            </button>
          )}
        </div>
      )}

      {/* Sortowanie + liczba */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-500">
          <p>
            <span className="font-bold text-slate-800">{limitedResults.length}</span>{' '}
            {limitedResults.length === 1 ? 'profil' : limitedResults.length < 5 ? 'profile' : 'profili'}
          </p>
          {guestRestrictions?.isRestricted && results.length > limitedResults.length && (
            <p className="text-xs text-rose-500 mt-0.5">
              Zarejestruj się, aby zobaczyć wszystkie {results.length} profili
            </p>
          )}
          {citySelected && (
            <span className="text-slate-400">
              {' '}· {citySelected}{radius > 0 ? ` +${radius} km` : ''}
            </span>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 outline-none focus:border-rose-300 cursor-pointer"
        >
          <option value="match">Najlepsze dopasowanie</option>
          <option value="age_asc">Wiek: rosnąco</option>
          <option value="age_desc">Wiek: malejąco</option>
          <option value="name">Alfabetycznie</option>
        </select>
      </div>

      {/* Wyniki */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="text-5xl">🔍</div>
          <h3 className="font-bold text-slate-700">Brak wyników</h3>
          <p className="text-sm text-slate-400 max-w-xs">
            Spróbuj zmienić filtry, zwiększyć promień lub poszukaj po innym mieście.
          </p>
          <button onClick={resetFilters} className="mt-2 text-rose-500 text-sm font-semibold hover:underline">
            Wyczyść filtry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {limitedResults.map((profile, index) => (
            <button
              key={profile.id}
              onClick={() => onSelectProfile(profile)}
              className="group bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={profile.image}
                  alt={profile.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    guestRestrictions?.shouldBlurPhoto(index, limitedResults.length) ? 'blur-md' : ''
                  }`}
                />
                {/* Lock overlay for blurred photos */}
                {guestRestrictions?.shouldBlurPhoto(index, limitedResults.length) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg">
                      <Lock size={20} className="text-rose-500" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {profile.isVerified && (
                  <span className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={9} /> Zweryfikowany
                  </span>
                )}
                {/* Odległość od wybranego centrum */}
                {citySelected && CITY_COORDS[citySelected] && CITY_COORDS[profile.city] && profile.city !== citySelected && (
                  <span className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    ~{Math.round(haversineKm(CITY_COORDS[citySelected], CITY_COORDS[profile.city]))} km
                  </span>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-bold text-base leading-tight">
                    {profile.name}, {profile.age} l.
                  </h3>
                  <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {profile.city}
                  </p>
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="text-xs text-slate-500 line-clamp-2 mb-2.5">{profile.bio}</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.slice(0, 3).map((interest) => (
                    <span
                      key={interest}
                      className="bg-rose-50 text-rose-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-rose-100"
                    >
                      {interest}
                    </span>
                  ))}
                  {profile.interests.length > 3 && (
                    <span className="text-[10px] text-slate-400 self-center">
                      +{profile.interests.length - 3}
                    </span>
                  )}
                </div>
                {profile.status && (
                  <p className="text-[10px] text-slate-400 mt-2 italic">{profile.status}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

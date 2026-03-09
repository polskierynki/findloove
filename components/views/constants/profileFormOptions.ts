import type { Icon } from '@phosphor-icons/react';
import {
  GenderFemale,
  GenderMale,
  MapPin,
  Briefcase,
  Cigarette,
  Users,
  BookOpen,
  MaskHappy,
  Airplane,
  MusicNotes,
  ForkKnife,
  User,
  Basketball,
  FilmSlate,
  Camera,
  Target,
  Clock,
  Church,
  Fish,
  Wrench,
  Bicycle,
  Tree,
  Cat,
  Dog,
  PuzzlePiece,
  Footprints,
  YinYang,
  Heartbeat,
  Mountains,
  GameController,
  Cpu,
  Barbell,
  FlowerLotus,
  Star,
  Confetti,
  Heart,
} from '@phosphor-icons/react';

export const GENDERS = [
  { id: 'K', label: 'Kobieta', emoji: '♀', icon: GenderFemale },
  { id: 'M', label: 'Mężczyzna', emoji: '♂', icon: GenderMale },
];

export const ORIENTATION_OPTIONS: Record<string, { id: string; label: string; emoji: string; seeking: string }[]> = {
  K: [
    { id: 'KM', label: 'Pani pozna Pana',   emoji: '♀♂', seeking: 'M' },
    { id: 'KK', label: 'Pani pozna Panią', emoji: '♀♀', seeking: 'K' },
  ],
  M: [
    { id: 'MK', label: 'Pan pozna Panią',   emoji: '♂♀', seeking: 'K' },
    { id: 'MM', label: 'Pan pozna Pana',     emoji: '♂♂', seeking: 'M' },
  ],
};

export const POLISH_CITIES = [
  'Warszawa', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin',
  'Bydgoszcz', 'Lublin', 'Białystok', 'Katowice', 'Gdynia', 'Częstochowa',
  'Radom', 'Sosnowiec', 'Toruń', 'Kielce', 'Rzeszów', 'Gliwice', 'Zabrze',
  'Olsztyn', 'Bielsko-Biała', 'Bytom', 'Zielona Góra', 'Rybnik', 'Ruda Śląska',
  'Tychy', 'Opole', 'Gorzów Wielkopolski', 'Dąbrowa Górnicza', 'Elbląg',
  'Płock', 'Wałbrzych', 'Włocławek', 'Tarnów', 'Chorzów',
];

// Znaki zodiaku z neonowymi ikonami
export const ZODIAC_SIGNS = [
  { value: 'Baran', label: 'Baran ♈', icon: Star, color: 'text-red-400' },
  { value: 'Byk', label: 'Byk ♉', icon: Star, color: 'text-green-400' },
  { value: 'Bliźnięta', label: 'Bliźnięta ♊', icon: Star, color: 'text-yellow-400' },
  { value: 'Rak', label: 'Rak ♋', icon: Star, color: 'text-cyan-400' },
  { value: 'Lew', label: 'Lew ♌', icon: Star, color: 'text-amber-400' },
  { value: 'Panna', label: 'Panna ♍', icon: Star, color: 'text-emerald-400' },
  { value: 'Waga', label: 'Waga ♎', icon: Star, color: 'text-pink-400' },
  { value: 'Skorpion', label: 'Skorpion ♏', icon: Star, color: 'text-purple-400' },
  { value: 'Strzelec', label: 'Strzelec ♐', icon: Star, color: 'text-orange-400' },
  { value: 'Koziorożec', label: 'Koziorożec ♑', icon: Star, color: 'text-blue-400' },
  { value: 'Wodnik', label: 'Wodnik ♒', icon: Star, color: 'text-sky-400' },
  { value: 'Ryby', label: 'Ryby ♓', icon: Star, color: 'text-indigo-400' },
];

export const OCCUPATION_OPTIONS = [
  'Nauczyciel/ka', 'Lekarz/ka', 'Inżynier/ka', 'Programista/ka', 'Przedsiębiorca',
  'Prawnik/czka', 'Urzędnik/czka', 'Ksiądz/Siostra', 'Artysta/ka',
  'Muzyk', 'Rolnik/czka', 'Kierowca', 'Pielęgniarka/rz', 'Inne',
];

export const SMOKING_OPTIONS = ['Niepalący/a', 'Okazyjnie', 'Palący/a'];

export const CHILDREN_OPTIONS = [
  'Bezdzietny/a', 'Mam dzieci', 'Mam dorosłe dzieci', 'Wolę nie odpowiadać',
];

// Zainteresowania z neonowymi ikonami Phosphor
export const ALL_INTERESTS: Array<{ value: string; label: string; icon: Icon; color: string }> = [
  { value: 'Ogrodnictwo', label: 'Ogrodnictwo', icon: Tree, color: 'text-green-400' },
  { value: 'Teatr', label: 'Teatr', icon: MaskHappy, color: 'text-fuchsia-400' },
  { value: 'Literatura', label: 'Literatura', icon: BookOpen, color: 'text-cyan-400' },
  { value: 'Podróże', label: 'Podróże', icon: Airplane, color: 'text-sky-400' },
  { value: 'Muzyka', label: 'Muzyka', icon: MusicNotes, color: 'text-purple-400' },
  { value: 'Gotowanie', label: 'Gotowanie', icon: ForkKnife, color: 'text-orange-400' },
  { value: 'Taniec', label: 'Taniec', icon: User, color: 'text-pink-400' },
  { value: 'Sport', label: 'Sport', icon: Basketball, color: 'text-red-400' },
  { value: 'Kino', label: 'Kino', icon: FilmSlate, color: 'text-amber-400' },
  { value: 'Fotografia', label: 'Fotografia', icon: Camera, color: 'text-indigo-400' },
  { value: 'Szachy', label: 'Szachy', icon: Target, color: 'text-gray-400' },
  { value: 'Historia', label: 'Historia', icon: Clock, color: 'text-yellow-400' },
  { value: 'Kościół', label: 'Kościół', icon: Church, color: 'text-blue-400' },
  { value: 'Wędkarstwo', label: 'Wędkarstwo', icon: Fish, color: 'text-teal-400' },
  { value: 'Majsterkowanie', label: 'Majsterkowanie', icon: Wrench, color: 'text-slate-400' },
  { value: 'Rowerowanie', label: 'Rowerowanie', icon: Bicycle, color: 'text-lime-400' },
  { value: 'Spacery', label: 'Spacery', icon: Footprints, color: 'text-emerald-400' },
  { value: 'Koty', label: 'Koty', icon: Cat, color: 'text-orange-300' },
  { value: 'Psy', label: 'Psy', icon: Dog, color: 'text-amber-300' },
  { value: 'Krzyżówki', label: 'Krzyżówki', icon: PuzzlePiece, color: 'text-violet-400' },
  { value: 'Nordic Walking', label: 'Nordic Walking', icon: Mountains, color: 'text-cyan-300' },
  { value: 'Joga', label: 'Joga', icon: YinYang, color: 'text-purple-300' },
  { value: 'Basen', label: 'Basen', icon: Heartbeat, color: 'text-blue-300' },
  { value: 'Rodzina', label: 'Rodzina', icon: Users, color: 'text-rose-400' },
  { value: 'Wolontariat', label: 'Wolontariat', icon: Heart, color: 'text-pink-300' },
  { value: 'Gaming', label: 'Gaming', icon: GameController, color: 'text-green-300' },
  { value: 'Technologie', label: 'Technologie', icon: Cpu, color: 'text-cyan-500' },
  { value: 'Fitness', label: 'Fitness', icon: Barbell, color: 'text-red-300' },
  { value: 'Yoga', label: 'Yoga', icon: FlowerLotus, color: 'text-indigo-300' },
  { value: 'Medytacja', label: 'Medytacja', icon: FlowerLotus, color: 'text-violet-300' },
  { value: 'Festiwale', label: 'Festiwale', icon: Confetti, color: 'text-fuchsia-300' },
];

export const EDUCATION_OPTIONS = [
  'Podstawowe', 'Średnie', 'Wyższe licencjat', 'Wyższe magister', 'Doktorat', 'Wolę nie mówić',
];

export const DRINKING_OPTIONS = ['Nie piję', 'Towarzysko', 'Regularnie'];

export const PETS_OPTIONS = [
  'Nie mam zwierząt',
  'Mam kota/koty',
  'Mam psa/psy',
  'Mam inne zwierzęta',
  'Lubię zwierzęta, ale nie mam',
];

export const SEXUAL_ORIENTATION_OPTIONS = [
  { value: 'hetero', label: 'Heteroseksualna/y', emoji: '♀♂' },
  { value: 'homo', label: 'Homoseksualna/y', emoji: '🏳️‍🌈' },
  { value: 'bi', label: 'Biseksualna/y', emoji: '💜' },
  { value: 'pan', label: 'Panseksualna/y', emoji: '💗' },
  { value: 'other', label: 'Inna', emoji: '✨' },
];

export const LOOKING_FOR_OPTIONS = [
  { value: 'przyjaźń', label: 'Szukam przyjaźni', emoji: '🤝', color: 'text-cyan-400' },
  { value: 'miłość', label: 'Szukam miłości', emoji: '❤️', color: 'text-pink-400' },
  { value: 'przygoda', label: 'Szukam przygody', emoji: '⚡', color: 'text-fuchsia-400' },
  { value: 'nie wiem', label: 'Jeszcze nie wiem', emoji: '🤔', color: 'text-gray-400' },
];

export const RELATIONSHIP_GOAL_OPTIONS = [
  'Poważny związek', 'Coś na luzie', 'Przyjaźń', 'Jeszcze nie wiem',
];

export const WANTS_CHILDREN_OPTIONS = [
  'Tak, chcę mieć dzieci', 'Nie jestem pewny/a', 'Nie chcę dzieci', 'Wolę nie mówić',
];

// Prezenty wirtualne z emoji i cenami w monetach
export const VIRTUAL_GIFTS = [
  { id: 'rose', emoji: '🌹', name: 'Róża', price: 50, color: 'text-red-400' },
  { id: 'heart', emoji: '💖', name: 'Serce', price: 100, color: 'text-pink-400' },
  { id: 'teddy', emoji: '🧸', name: 'Miś', price: 300, color: 'text-amber-400' },
  { id: 'champagne', emoji: '🍾', name: 'Szampan', price: 500, color: 'text-yellow-400' },
  { id: 'ring', emoji: '💍', name: 'Pierścionek', price: 1000, color: 'text-cyan-400' },
  { id: 'diamond', emoji: '💎', name: 'Diament', price: 5000, color: 'text-blue-400' },
  { id: 'yacht', emoji: '🛥️', name: 'Jacht', price: 10000, color: 'text-indigo-400' },
  { id: 'ferrari', emoji: '🏎️', name: 'Ferrari', price: 50000, color: 'text-red-500' },
];
export const GENDERS = [
  { id: 'K', label: 'Kobieta', emoji: '👩' },
  { id: 'M', label: 'Mężczyzna', emoji: '👨' },
];

export const ORIENTATION_OPTIONS: Record<string, { id: string; label: string; emoji: string; seeking: string }[]> = {
  K: [
    { id: 'KM', label: 'Pani pozna Pana',   emoji: '👩‍❤️‍👨', seeking: 'M' },
    { id: 'KK', label: 'Pani pozna Panią', emoji: '👩‍❤️‍👩', seeking: 'K' },
  ],
  M: [
    { id: 'MK', label: 'Pan pozna Panią',   emoji: '👨‍❤️‍👩', seeking: 'K' },
    { id: 'MM', label: 'Pan pozna Pana',     emoji: '👨‍❤️‍👨', seeking: 'M' },
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

export const ZODIAC_SIGNS = [
  'Baran', 'Byk', 'Bliźnięta', 'Rak', 'Lew', 'Panna',
  'Waga', 'Skorpion', 'Strzelec', 'Koziorożec', 'Wodnik', 'Ryby',
];

export const OCCUPATION_OPTIONS = [
  'Emeryt/ka', 'Rencista/ka', 'Nauczyciel/ka', 'Lekarz/ka', 'Inżynier/ka',
  'Przedsiębiorca', 'Prawnik/czka', 'Urzędnik/czka', 'Ksiądz/Siostra', 'Artysta/ka',
  'Muzyk', 'Rolnik/czka', 'Kierowca', 'Pielęgniarka/rz', 'Inne',
];

export const SMOKING_OPTIONS = ['Niepalący/a', 'Okazyjnie', 'Palący/a'];

export const CHILDREN_OPTIONS = [
  'Bezdzietny/a', 'Mam dzieci', 'Mam dorosłe dzieci', 'Mam wnukata/ki',
];

export const ALL_INTERESTS = [
  'Ogrodnictwo', 'Teatr', 'Literatura', 'Podróże', 'Muzyka', 'Gotowanie',
  'Taniec', 'Sport', 'Kino', 'Fotografia', 'Szachy', 'Historia', 'Kościół',
  'Wędkarstwo', 'Majsterkowanie', 'Rowerowanie', 'Spacery', 'Koty', 'Psy',
  'Krzyżówki', 'Nordic Walking', 'Joga', 'Basen', 'Wnuki', 'Wolontariat',
];
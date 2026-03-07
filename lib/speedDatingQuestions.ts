export interface SpeedDatingOption {
  label: string;
  emoji: string;
}

export type SpeedDatingQuestionCategory =
  | 'czas-wolny'
  | 'relacje'
  | 'aktywnosc'
  | 'styl-zycia'
  | 'codziennosc'
  | 'komunikacja'
  | 'smaki-podroze';

export interface SpeedDatingQuestion {
  id: string;
  category: SpeedDatingQuestionCategory;
  question: string;
  options: [SpeedDatingOption, SpeedDatingOption];
}

type PairTemplate = {
  id: string;
  context: string;
  options: [SpeedDatingOption, SpeedDatingOption];
};

const QUESTION_STEMS: Array<(context: string) => string> = [
  (context) => `Co wybierasz ${context}?`,
  (context) => `Na co masz większą ochotę ${context}?`,
  (context) => `Co bardziej do Ciebie pasuje ${context}?`,
  (context) => `Co sprawia Ci więcej radości ${context}?`,
  (context) => `Co brzmi lepiej ${context}?`,
  (context) => `Gdy masz wybór ${context}, co bierzesz?`,
  (context) => `Która opcja jest bliższa Twojemu sercu ${context}?`,
  (context) => `Co częściej wybierasz ${context}?`,
  (context) => `Co jest Twoim numerem 1 ${context}?`,
];

const OPTION_PAIRS: PairTemplate[] = [
  {
    id: 'pair-001',
    context: 'na spokojny wieczór',
    options: [
      { label: 'książka', emoji: '📚' },
      { label: 'film', emoji: '🎬' },
    ],
  },
  {
    id: 'pair-002',
    context: 'na niedzielny poranek',
    options: [
      { label: 'spacer', emoji: '🚶' },
      { label: 'dłuższy sen', emoji: '😴' },
    ],
  },
  {
    id: 'pair-003',
    context: 'gdy planujesz wyjazd',
    options: [
      { label: 'góry', emoji: '⛰️' },
      { label: 'morze', emoji: '🌊' },
    ],
  },
  {
    id: 'pair-004',
    context: 'na pierwsze spotkanie',
    options: [
      { label: 'kawa', emoji: '☕' },
      { label: 'herbata', emoji: '🫖' },
    ],
  },
  {
    id: 'pair-005',
    context: 'w wolny dzień',
    options: [
      { label: 'ogród', emoji: '🌻' },
      { label: 'muzeum', emoji: '🏛️' },
    ],
  },
  {
    id: 'pair-006',
    context: 'po obiedzie',
    options: [
      { label: 'drzemka', emoji: '🛋️' },
      { label: 'krótki spacer', emoji: '🚶‍♂️' },
    ],
  },
  {
    id: 'pair-007',
    context: 'w czasie rozmowy',
    options: [
      { label: 'żarty', emoji: '😄' },
      { label: 'poważne tematy', emoji: '🧠' },
    ],
  },
  {
    id: 'pair-008',
    context: 'na wspólny wieczór',
    options: [
      { label: 'planszówki', emoji: '🎲' },
      { label: 'muzyka', emoji: '🎵' },
    ],
  },
  {
    id: 'pair-009',
    context: 'gdy pada deszcz',
    options: [
      { label: 'domowe ciasto', emoji: '🍰' },
      { label: 'gorąca zupa', emoji: '🍲' },
    ],
  },
  {
    id: 'pair-010',
    context: 'w relacji',
    options: [
      { label: 'spontaniczność', emoji: '✨' },
      { label: 'stabilność', emoji: '⚓' },
    ],
  },
  {
    id: 'pair-011',
    context: 'na aktywny dzień',
    options: [
      { label: 'rower', emoji: '🚲' },
      { label: 'nordic walking', emoji: '🥾' },
    ],
  },
  {
    id: 'pair-012',
    context: 'na deser',
    options: [
      { label: 'lody', emoji: '🍨' },
      { label: 'szarlotka', emoji: '🥧' },
    ],
  },
  {
    id: 'pair-013',
    context: 'w rozmowie telefonicznej',
    options: [
      { label: 'krótko i konkretnie', emoji: '📞' },
      { label: 'długo i swobodnie', emoji: '🗣️' },
    ],
  },
  {
    id: 'pair-014',
    context: 'przy muzyce',
    options: [
      { label: 'stare przeboje', emoji: '📻' },
      { label: 'spokojny jazz', emoji: '🎷' },
    ],
  },
  {
    id: 'pair-015',
    context: 'na urlop',
    options: [
      { label: 'zwiedzanie miast', emoji: '🏙️' },
      { label: 'odpoczynek w naturze', emoji: '🌲' },
    ],
  },
  {
    id: 'pair-016',
    context: 'na zimowy dzień',
    options: [
      { label: 'koc i książka', emoji: '🧣' },
      { label: 'ruch na świeżym powietrzu', emoji: '❄️' },
    ],
  },
  {
    id: 'pair-017',
    context: 'na wspólną kolację',
    options: [
      { label: 'domowe gotowanie', emoji: '🍝' },
      { label: 'restauracja', emoji: '🍽️' },
    ],
  },
  {
    id: 'pair-018',
    context: 'gdy masz wolną godzinę',
    options: [
      { label: 'krzyżówki', emoji: '🧩' },
      { label: 'podcast', emoji: '🎧' },
    ],
  },
  {
    id: 'pair-019',
    context: 'w relacjach z ludźmi',
    options: [
      { label: 'słuchać', emoji: '👂' },
      { label: 'opowiadać', emoji: '💬' },
    ],
  },
  {
    id: 'pair-020',
    context: 'na pierwszy wyjazd we dwoje',
    options: [
      { label: 'pensjonat', emoji: '🏡' },
      { label: 'hotel', emoji: '🏨' },
    ],
  },
  {
    id: 'pair-021',
    context: 'w domu',
    options: [
      { label: 'minimalizm', emoji: '🪴' },
      { label: 'dużo pamiątek', emoji: '🖼️' },
    ],
  },
  {
    id: 'pair-022',
    context: 'na aktywny poranek',
    options: [
      { label: 'gimnastyka', emoji: '🤸' },
      { label: 'spokojne rozciąganie', emoji: '🧘' },
    ],
  },
  {
    id: 'pair-023',
    context: 'na wieczór z kulturą',
    options: [
      { label: 'teatr', emoji: '🎭' },
      { label: 'kino', emoji: '🍿' },
    ],
  },
  {
    id: 'pair-024',
    context: 'gdy planujesz weekend',
    options: [
      { label: 'wcześniej wszystko zapisać', emoji: '📝' },
      { label: 'działać spontanicznie', emoji: '🧭' },
    ],
  },
  {
    id: 'pair-025',
    context: 'na rodzinne spotkania',
    options: [
      { label: 'duże grono', emoji: '👨‍👩‍👧‍👦' },
      { label: 'małe, kameralne', emoji: '👥' },
    ],
  },
  {
    id: 'pair-026',
    context: 'w kuchni',
    options: [
      { label: 'tradycyjne przepisy', emoji: '🥘' },
      { label: 'nowe smaki', emoji: '🌮' },
    ],
  },
  {
    id: 'pair-027',
    context: 'na wspólną aktywność',
    options: [
      { label: 'taniec', emoji: '💃' },
      { label: 'spacer', emoji: '🚶‍♀️' },
    ],
  },
  {
    id: 'pair-028',
    context: 'gdy się relaksujesz',
    options: [
      { label: 'cisza', emoji: '🤫' },
      { label: 'dźwięki natury', emoji: '🐦' },
    ],
  },
  {
    id: 'pair-029',
    context: 'przy porządkach domowych',
    options: [
      { label: 'muzyka w tle', emoji: '🎶' },
      { label: 'pełna cisza', emoji: '🔕' },
    ],
  },
  {
    id: 'pair-030',
    context: 'w kontakcie na co dzień',
    options: [
      { label: 'krótkie wiadomości', emoji: '📱' },
      { label: 'rozmowa na żywo', emoji: '🤝' },
    ],
  },
  {
    id: 'pair-031',
    context: 'na wspólny obiad',
    options: [
      { label: 'ryba', emoji: '🐟' },
      { label: 'makaron', emoji: '🍝' },
    ],
  },
  {
    id: 'pair-032',
    context: 'na wieczór wspomnień',
    options: [
      { label: 'stare zdjęcia', emoji: '📸' },
      { label: 'stare piosenki', emoji: '🎼' },
    ],
  },
  {
    id: 'pair-033',
    context: 'w wolne popołudnie',
    options: [
      { label: 'gra w karty', emoji: '🃏' },
      { label: 'gra w szachy', emoji: '♟️' },
    ],
  },
  {
    id: 'pair-034',
    context: 'gdy jedziesz poza miasto',
    options: [
      { label: 'samochód', emoji: '🚗' },
      { label: 'pociąg', emoji: '🚆' },
    ],
  },
  {
    id: 'pair-035',
    context: 'na niedzielę',
    options: [
      { label: 'obiad domowy', emoji: '🍗' },
      { label: 'kawiarnia', emoji: '🧁' },
    ],
  },
];

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function getCategoryForPairId(pairId: string): SpeedDatingQuestionCategory {
  const pairNumber = Number.parseInt(pairId.replace('pair-', ''), 10);

  if (Number.isNaN(pairNumber)) {
    return 'relacje';
  }

  if (pairNumber <= 5) return 'czas-wolny';
  if (pairNumber <= 10) return 'relacje';
  if (pairNumber <= 15) return 'aktywnosc';
  if (pairNumber <= 20) return 'styl-zycia';
  if (pairNumber <= 25) return 'codziennosc';
  if (pairNumber <= 30) return 'komunikacja';
  return 'smaki-podroze';
}

export const SPEED_DATING_QUESTION_BANK: SpeedDatingQuestion[] = OPTION_PAIRS.flatMap((pair) => {
  const category = getCategoryForPairId(pair.id);

  return QUESTION_STEMS.map((buildQuestion, index) => ({
    id: `${pair.id}-${index + 1}`,
    category,
    question: buildQuestion(pair.context),
    options: pair.options,
  }));
});

export const SPEED_DATING_QUESTION_COUNT = SPEED_DATING_QUESTION_BANK.length;

export function pickRandomSpeedDatingQuestions(count: number): SpeedDatingQuestion[] {
  return shuffleArray(SPEED_DATING_QUESTION_BANK).slice(
    0,
    Math.min(count, SPEED_DATING_QUESTION_BANK.length),
  );
}

function pickBalancedFromPool(
  pool: SpeedDatingQuestion[],
  count: number,
): SpeedDatingQuestion[] {
  const maxCount = Math.min(count, pool.length);
  if (maxCount <= 0) return [];

  const questionsByCategory = new Map<SpeedDatingQuestionCategory, SpeedDatingQuestion[]>();

  for (const question of pool) {
    const existing = questionsByCategory.get(question.category);
    if (existing) {
      existing.push(question);
    } else {
      questionsByCategory.set(question.category, [question]);
    }
  }

  const selected: SpeedDatingQuestion[] = [];

  for (const category of shuffleArray(Array.from(questionsByCategory.keys()))) {
    if (selected.length >= maxCount) break;

    const questionsInCategory = questionsByCategory.get(category);
    if (!questionsInCategory?.length) continue;

    selected.push(shuffleArray(questionsInCategory)[0]);
  }

  if (selected.length < maxCount) {
    const selectedIds = new Set(selected.map((question) => question.id));
    const remaining = shuffleArray(pool.filter((question) => !selectedIds.has(question.id)));

    selected.push(...remaining.slice(0, maxCount - selected.length));
  }

  return shuffleArray(selected);
}

export function pickBalancedSpeedDatingQuestions(
  count: number,
  excludedQuestionIds: string[] = [],
): SpeedDatingQuestion[] {
  const maxCount = Math.min(count, SPEED_DATING_QUESTION_BANK.length);
  if (maxCount <= 0) return [];

  const excludedSet = new Set(excludedQuestionIds);
  const preferredPool = excludedSet.size
    ? SPEED_DATING_QUESTION_BANK.filter((question) => !excludedSet.has(question.id))
    : SPEED_DATING_QUESTION_BANK;

  const preferredSelection = pickBalancedFromPool(preferredPool, maxCount);

  if (preferredSelection.length >= maxCount) {
    return preferredSelection;
  }

  const selectedIds = new Set(preferredSelection.map((question) => question.id));
  const fallbackPool = SPEED_DATING_QUESTION_BANK.filter(
    (question) => !selectedIds.has(question.id),
  );
  const fallbackSelection = pickBalancedFromPool(
    fallbackPool,
    maxCount - preferredSelection.length,
  );

  return shuffleArray([...preferredSelection, ...fallbackSelection]).slice(0, maxCount);
}

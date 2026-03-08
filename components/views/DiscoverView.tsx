'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Zap,
  ArrowRight,
  Lock,
  Crown,
  UserRound,
  Clock3,
  ThumbsDown,
  ThumbsUp,
  Bot,
  CheckCircle,
  MessageCircle,
  Heart,
  Sparkles,
  Send,
  Loader2,
} from 'lucide-react';


type SpeedStage =
  | 'intro'
  | 'questions'
  | 'matching'
  | 'chat'
  | 'decision'
  | 'result-success'
  | 'result-declined'
  | 'result-no-match';

interface SpeedDatingQuestion {
  id: string;
  category: 'ice-breaker' | 'deep' | 'fun';
  question: string;
  options: { label: string; emoji: string }[];
}

interface Profile {
  id: string;
  name: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  status: string;
  image: string;
  isVerified: boolean;
  details: {
    occupation: string;
    zodiac: string;
    smoking: string;
    children: string;
  };
  photos?: string[];
  seeking_gender?: string;
  gender?: string;
}

interface DiscoverViewProps {
  profiles: Profile[];
  discoverIndex: number;
  onNext: () => void;
  onLike: (profile: Profile) => void;
  onViewProfile: (profile: Profile) => void;
  onOpenMessages: (profile: Profile) => void;
  onOpenPremium: () => void;
  isPremium: boolean;
  canStartSpeedDate: () => boolean;
  registerSpeedDate: () => void;
}

// Typ wiadomości czatu
type SpeedMessage = {
  id: string;
  from: 'me' | 'partner';
  text: string;
};


// Rozbudowana lokalna implementacja podpowiedzi AI
function useAssistant(chatMessages: SpeedMessage[], stage: SpeedStage) {
  const DEFAULT_SUGGESTIONS = [
    'Jak minął Ci dzień?',
    'Jakie masz plany na weekend?',
    'Opowiedz mi o swojej pasji.',
    'Jaka jest Twoja ulubiona potrawa?',
    'Czy lubisz podróżować?',
    'Jak spędzasz wolny czas?',
    'Co ostatnio sprawiło Ci radość?',
    'Masz jakieś marzenia na ten rok?',
    'Jakie miejsce chciał(a)byś odwiedzić?',
    'Czy masz zwierzęta?',
    'Jak wygląda Twój idealny dzień?',
    'Co najbardziej cenisz w ludziach?',
    'Jaką książkę lub film polecasz?',
    'Czy uprawiasz sport?',
    'Jakie są Twoje zainteresowania?',
    'Czy gotujesz w domu?',
    'Jaką muzykę lubisz?',
    'Czy masz ulubione wspomnienie z dzieciństwa?',
    'Co daje Ci energię?',
    'Jakie miejsce w Polsce lubisz najbardziej?'
  ];
  const SUGGESTION_RULES: Array<{ keywords: string[]; suggestions: string[] }> = [
    {
      keywords: ['książka', 'czytasz', 'czytać', 'literatura'],
      suggestions: [
        'Jaka jest Twoja ulubiona książka?',
        'Czy polecasz coś do czytania?',
        'Czy lubisz poezję?',
      ],
    },
    {
      keywords: ['film', 'oglądasz', 'kino', 'serial'],
      suggestions: [
        'Jaki film ostatnio Ci się spodobał?',
        'Masz ulubiony serial?',
        'Chodzisz do kina?',
      ],
    },
    {
      keywords: ['muzyka', 'piosenka', 'koncert'],
      suggestions: [
        'Jakiej muzyki słuchasz najchętniej?',
        'Bywasz na koncertach?',
        'Masz ulubioną piosenkę?',
      ],
    },
    {
      keywords: ['podróż', 'wakacje', 'miejsce', 'miasto'],
      suggestions: [
        'Jakie jest Twoje wymarzone miejsce na wakacje?',
        'Gdzie chciał(a)byś pojechać?',
        'Czy lubisz zwiedzać nowe miasta?',
      ],
    },
    {
      keywords: ['praca', 'zawód', 'firma'],
      suggestions: [
        'Czym się zajmujesz na co dzień?',
        'Co najbardziej lubisz w swojej pracy?',
        'Jak wygląda Twój typowy dzień?',
      ],
    },
    {
      keywords: ['hobby', 'zainteresowania', 'pasja'],
      suggestions: [
        'Jakie masz hobby?',
        'Co sprawia Ci największą frajdę?',
        'Jak zaczęła się Twoja pasja?',
      ],
    },
    {
      keywords: ['rodzina', 'dzieci', 'bliscy'],
      suggestions: [
        'Czy masz dzieci albo bliskich, z którymi często spędzasz czas?',
        'Jak spędzasz czas z rodziną?',
        'Co najbardziej lubisz w rodzinnych spotkaniach?',
      ],
    },
    {
      keywords: ['sport', 'ćwiczysz', 'rower', 'basen', 'bieganie'],
      suggestions: [
        'Czy uprawiasz jakiś sport?',
        'Lubisz spacery lub jazdę na rowerze?',
        'Jak dbasz o kondycję?',
      ],
    },
    {
      keywords: ['jedzenie', 'gotujesz', 'kuchnia', 'restauracja', 'obiad', 'smak'],
      suggestions: [
        'Jaką kuchnię lubisz najbardziej?',
        'Czy gotujesz w domu?',
        'Jaka jest Twoja ulubiona potrawa?',
      ],
    },
    {
      keywords: ['pogoda', 'słońce', 'deszcz', 'zima', 'lato'],
      suggestions: [
        'Lubisz lato czy zimę?',
        'Jaką pogodę lubisz najbardziej?',
        'Czy pogoda wpływa na Twój nastrój?',
      ],
    },
  ];

  const [aiSuggestions, setAiSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS.slice(0, 3));
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);

  useEffect(() => {
    if (stage !== 'chat') {
      setAiSuggestions(DEFAULT_SUGGESTIONS.slice(0, 3));
      return;
    }
    if (!chatMessages.length) {
      setAiSuggestions(DEFAULT_SUGGESTIONS.slice(0, 3));
      return;
    }
    setIsAssistantThinking(true);
    const last = chatMessages[chatMessages.length - 1].text.toLowerCase();
    let found = false;
    for (const rule of SUGGESTION_RULES) {
      if (rule.keywords.some((keyword) => last.includes(keyword))) {
        setTimeout(() => {
          setAiSuggestions(shuffle(rule.suggestions).slice(0, 3));
          setIsAssistantThinking(false);
        }, 600);
        found = true;
        break;
      }
    }
    if (!found) {
      // Fallback: losowe podpowiedzi z szerokiej puli
      setTimeout(() => {
        setAiSuggestions(shuffle(DEFAULT_SUGGESTIONS).slice(0, 3));
        setIsAssistantThinking(false);
      }, 600);
    }
  }, [chatMessages, stage]);

  return { aiSuggestions, isAssistantThinking, setAiSuggestions, DEFAULT_SUGGESTIONS };

// Prosta funkcja shuffle (poza komponentem)
function shuffle<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5);
}
}

const PARTNER_REPLIES = [
  'To ciekawe, powiedz coś więcej.',
  'Rozumiem. A co myślisz o podróżach?',
  'Naprawdę? Ja też!',
  'Nigdy o tym nie myślałem/am w ten sposób.',
  'Zgadzam się w 100%.',
  'Hmm, muszę to przemyśleć.',
  'A jakie masz plany na weekend?',
];

const QUESTIONS_PER_ROUND = 3;
const QUESTION_HISTORY_ROUNDS = 5;
const MAX_RECENT_QUESTION_IDS = QUESTIONS_PER_ROUND * QUESTION_HISTORY_ROUNDS;
const QUESTION_HISTORY_STORAGE_KEY = 'findlooveSpeedDatingHistory';

const ALL_SPEED_DATING_QUESTIONS: SpeedDatingQuestion[] = [
  { id: 'q1', category: 'ice-breaker', question: 'Idealny wieczór to dla Ciebie:', options: [{ label: 'Książka i herbata', emoji: '📚' }, { label: 'Spotkanie z przyjaciółmi', emoji: '💃' }] },
  { id: 'q2', category: 'ice-breaker', question: 'Wolisz spędzać czas:', options: [{ label: 'W mieście', emoji: '🏙️' }, { label: 'Na łonie natury', emoji: '🌲' }] },
  { id: 'q3', category: 'fun', question: 'Twoje wymarzone zwierzę domowe to:', options: [{ label: 'Pies', emoji: '🐶' }, { label: 'Kot', emoji: '🐱' }] },
  { id: 'q4', category: 'fun', question: 'Na deser wybierasz:', options: [{ label: 'Ciasto owocowe', emoji: '🍰' }, { label: 'Lody czekoladowe', emoji: '🍦' }] },
  { id: 'q5', category: 'deep', question: 'Co jest dla Ciebie ważniejsze w związku?', options: [{ label: 'Wspólne pasje', emoji: '🎨' }, { label: 'Głębokie rozmowy', emoji: '💬' }] },
  { id: 'q6', category: 'deep', question: 'Jesteś bardziej:', options: [{ label: 'Spontaniczny/a', emoji: '🎉' }, { label: 'Zorganizowany/a', emoji: '📅' }] },
  { id: 'q7', category: 'ice-breaker', question: 'Poranna kawa czy herbata?', options: [{ label: 'Kawa', emoji: '☕' }, { label: 'Herbata', emoji: '🍵' }] },
  { id: 'q8', category: 'fun', question: 'Wolisz oglądać:', options: [{ label: 'Komedie romantyczne', emoji: '😂' }, { label: 'Filmy sensacyjne', emoji: '💥' }] },
  { id: 'q9', category: 'deep', question: 'Co cenisz bardziej?', options: [{ label: 'Poczucie humoru', emoji: '😄' }, { label: 'Inteligencję', emoji: '🧠' }] },
  { id: 'q10', category: 'ice-breaker', question: 'Wakacje marzeń:', options: [{ label: 'Góry', emoji: '⛰️' }, { label: 'Morze', emoji: '🌊' }] },
  { id: 'q11', category: 'fun', question: 'Twój talent, o którym mało kto wie:', options: [{ label: 'Śpiewanie pod prysznicem', emoji: '🎤' }, { label: 'Taniec w kuchni', emoji: '🕺' }] },
  { id: 'q12', category: 'deep', question: 'Wolisz dawać czy otrzymywać prezenty?', options: [{ label: 'Dawać', emoji: '🎁' }, { label: 'Otrzymywać', emoji: '🤗' }] },
  { id: 'q13', category: 'ice-breaker', question: 'Jesteś rannym ptaszkiem czy sową?', options: [{ label: 'Ranny ptaszek', emoji: '☀️' }, { label: 'Sowa', emoji: '🦉' }] },
  { id: 'q14', category: 'fun', question: 'Gdybyś mógł/mogła mieć supermoc, byłaby to:', options: [{ label: 'Latanie', emoji: '🕊️' }, { label: 'Niewidzialność', emoji: '👻' }] },
  { id: 'q15', category: 'deep', question: 'Wolisz małe grono przyjaciół czy duże towarzystwo?', options: [{ label: 'Małe grono', emoji: '🧑‍🤝‍🧑' }, { label: 'Duże towarzystwo', emoji: '🎉' }] },
];
const SPEED_DATING_QUESTION_COUNT = ALL_SPEED_DATING_QUESTIONS.length;

function readRecentQuestionIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(QUESTION_HISTORY_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function writeRecentQuestionIds(questionIds: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      QUESTION_HISTORY_STORAGE_KEY,
      JSON.stringify(questionIds.slice(0, MAX_RECENT_QUESTION_IDS)),
    );
  } catch {}
}

function pickBalancedSpeedDatingQuestions(
  count: number,
  excludeIds: string[],
): SpeedDatingQuestion[] {
  const availableQuestions = ALL_SPEED_DATING_QUESTIONS.filter(
    (q) => !excludeIds.includes(q.id),
  );
  // Gdy historia obejmuje wszystkie pytania, wracamy do pełnej puli,
  // żeby runda zawsze mogła wystartować.
  const sourcePool =
    availableQuestions.length >= count
      ? availableQuestions
      : ALL_SPEED_DATING_QUESTIONS;
  const shuffled = [...sourcePool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function pickQuestionsForRound(): SpeedDatingQuestion[] {
  const recentQuestionIds = readRecentQuestionIds();
  const selected = pickBalancedSpeedDatingQuestions(QUESTIONS_PER_ROUND, recentQuestionIds);

  if (selected.length === 0) {
    return [];
  }

  const selectedIds = selected.map((question) => question.id);
  const updatedRecentIds = [...selectedIds, ...recentQuestionIds].slice(0, MAX_RECENT_QUESTION_IDS);
  writeRecentQuestionIds(updatedRecentIds);
  return selected;
}

export default function DiscoverView({
  profiles,
  discoverIndex,
  onNext,
  onLike,
  onViewProfile,
  onOpenMessages,
  onOpenPremium,
  isPremium,
  canStartSpeedDate,
  registerSpeedDate,
}: DiscoverViewProps) {
  const useBot = true;
  const [limitNotice, setLimitNotice] = useState('');
  const [skipQuestions, setSkipQuestions] = useState(false);
  
  // Generuj losowy profil bota za każdym razem
  const [botProfile] = useState<Profile>(() => {
    const names = ['Alicja', 'Kasia', 'Natalia', 'Marta', 'Michał', 'Kamil', 'Paweł', 'Tomek'];
    const cities = ['Warszawa', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań', 'Łódź'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomAge = 25 + Math.floor(Math.random() * 30);
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const isFemale = ['Alicja', 'Kasia', 'Natalia', 'Marta'].includes(randomName);
    
    return {
      id: `bot-${Date.now()}`,
      name: randomName,
      age: randomAge,
      city: randomCity,
      bio: 'Lubię rozmawiać o wszystkim! Cenię miłe towarzystwo i ciekawe rozmowy.',
      interests: ['książki', 'ogród', 'muzyka', 'spacery'],
      status: 'Szuka przyjaźni',
      image: `https://ui-avatars.com/api/?name=${randomName}&background=f0abfc&color=831843&size=256`,
      isVerified: true,
      details: { 
        occupation: 'Specjalista/ka', 
        zodiac: ['Baran', 'Byk', 'Bliźnięta', 'Rak', 'Lew', 'Panna'][Math.floor(Math.random() * 6)],
        smoking: 'Niepalący/a', 
        children: 'Mam dorosłe dzieci' 
      },
      photos: [`https://ui-avatars.com/api/?name=${randomName}&background=f0abfc&color=831843&size=256`],
      seeking_gender: isFemale ? 'M' : 'K',
      gender: isFemale ? 'K' : 'M',
    };
  });

  // Bot zawsze aktywny (nikt nie gra w szybkie randki) - ustawiony domyślnie w useState

  const partner = useBot ? botProfile : profiles[discoverIndex];

  const [stage, setStage] = useState<SpeedStage>('intro');
  const [selectedQuestions, setSelectedQuestions] = useState<SpeedDatingQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [chatTimer, setChatTimer] = useState(180);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<SpeedMessage[]>([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [decisionNotice, setDecisionNotice] = useState('');
  const [historyNotice, setHistoryNotice] = useState('');
  
  // Oddzielona logika Asystenta AI
  const { aiSuggestions, isAssistantThinking, setAiSuggestions, DEFAULT_SUGGESTIONS } = useAssistant(chatMessages, stage);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const partnerAnswers = useMemo(
    () =>
      selectedQuestions.map((question, idx) => {
        const seed = `${partner.id}-${question.id}-${idx}`
          .split('')
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return seed % 2;
      }),
    [partner.id, selectedQuestions],
  );

  const resetSession = () => {
    setStage('intro');
    setCurrentQuestion(0);
    setAnswers([]);
    setMatchPercent(null);
    setChatTimer(180);
    setChatInput('');
    setChatMessages([]);
    setIsPartnerTyping(false);
    setDecisionNotice('');
    setAiSuggestions(DEFAULT_SUGGESTIONS);
  };

  const startSpeedDating = () => {
    console.log('[startSpeedDating] fired', { stage, isPremium });
    setLimitNotice('');
    const canStart = canStartSpeedDate();
    console.log('[startSpeedDating] canStartSpeedDate:', canStart);
    if (!canStart) {
      setLimitNotice(isPremium
        ? ''
        : 'Wersja darmowa: możesz odbyć 3 szybkie randki na godzinę. Spróbuj ponownie później lub wykup pakiet premium.');
      return;
    }
    console.log('[startSpeedDating] calling registerSpeedDate');
    registerSpeedDate();
    
    // 30% szans na pominięcie pytań (bezpośredni matching)
    const shouldSkip = Math.random() < 0.3;
    setSkipQuestions(shouldSkip);
    
    if (shouldSkip) {
      // Pomiń pytania, przejdź od razu do matching
      const randomMatch = 70 + Math.floor(Math.random() * 31); // 70-100%
      setMatchPercent(randomMatch);
      setDecisionNotice('');
      setHistoryNotice('');
      setStage('matching');
      console.log('[startSpeedDating] pytania pominięte, matching:', randomMatch);
    } else {
      // Normalny flow z pytaniami
      const questions = pickQuestionsForRound();
      console.log('[startSpeedDating] selectedQuestions:', questions);

      // Awaryjny fallback: jeśli pytania nie są dostępne, uruchom matching.
      if (questions.length === 0) {
        const randomMatch = 70 + Math.floor(Math.random() * 31);
        setMatchPercent(randomMatch);
        setDecisionNotice('');
        setHistoryNotice('Odświeżono pulę pytań dla tej rundy.');
        setStage('matching');
        return;
      }

      setSelectedQuestions(questions);
      setCurrentQuestion(0);
      setAnswers([]);
      setMatchPercent(null);
      setDecisionNotice('');
      setHistoryNotice('');
      setStage('questions');
      console.log('[startSpeedDating] stage set to questions');
    }
  };

  const clearQuestionHistory = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(QUESTION_HISTORY_STORAGE_KEY);
    } catch {}
    setHistoryNotice('Historia pytań została wyczyszczona.');
  };

  const nextPartner = () => {
    onNext();
    resetSession();
  };

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== 'matching' || matchPercent === null) return;

    const timeout = window.setTimeout(() => {
      if (matchPercent >= 85) {
        setStage('chat');
        setChatTimer(180);
        setChatMessages([
          {
            id: `partner-intro-${Date.now()}`,
            from: 'partner',
            text: 'Dzień dobry! Miło Cię poznać anonimowo. O czym chcesz porozmawiać?',
          },
        ]);
      } else {
        setStage('result-no-match');
      }
    }, 1600);
    return () => clearTimeout(timeout);
  }, [stage, matchPercent]);

  useEffect(() => {
    if (stage !== 'chat') return;
    const timer = window.setInterval(() => {
      setChatTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setStage('decision');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (chatScrollRef.current && (stage === 'chat')) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isPartnerTyping, stage]);

  const chooseAnswer = (optionIndex: number) => {
    const nextAnswers = [...answers, optionIndex];
    const questionCount = selectedQuestions.length;
    if (questionCount === 0) return;

    if (currentQuestion < questionCount - 1) {
      setAnswers(nextAnswers);
      setCurrentQuestion((prev) => prev + 1);
      return;
    }

    const sameAnswersCount = nextAnswers.reduce(
      (sum, answer, idx) => sum + (answer === partnerAnswers[idx] ? 1 : 0),
      0,
    );

    const computedPercent = Math.min(
      100,
      Math.round(60 + (sameAnswersCount / questionCount) * 40),
    );

    setAnswers(nextAnswers);
    setMatchPercent(computedPercent);
    setStage('matching');
  };

  // Bot: odpowiedzi bardziej realistyczne
  const BOT_REPLIES = [
    'To ciekawe, powiedz coś więcej!',
    'Haha, rozumiem! A Ty?',
    'Czasem mam podobnie.',
    'A co o tym sądzisz?',
    'Zgadzam się, to ważne.',
    'Nigdy o tym nie myślałam, ciekawe!',
    'A jak spędzasz wolny czas?',
    'Masz jakieś marzenia na ten rok?',
    'Opowiedz mi coś śmiesznego!',
    'A co sprawia Ci radość?',
    'Lubisz podróżować?',
    'Jaką książkę ostatnio czytałaś?',
    'A co z muzyką, masz ulubioną?',
    'Czasem warto się zatrzymać i pomyśleć.',
    'Dziękuję za miłą rozmowę!'
  ];

  function getBotReply(userMsg: string) {
    // Prosta analiza, można rozbudować
    if (/muzyk|piosenk|koncert/i.test(userMsg)) return 'Też lubię muzykę! Ostatnio słucham dużo jazzu.';
    if (/książk|czytasz|czytać|literatur/i.test(userMsg)) return 'Uwielbiam czytać powieści obyczajowe.';
    if (/film|oglądasz|serial/i.test(userMsg)) return 'Ostatnio oglądałam świetny serial na Netflixie.';
    if (/podróż|wakacj|miejsce|miasto/i.test(userMsg)) return 'Chciałabym kiedyś pojechać do Włoch.';
    if (/rodzina|dzieci|bliscy/i.test(userMsg)) return 'Rodzina i bliscy są dla mnie bardzo ważni.';
    if (/sport|ćwiczysz|rower|basen|bieganie/i.test(userMsg)) return 'Staram się być aktywna, lubię spacery.';
    if (/praca|zawód|firma/i.test(userMsg)) return 'Lubię to, czym się zajmuję, i cenię równowagę między pracą a życiem.';
    if (/hobby|zainteresowania|pasja/i.test(userMsg)) return 'Moje hobby to ogród i książki.';
    if (/jedzenie|gotujesz|kuchnia|restauracja|obiad|smak/i.test(userMsg)) return 'Lubię gotować, szczególnie zupy.';
    if (/pogoda|słońce|deszcz|zima|lato/i.test(userMsg)) return 'Lubię lato, ale każda pora roku ma swój urok.';
    return BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
  }

  const sendMessage = () => {
    const content = chatInput.trim();
    if (!content || stage !== 'chat' || chatTimer <= 0) return;

    setChatMessages((prev) => [...prev, { id: `me-${Date.now()}`, from: 'me', text: content }]);
    setChatInput('');

    if (useBot) {
      setIsPartnerTyping(true);
      // Symulacja myślenia bota: 1.5-3.5s
      const delay = 1500 + Math.random() * 2000;
      window.setTimeout(() => {
        setIsPartnerTyping(false);
        setChatMessages((prev) => [
          ...prev,
          {
            id: `partner-${Date.now()}`,
            from: 'partner',
            text: getBotReply(content),
          },
        ]);
      }, delay);
    } else {
      setIsPartnerTyping(true);
      window.setTimeout(() => {
        setIsPartnerTyping(false);
        setChatMessages((prev) => [
          ...prev,
          {
            id: `partner-${Date.now()}`,
            from: 'partner',
            text: PARTNER_REPLIES[Math.floor(Math.random() * PARTNER_REPLIES.length)],
          },
        ]);
      }, 2500);
    }
  };

  const handleDecision = (wantContact: boolean) => {
    if (!wantContact) {
      setDecisionNotice('Podziękowano za rozmowę. Możesz rozpocząć kolejną szybką randkę.');
      setStage('result-declined');
      return;
    }

    // BOT zawsze odmawia (użytkownik nie wie że to bot)
    if (useBot) {
      const politeDeclines = [
        'Ta osoba kliknęła „Dziękuję". Być może szuka czegoś innego.',
        'Niestety druga strona nie chce kontynuować kontaktu.',
        'Ta osoba podziękowała za rozmowę. Następnym razem na pewno się uda!',
        'Rozmówca zdecydował się nie kontynuować znajomości.',
      ];
      setDecisionNotice(politeDeclines[Math.floor(Math.random() * politeDeclines.length)]);
      setStage('result-declined');
      return;
    }

    const partnerSaysYes = ((matchPercent ?? 0) + partner.name.length + partner.age) % 4 !== 0;

    if (partnerSaysYes) {
      void onLike(partner);
      setDecisionNotice('Świetna wiadomość! Oboje kliknęliście „Tak” — kontakt zapisany.');
      setStage('result-success');
      return;
    }

    setDecisionNotice('Ta osoba kliknęła „Dziękuję”. Spróbuj kolejnej szybkiej randki.');
    setStage('result-declined');
  };

  console.log('[DiscoverView render]', { stage, selectedQuestions, limitNotice, partner, isPremium });
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="text-center mb-4">
        <span className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 px-5 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider shadow-sm border border-amber-200/50">
          <Zap size={16} className="text-amber-500" /> Tryb Szybkich Randek
        </span>
      </div>

      {stage === 'intro' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden text-center">
            <Lock className="absolute -right-4 -top-4 opacity-10" size={120} />
            <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center mx-auto mb-4">
              <Zap className="text-amber-300" size={28} />
            </div>
            <h2 className="text-3xl font-serif font-bold mb-2">Anonimowa Randka</h2>
            <p className="text-slate-300 text-lg">Najpierw pytania, potem rozmowa i wspólna decyzja.</p>
          </div>
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center">
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              Odpowiedz na 3 szybkie pytania z bazy {SPEED_DATING_QUESTION_COUNT} różnych pytań,
              miksowanych z różnych kategorii. System pomija pytania z ostatnich {QUESTION_HISTORY_ROUNDS} rund.
              Jeśli dopasowanie wyniesie minimum 85%, uruchomi się anonimowy czat z licznikiem 3 minut.
            </p>
            {!isPremium && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left max-w-xl mx-auto">
                <p className="text-sm font-semibold text-amber-800 mb-2">Asystent AI jest funkcją Premium</p>
                <p className="text-xs text-amber-700 mb-3">
                  Wersja Premium odblokowuje inteligentne podpowiedzi wiadomości podczas anonimowego czatu.
                </p>
                <button
                  onClick={onOpenPremium}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-bold transition-colors"
                >
                  <Crown size={16} /> Odblokuj Premium
                </button>
              </div>
            )}
            <button
              onClick={startSpeedDating}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-8 py-4 rounded-full text-lg font-bold shadow-lg shadow-amber-500/20 inline-flex items-center gap-3 transition-transform hover:scale-105"
            >
              <Zap size={24} /> Zacznij anonimowo <ArrowRight size={22} />
            </button>
            {limitNotice && (
              <p className="mt-4 text-sm font-semibold text-rose-500 max-w-xl mx-auto">{limitNotice}</p>
            )}
            <div className="mt-6">
              <button
                onClick={clearQuestionHistory}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold underline underline-offset-4 transition-colors"
              >
                Wyczyść historię pytań
              </button>
              {historyNotice && <p className="mt-3 text-sm font-semibold text-emerald-500">{historyNotice}</p>}
            </div>
          </div>
        </div>
      )}

      {stage === 'questions' && selectedQuestions.length > 0 && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right duration-300">
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest font-bold text-slate-400 mb-4">
              Pytanie {currentQuestion + 1} z {selectedQuestions.length}
            </p>
            <div className="flex justify-center gap-2">
              {selectedQuestions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2.5 w-16 rounded-full transition-colors duration-300 ${idx <= currentQuestion ? 'bg-amber-400 shadow-sm' : 'bg-slate-100'}`}
                />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-12 text-center">
            <h3 className="text-2xl font-serif font-bold text-slate-800 mb-8 leading-snug">
              {selectedQuestions[currentQuestion].question}
            </h3>
            <div className="grid gap-4">
              {selectedQuestions[currentQuestion].options.map((option, idx) => (
                <button
                  key={option.label}
                  onClick={() => chooseAnswer(idx)}
                  className="bg-slate-50 hover:bg-amber-50 border-2 border-slate-100 hover:border-amber-300 rounded-2xl px-6 py-5 flex items-center justify-between text-left transition-all hover:shadow-md"
                >
                  <span className="text-lg font-bold text-slate-700">{option.label}</span>
                  <span className="text-3xl" aria-hidden>
                    {option.emoji}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === 'matching' && (
        <div className="max-w-2xl mx-auto animate-in zoom-in duration-300">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-16 text-center space-y-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-inner ${
              matchPercent === 100 ? 'bg-emerald-100 text-emerald-500' : 'bg-amber-100 text-amber-500'
            }`}>
              <Sparkles size={40} />
            </div>
            <h3 className="text-4xl font-serif font-bold text-slate-800">Sprawdzamy dopasowanie…</h3>
            <p className="text-slate-500 text-xl">{skipQuestions ? 'Na podstawie profili i preferencji.' : 'Porównujemy odpowiedzi z drugą osobą.'}</p>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner w-4/5 mx-auto">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  matchPercent === 100 ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
                style={{ width: `${matchPercent ?? 80}%` }}
              />
            </div>
            <p className={`text-3xl font-bold ${
              matchPercent === 100 ? 'text-emerald-600' : 'text-amber-500'
            }`}>{matchPercent ?? 0}% zgodności</p>
            {matchPercent === 100 && (
              <p className="text-emerald-600 font-semibold text-lg animate-pulse">🎉 Idealne dopasowanie!</p>
            )}
          </div>
        </div>
      )}

      {stage === 'chat' && (
        <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom duration-500 flex justify-center items-end gap-6">
          {isPremium ? (
          <div className="hidden lg:flex flex-col w-72 shrink-0 pb-6 animate-in slide-in-from-left duration-700">
            <div className="bg-white p-6 rounded-[2rem] rounded-br-sm shadow-2xl border border-amber-100 relative mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={16} /> Asystent AI
                </p>
                {isAssistantThinking && <Loader2 size={16} className="text-amber-500 animate-spin" />}
              </div>
              
              {isAssistantThinking ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <span className="text-sm font-medium">Asystent AI analizuje rozmowę...</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-4 font-medium leading-relaxed">
                    Brakuje słów? Wykorzystaj moją inteligentną podpowiedź:
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {aiSuggestions.map((suggestion: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setChatInput(suggestion)}
                        className="bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-100 hover:border-amber-300 px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all shadow-sm hover:shadow-md"
                      >
                        &ldquo;{suggestion}&rdquo;
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="absolute -bottom-3 right-8 w-6 h-6 bg-white border-b border-r border-amber-100 transform rotate-45"></div>
            </div>
            
            <div className={`self-end mr-4 flex items-center justify-center w-[72px] h-[72px] rounded-full shadow-lg border-4 border-white text-white cursor-help transition-all duration-300 ${
              isAssistantThinking 
                ? 'bg-gradient-to-br from-amber-300 to-yellow-500 animate-pulse scale-105' 
                : 'bg-gradient-to-br from-amber-400 to-orange-500 hover:-translate-y-2'
            }`}>
              <Bot size={36} />
            </div>
          </div>
          ) : (
            <div className="hidden lg:flex flex-col w-72 shrink-0 pb-6 animate-in slide-in-from-left duration-700">
              <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-200 relative mb-4">
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Lock size={14} /> Asystent AI Premium
                </p>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Chcesz lepsze odpowiedzi i podpowiedzi w czasie rozmowy? Włącz Premium, aby odblokować Asystenta AI.
                </p>
                <button
                  onClick={onOpenPremium}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-bold transition-colors"
                >
                  <Crown size={16} /> Zobacz Premium
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 w-full max-w-4xl bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-row min-h-[560px]">
            <div className="w-full md:w-2/3 bg-slate-50 p-8 flex flex-col relative border-r border-slate-100">
              <div className="flex-1 overflow-y-auto space-y-5 pr-3" ref={chatScrollRef} style={{ minHeight: 340, maxHeight: 340 }}>
                {chatMessages.map((message) => {
                  const fromPartner = message.from === 'partner';
                  return (
                    <div key={message.id} className={`flex ${fromPartner ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[85%] px-5 py-3.5 rounded-3xl text-lg leading-relaxed shadow-sm ${
                          fromPartner
                            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                            : 'bg-rose-500 text-white rounded-tr-sm'
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  );
                })}
                {isPartnerTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-sm px-6 py-4 flex gap-2 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              
              <div className="mt-5 flex flex-col gap-3">
                <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 pt-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {isPremium ? (
                    aiSuggestions.map((suggestion: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setChatInput(suggestion)}
                        className="whitespace-nowrap bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-300 px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-all flex items-center gap-1"
                      >
                        {isAssistantThinking && idx === 0 ? <Loader2 size={12} className="animate-spin text-amber-500" /> : null}
                        {suggestion}
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={onOpenPremium}
                      className="whitespace-nowrap bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-all inline-flex items-center gap-2"
                    >
                      <Crown size={14} /> Asystent AI w Premium
                    </button>
                  )}
                </div>

                <div className="flex gap-3 relative">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Napisz anonimowo..."
                    className="flex-1 bg-white border-2 border-slate-200 rounded-full pl-6 pr-14 py-4 text-lg outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all shadow-sm"
                  />
                  <button
                    onClick={sendMessage}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-transform hover:scale-105 flex items-center justify-center"
                    aria-label="Wyślij"
                    type="button"
                  >
                    <Send size={20} className="ml-1" />
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden md:flex w-1/3 flex-col items-center justify-start p-8 bg-slate-900 text-white relative">
              <div className="w-full text-center mt-8">
                <div className="relative w-36 h-36 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border border-white/15 shadow-2xl" />
                  <div className="absolute inset-3 rounded-full bg-slate-800/80 border border-white/10" />
                    <div className="absolute inset-0 rounded-full border-2 border-amber-300/30 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center">
                          <UserRound size={40} className="text-slate-200" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-amber-400 border-4 border-slate-900 flex items-center justify-center text-slate-900 shadow-lg">
                          <Lock size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                <p className="text-amber-400 font-bold uppercase text-xs tracking-widest mb-1">Anonimowa rozmowa</p>
                <h4 className="text-2xl font-serif font-bold text-white mb-2">Tajemniczy rozmówca</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Tożsamość odsłoni się tylko przy wzajemnym „Tak”.</p>
              </div>

              <div className="w-full mt-auto mb-4 bg-white/5 rounded-3xl p-6 border border-white/10">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Pozostały czas</span>
                  <span className={`text-5xl font-mono tracking-tight ${chatTimer <= 30 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                    {formatTime(chatTimer)}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-4">
                  <div
                    className="h-full bg-amber-400 transition-all duration-1000 rounded-full"
                    style={{ width: `${(chatTimer / 180) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 'decision' && (
        <div className="max-w-3xl mx-auto animate-in zoom-in duration-300 text-center space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-14 text-center relative overflow-hidden">
            <div className="w-40 h-40 rounded-full bg-slate-50 mx-auto border-8 border-white shadow-xl flex items-center justify-center relative overflow-hidden mb-8">
              <UserRound size={72} className="text-slate-400" />
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                <Clock3 size={40} className="text-white" />
              </div>
            </div>
            <h3 className="text-5xl font-serif font-bold text-slate-800 mb-4">Czas minął!</h3>
            <p className="text-xl text-slate-500 leading-relaxed max-w-xl mx-auto mb-10">
              Czy chcesz kontynuować kontakt? Dopiero jeśli obie osoby klikną „Tak”,
              rozmowa trafi na stałe do skrzynki odbiorczej.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <button
                onClick={() => handleDecision(false)}
                className="bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-5 rounded-full text-xl font-bold flex items-center justify-center gap-3 transition-all"
              >
                <ThumbsDown size={24} /> Podziękuj
              </button>
              <button
                onClick={() => handleDecision(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-5 rounded-full text-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/30 transition-all hover:scale-105"
              >
                <ThumbsUp size={24} /> Tak, chcę kontaktu
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'result-success' && (
        <div className="max-w-3xl mx-auto animate-in zoom-in duration-500">
          <div className="bg-white rounded-[3rem] border border-emerald-100 shadow-2xl p-14 text-center">
            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="w-32 h-32 rounded-full bg-slate-50 border-4 border-white shadow-lg flex items-center justify-center text-5xl">
                👤
              </div>
              <Heart size={56} className="text-rose-500 animate-pulse drop-shadow-md" fill="currentColor" />
              <img src={partner.image} alt={partner.name} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
            </div>
            <div className="mb-10">
              <p className="text-emerald-500 font-bold uppercase tracking-widest text-sm mb-3">Dopasowanie potwierdzone</p>
              <h3 className="text-4xl font-serif font-bold text-slate-800 mb-3">Poznajcie się bliżej — {partner.name}, {partner.age}</h3>
              <p className="text-slate-500 text-lg">{decisionNotice}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => onOpenMessages(partner)}
                className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-5 rounded-full text-lg font-bold shadow-lg shadow-rose-500/30 inline-flex justify-center items-center gap-3 transition-transform hover:scale-105"
              >
                <MessageCircle size={24} /> Przejdź do czatu
              </button>
              <button
                onClick={() => onViewProfile(partner)}
                className="bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-5 rounded-full text-lg font-bold transition-colors"
              >
                Zobacz pełny profil
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'result-no-match' && (
        <div className="max-w-2xl mx-auto animate-in zoom-in duration-300">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-14 text-center">
            <div className="w-24 h-24 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-8 shadow-inner">
              <ThumbsDown size={40} />
            </div>
            <h3 className="text-4xl font-serif font-bold text-slate-800 mb-4">Tym razem poniżej 85%</h3>
            <p className="text-slate-500 text-xl mb-10">Dopasowanie wyniosło {matchPercent ?? 0}%. Spróbuj kolejnej szybkiej randki.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={nextPartner}
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-8 py-5 rounded-full text-lg font-bold shadow-lg shadow-amber-500/20 transition-transform hover:scale-105"
              >
                Następna osoba
              </button>
              <button
                onClick={startSpeedDating}
                className="bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-5 rounded-full text-lg font-bold transition-colors"
              >
                Spróbuj ponownie
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'result-declined' && (
        <div className="max-w-2xl mx-auto animate-in zoom-in duration-300">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-14 text-center">
            <div className="w-24 h-24 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-4xl font-serif font-bold text-slate-800 mb-4">Rozmowa zakończona</h3>
            <p className="text-slate-500 text-xl mb-10">{decisionNotice || 'Dziękujemy za udział w Szybkich Randkach.'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={nextPartner}
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-8 py-5 rounded-full text-lg font-bold shadow-lg shadow-amber-500/20 transition-transform hover:scale-105"
              >
                Następna osoba
              </button>
              <button
                onClick={startSpeedDating}
                className="bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-5 rounded-full text-lg font-bold transition-colors"
              >
                Spróbuj ponownie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export type EmojiKeywordSuggestion = {
  emoji: string;
  keyword: string;
  aliases: string[];
};

type WordRange = {
  start: number;
  end: number;
  word: string;
};

const EMOTICON_REPLACEMENTS: Array<{ pattern: RegExp; emoji: string }> = [
  { pattern: /<3/g, emoji: '❤️' },
  { pattern: /:-?\)/g, emoji: '😊' },
  { pattern: /:-?\(/g, emoji: '🙁' },
  { pattern: /;-?\)/g, emoji: '😉' },
  { pattern: /:-?D/gi, emoji: '😄' },
  { pattern: /:-?P/gi, emoji: '😜' },
  { pattern: /:-?O/gi, emoji: '😮' },
  { pattern: /:-?\*/g, emoji: '😘' },
  { pattern: /:-?\//g, emoji: '😕' },
];

const EMOJI_KEYWORDS: EmojiKeywordSuggestion[] = [
  { emoji: '☕', keyword: 'kawa', aliases: ['kawka', 'espresso', 'latte', 'cappuccino'] },
  { emoji: '❤️', keyword: 'milosc', aliases: ['serce', 'kocham', 'love'] },
  { emoji: '😍', keyword: 'zakochany', aliases: ['crush', 'slodki', 'piekny'] },
  { emoji: '😊', keyword: 'usmiech', aliases: ['radocha', 'milo', 'milego'] },
  { emoji: '😂', keyword: 'smiech', aliases: ['haha', 'heheszki', 'lol'] },
  { emoji: '😘', keyword: 'buzka', aliases: ['calus', 'pocalunek'] },
  { emoji: '😢', keyword: 'smutek', aliases: ['placz', 'przykro', 'tesknota'] },
  { emoji: '🔥', keyword: 'goraco', aliases: ['hot', 'ogień', 'super'] },
  { emoji: '🌹', keyword: 'kwiat', aliases: ['roza', 'bukiet'] },
  { emoji: '🎉', keyword: 'impreza', aliases: ['swieto', 'urodziny', 'gratulacje'] },
  { emoji: '👍', keyword: 'ok', aliases: ['super', 'jasne', 'zgoda'] },
  { emoji: '🙏', keyword: 'dziekuje', aliases: ['prosze', 'wdzieczny'] },
  { emoji: '😎', keyword: 'cool', aliases: ['spoko', 'luz'] },
  { emoji: '🤗', keyword: 'przytulas', aliases: ['przytul', 'hug'] },
  { emoji: '🥰', keyword: 'czulosc', aliases: ['romantycznie', 'slodko'] },
  { emoji: '🍷', keyword: 'wino', aliases: ['lampka', 'kolacja'] },
  { emoji: '🍰', keyword: 'ciasto', aliases: ['deser', 'slodkie'] },
  { emoji: '🍕', keyword: 'pizza', aliases: ['jedzenie', 'kolacja'] },
  { emoji: '🐶', keyword: 'pies', aliases: ['psiak', 'pupil'] },
  { emoji: '🐱', keyword: 'kot', aliases: ['kotek', 'mruczek'] },
];

function normalizeKeyword(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isWordChar(char: string): boolean {
  return /[\p{L}\p{N}_-]/u.test(char);
}

function findWordRangeAtCursor(value: string, cursor: number): WordRange | null {
  const safeCursor = Math.max(0, Math.min(cursor, value.length));

  let start = safeCursor;
  while (start > 0 && isWordChar(value[start - 1])) {
    start -= 1;
  }

  let end = safeCursor;
  while (end < value.length && isWordChar(value[end])) {
    end += 1;
  }

  if (start === end) return null;

  return {
    start,
    end,
    word: value.slice(start, end),
  };
}

export function replaceEmoticonsWithEmoji(value: string): string {
  return EMOTICON_REPLACEMENTS.reduce((nextValue, replacement) => {
    return nextValue.replace(replacement.pattern, replacement.emoji);
  }, value);
}

export function getEmojiSuggestionsAtCursor(
  value: string,
  cursor: number,
  maxSuggestions = 5,
): EmojiKeywordSuggestion[] {
  const range = findWordRangeAtCursor(value, cursor);
  if (!range) return [];

  const normalizedWord = normalizeKeyword(range.word);
  if (normalizedWord.length < 2) return [];

  const matches = EMOJI_KEYWORDS.filter((entry) => {
    const normalizedKeyword = normalizeKeyword(entry.keyword);
    if (normalizedKeyword.startsWith(normalizedWord)) return true;

    return entry.aliases.some((alias) => normalizeKeyword(alias).startsWith(normalizedWord));
  });

  return matches.slice(0, maxSuggestions);
}

export function processEmojiAssistInput(
  rawValue: string,
  cursor: number | null,
  maxSuggestions = 5,
): { value: string; cursor: number; suggestions: EmojiKeywordSuggestion[] } {
  const safeCursor = Math.max(0, Math.min(cursor ?? rawValue.length, rawValue.length));
  const value = replaceEmoticonsWithEmoji(rawValue);

  // Keep caret stable after shortcut replacement.
  const beforeCursor = replaceEmoticonsWithEmoji(rawValue.slice(0, safeCursor));
  const nextCursor = Math.max(0, Math.min(beforeCursor.length, value.length));

  return {
    value,
    cursor: nextCursor,
    suggestions: getEmojiSuggestionsAtCursor(value, nextCursor, maxSuggestions),
  };
}

export function applyEmojiSuggestionAtCursor(
  value: string,
  cursor: number,
  suggestion: EmojiKeywordSuggestion,
): { value: string; cursor: number } {
  const safeCursor = Math.max(0, Math.min(cursor, value.length));
  const range = findWordRangeAtCursor(value, safeCursor);

  if (!range) {
    const insertion = `${suggestion.emoji} `;
    const nextValue = `${value.slice(0, safeCursor)}${insertion}${value.slice(safeCursor)}`;
    return {
      value: nextValue,
      cursor: safeCursor + insertion.length,
    };
  }

  const replacement = `${suggestion.keyword} ${suggestion.emoji}`;
  const nextValue = `${value.slice(0, range.start)}${replacement}${value.slice(range.end)}`;

  return {
    value: nextValue,
    cursor: range.start + replacement.length,
  };
}

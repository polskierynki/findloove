'use client';

import type { EmojiKeywordSuggestion } from '@/lib/emojiAssist';

type EmojiKeywordSuggestionsProps = {
  suggestions: EmojiKeywordSuggestion[];
  onSelect: (suggestion: EmojiKeywordSuggestion) => void;
  className?: string;
};

export default function EmojiKeywordSuggestions({
  suggestions,
  onSelect,
  className,
}: EmojiKeywordSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={[
        'rounded-2xl border border-cyan-500/30 bg-[#0d0919]/95 px-3 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.45),0_0_20px_rgba(0,255,255,0.12)] backdrop-blur-md',
        className || '',
      ].join(' ')}
    >
      <p className="mb-1 text-[10px] uppercase tracking-wider text-cyan-300/70">Podpowiedzi emoji</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.emoji}-${suggestion.keyword}`}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(suggestion)}
            className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100 transition-colors hover:bg-cyan-500/20"
          >
            <span aria-hidden="true">{suggestion.emoji}</span>
            <span>{suggestion.keyword}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

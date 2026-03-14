'use client';

import { useState } from 'react';
import { Flag, X, CheckCircle } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';

const REPORT_REASONS = [
  'Spam lub reklama',
  'Nękanie / prześladowanie',
  'Mowa nienawiści',
  'Nieodpowiednie treści dla dorosłych',
  'Groźby i przemoc',
  'Podszywanie się pod inną osobę',
  'Fałszywe lub wprowadzające w błąd informacje',
  'Inne',
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  reportKind: 'wall-comment' | 'photo-comment' | 'photo-content';
  targetId?: string | null;
  targetContent: string;
  targetAuthorId: string;
  contextLabel?: string;
  reporterProfileId: string | null;
}

export default function ReportCommentModal({
  open,
  onClose,
  reportKind,
  targetId,
  targetContent,
  targetAuthorId,
  contextLabel,
  reporterProfileId,
}: Props) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isPhotoContentReport = reportKind === 'photo-content';
  const reportTitle = isPhotoContentReport ? 'Zgłoś zdjęcie' : 'Zgłoś komentarz';
  const reportScopeLabel = isPhotoContentReport ? 'Zgłaszane zdjęcie' : 'Zgłaszany komentarz';
  const submitLabel = isPhotoContentReport ? 'Zgłoś zdjęcie' : 'Zgłoś komentarz';

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reason || submitting) return;

    const trimmedDescription = description.trim();
    if (reason === 'Inne' && trimmedDescription.length < 6) {
      setSubmitError('Dla opcji "Inne" wpisz krótki opis (min. 6 znaków).');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const finalReason = trimmedDescription
      ? `${reason} | Opis: ${trimmedDescription}`
      : reason;

    try {
      const { error } = await supabase.from('comment_reports').insert({
        comment_id: reportKind === 'wall-comment' ? targetId || null : null,
        photo_comment_id: reportKind === 'photo-comment' ? targetId || null : null,
        comment_type: reportKind === 'wall-comment' ? 'wall' : 'photo',
        comment_content: targetContent,
        comment_author_id: targetAuthorId || null,
        reporter_id: reporterProfileId || null,
        reason: finalReason,
        status: 'pending',
      });
      if (error) {
        console.error('Report insert error:', error);
        setSubmitError(`Błąd: ${error.message}`);
        return;
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error('Report submit exception:', err);
      setSubmitError('Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setSubmitted(false);
    setSubmitError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-sm glass rounded-3xl p-7 border border-red-500/25 shadow-[0_0_60px_rgba(239,68,68,0.15)]">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors rounded-full"
        >
          <X size={18} />
        </button>

        {submitted ? (
          /* ── Potwierdzenie ── */
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} weight="fill" className="text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Zgłoszenie wysłane</h3>
            <p className="text-sm text-cyan-400/70 leading-relaxed">
              Dziękujemy. Nasz zespół moderacji przejrzy komentarz i podejmie odpowiednie działania.
            </p>
            <button
              onClick={handleClose}
              className="mt-5 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            >
              Zamknij
            </button>
          </div>
        ) : (
          /* ── Formularz ── */
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Flag size={18} weight="fill" className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{reportTitle}</h3>
                <p className="text-xs text-cyan-400/55 mt-0.5">Pomóż nam utrzymać bezpieczną przestrzeń</p>
              </div>
            </div>

            {/* Podgląd zgłaszanego elementu */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 mb-5">
              <p className="text-[10px] text-cyan-400/50 uppercase tracking-wider mb-1">{reportScopeLabel}</p>
              {contextLabel ? (
                <p className="text-[11px] text-cyan-300/70 mb-1">{contextLabel}</p>
              ) : null}
              <p className="text-sm text-white/75 italic line-clamp-3">„{targetContent}"</p>
            </div>

            {/* Wybór powodu */}
            <label className="block text-[11px] text-cyan-400/60 uppercase tracking-wider mb-2">
              Powód zgłoszenia
            </label>
            <div className="relative mb-6">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-black/50 border border-cyan-500/20 rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none focus:border-cyan-400/50 appearance-none cursor-pointer transition-colors"
              >
                <option value="" disabled>Wybierz powód...</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r} className="bg-[#0a0710]">{r}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400/50 text-xs">▾</span>
            </div>

            {/* Opis zgłoszenia */}
            <label className="block text-[11px] text-cyan-400/60 uppercase tracking-wider mb-2">
              Dodatkowy opis (opcjonalnie)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Napisz krotko co jest nie tak (co najmniej 6 znakow dla opcji Inne)"
              className="w-full mb-4 bg-black/50 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50 resize-none transition-colors"
            />

            <div className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100/80 leading-relaxed">
              <p className="font-medium text-cyan-200 mb-1">Jak działamy po zgłoszeniu</p>
              <p>Moderator sprawdza treść, może nadać ostrzeżenie (strike), usunąć naruszającą treść i przy powtarzalnych naruszeniach zablokować konto.</p>
            </div>

            {/* Submit */}
            {submitError && (
              <p className="text-xs text-red-400 mb-3 text-center">{submitError}</p>
            )}
            <button
              onClick={() => void handleSubmit()}
              disabled={!reason || submitting}
              className="w-full py-3 rounded-full text-sm font-medium transition-all bg-red-500/80 hover:bg-red-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-[0_0_20px_rgba(239,68,68,0.25)]"
            >
              {submitting ? 'Wysyłanie...' : submitLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { VIRTUAL_GIFTS } from '@/components/views/constants/profileFormOptions';

export type GiftOption = {
  id: string;
  emoji: string;
  name: string;
  price: number;
};

export type GiftSelectionPayload = {
  giftId: string;
  emoji: string;
  label: string;
  price: number;
  message: string;
  isAnonymous: boolean;
};

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend?: (payload: GiftSelectionPayload) => Promise<boolean | void> | boolean | void;
  recipientName?: string;
  currentBalance?: number;
  gifts?: GiftOption[];
  sending?: boolean;
  errorMessage?: string | null;
}

const DEFAULT_GIFTS: GiftOption[] = VIRTUAL_GIFTS.map((gift) => ({
  id: gift.id,
  emoji: gift.emoji,
  name: gift.name,
  price: gift.price,
}));

export default function GiftModal({
  isOpen,
  onClose,
  onSend,
  recipientName = 'User',
  currentBalance = 0,
  gifts = DEFAULT_GIFTS,
  sending = false,
  errorMessage = null,
}: GiftModalProps) {
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    setSelectedGift(null);
    setMessage('');
    setIsAnonymous(false);
  }, [isOpen]);

  const selectedGiftData = gifts.find((gift) => gift.id === selectedGift);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSend = async () => {
    if (!selectedGiftData || sending) return;

    const result = await onSend?.({
      giftId: selectedGiftData.id,
      emoji: selectedGiftData.emoji,
      label: selectedGiftData.name,
      price: selectedGiftData.price,
      message: message.trim(),
      isAnonymous,
    });

    if (result === false) return;

    setSelectedGift(null);
    setMessage('');
    setIsAnonymous(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full w-full items-center justify-center overflow-y-auto px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:px-4 sm:py-6">
        <div className="glass-modal relative w-full max-w-xl overflow-hidden rounded-[2.25rem]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-20 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="gift-modal-scroll max-h-[calc(100dvh-7rem)] overflow-y-auto px-5 pb-5 pt-5 sm:max-h-[calc(100dvh-3rem)] sm:px-8 sm:pb-8 sm:pt-8">
            <h3 className="mb-1 flex items-center gap-2 pr-12 text-xl font-medium text-white">
              <span className="text-2xl">🎁</span> Wyślij prezent
            </h3>
            <p className="mb-6 pr-12 text-sm text-gray-400">
              Zaskocz <span className="font-medium text-white">{recipientName}</span> pięknym upominkiem.
            </p>

            {/* Gifts Grid */}
            <div className="mb-6 grid grid-cols-3 gap-3 overflow-visible py-1">
              {gifts.map((gift) => {
                const canAfford = currentBalance >= gift.price;
                const isSelected = selectedGift === gift.id;

                return (
                  <button
                    key={gift.id}
                    onClick={() => canAfford && !sending && setSelectedGift(gift.id)}
                    disabled={!canAfford || sending}
                    className={`glass relative z-0 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-all group hover:z-20 focus-visible:z-20 ${
                      isSelected
                        ? 'border border-amber-400 bg-amber-500/10'
                        : `border border-white/5 hover:border-amber-400/50 hover:bg-white/10 ${!canAfford ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]'}`
                    }`}
                  >
                    {isSelected && (
                      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-amber-500/20 to-transparent"></div>
                    )}
                    <span className="relative z-10 text-4xl drop-shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-transform group-hover:scale-110">
                      {gift.emoji}
                    </span>
                    <span className="relative z-10 mt-1 text-[11px] uppercase tracking-widest text-gray-200">
                      {gift.name}
                    </span>
                    <span className="relative z-10 flex items-center gap-1 text-xs font-bold text-amber-400">
                      💰 {gift.price}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mb-4 flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
                className="rounded border-white/20 bg-black/30"
                disabled={sending}
              />
              Wyślij jako <span className="text-amber-300">Tajemniczy wielbiciel</span>
            </label>

            {/* Optional Message */}
            <div className="relative mb-5">
              <input
                type="text"
                placeholder="Dodaj komentarz do prezentu (opcjonalnie)..."
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 180))}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-amber-400/50"
                disabled={sending}
              />
              <p className="mt-1 text-right text-[10px] text-white/40">{message.length}/180</p>
            </div>

            {/* Balance */}
            <div className="mb-5 flex items-center justify-between px-1">
              <span className="text-sm text-gray-400">Twoje saldo:</span>
              <span className="flex items-center gap-1.5 font-medium text-white">
                💰 {currentBalance.toLocaleString()}
              </span>
            </div>

            {errorMessage && (
              <p className="mb-4 text-center text-xs text-red-300">{errorMessage}</p>
            )}

            <button
              onClick={() => void handleSend()}
              disabled={!selectedGiftData || sending}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-3.5 font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all hover:from-amber-400 hover:to-yellow-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending
                ? 'Wysyłanie...'
                : selectedGiftData
                ? `Wyślij za ${selectedGiftData.price} monet`
                : 'Wybierz prezent'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

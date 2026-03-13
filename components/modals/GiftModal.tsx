'use client';

import { useEffect, useState } from 'react';
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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-modal rounded-[2.5rem] w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h3 className="text-xl font-medium mb-1 flex items-center gap-2 text-white">
          <span className="text-2xl">🎁</span> Wyślij prezent
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          Zaskocz <span className="text-white font-medium">{recipientName}</span> pięknym upominkiem.
        </p>

        {/* Gifts Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {gifts.map((gift) => {
            const canAfford = currentBalance >= gift.price;
            const isSelected = selectedGift === gift.id;

            return (
              <button
                key={gift.id}
                onClick={() => canAfford && !sending && setSelectedGift(gift.id)}
                disabled={!canAfford || sending}
                className={`glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group overflow-hidden relative ${
                  isSelected
                    ? 'bg-amber-500/10 border border-amber-400'
                    : `border border-white/5 hover:border-amber-400/50 hover:bg-white/10 ${!canAfford ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]'}`
                }`}
              >
                {isSelected && <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent"></div>}
                <span className="text-4xl drop-shadow-[0_0_15px_rgba(239,68,68,0.4)] group-hover:scale-110 transition-transform relative z-10">
                  {gift.emoji}
                </span>
                <span className="text-[11px] text-gray-200 uppercase tracking-widest mt-1 relative z-10">
                  {gift.name}
                </span>
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1 relative z-10">
                  💰 {gift.price}
                </span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300 mb-4">
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
        <div className="mb-5 relative">
          <input
            type="text"
            placeholder="Dodaj komentarz do prezentu (opcjonalnie)..."
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 180))}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-amber-400/50 transition-all"
            disabled={sending}
          />
          <p className="text-[10px] text-white/40 mt-1 text-right">{message.length}/180</p>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between mb-5 px-1">
          <span className="text-sm text-gray-400">Twoje saldo:</span>
          <span className="text-white font-medium flex items-center gap-1.5">
            💰 {currentBalance.toLocaleString()}
          </span>
        </div>

        {errorMessage && (
          <p className="text-xs text-red-300 mb-4 text-center">{errorMessage}</p>
        )}

        <button
          onClick={() => void handleSend()}
          disabled={!selectedGiftData || sending}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl font-bold text-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
        >
          {sending
            ? 'Wysyłanie...'
            : selectedGiftData
            ? `Wyślij za ${selectedGiftData.price} monet`
            : 'Wybierz prezent'}
        </button>
      </div>
    </div>
  );
}

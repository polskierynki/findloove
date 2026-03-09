'use client';

import { useState } from 'react';
import { X, Send } from 'lucide-react';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend?: (giftId: string, message: string) => void;
  recipientName?: string;
  currentBalance?: number;
}

const GIFTS = [
  { id: 'rose', emoji: '🌹', name: 'Róża', price: 50 },
  { id: 'champagne', emoji: '🥂', name: 'Szampan', price: 150 },
  { id: 'teddy', emoji: '🧸', name: 'Miś', price: 300 },
  { id: 'ring', emoji: '💍', name: 'Pierścionek', price: 1000 },
  { id: 'diamond', emoji: '💎', name: 'Diament', price: 5000 },
  { id: 'car', emoji: '🏎️', name: 'Samochód', price: 9999 },
];

export default function GiftModal({
  isOpen,
  onClose,
  onSend,
  recipientName = 'User',
  currentBalance = 1000,
}: GiftModalProps) {
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    if (selectedGift) {
      onSend?.(selectedGift, message);
      setSelectedGift(null);
      setMessage('');
      onClose();
    }
  };

  const selectedGiftData = GIFTS.find((g) => g.id === selectedGift);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-modal rounded-[2rem] w-full max-w-2xl mx-4 p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-3xl font-light text-white mb-2">Wyślij prezent</h2>
        <p className="text-sm text-cyan-400 mb-6">
          Dla: <span className="font-medium">{recipientName}</span>
        </p>

        {/* Balance Display */}
        <div className="glass rounded-xl p-4 mb-6 flex items-center justify-between border border-amber-500/20">
          <span className="text-cyan-400 text-sm">Twoje saldo:</span>
          <span className="text-2xl font-medium text-white flex items-center gap-2">
            💰 {currentBalance.toLocaleString()}
            <span className="text-amber-400 text-sm">monet</span>
          </span>
        </div>

        {/* Gifts Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {GIFTS.map((gift) => {
            const canAfford = currentBalance >= gift.price;
            const isSelected = selectedGift === gift.id;

            return (
              <button
                key={gift.id}
                onClick={() => canAfford && setSelectedGift(gift.id)}
                disabled={!canAfford}
                className={`glass rounded-2xl p-6 flex flex-col items-center gap-3 transition-all relative group ${
                  isSelected
                    ? 'border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                    : canAfford
                    ? 'border border-white/10 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'border border-white/5 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-5xl">{gift.emoji}</div>
                <div className="text-center">
                  <p className="text-white font-medium text-sm">{gift.name}</p>
                  <p className={`text-xs ${canAfford ? 'text-amber-400' : 'text-red-400'} font-semibold mt-1`}>
                    {gift.price} monet
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Optional Message */}
        <div className="mb-6">
          <label className="text-sm text-cyan-400 mb-2 block">Wiadomość (opcjonalne)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-cyan-400/40 outline-none focus:border-cyan-500/50 transition-all resize-none h-24"
            placeholder="Dodaj osobistą wiadomość..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 glass border border-white/20 hover:border-white/30 py-3.5 rounded-xl font-medium transition-all text-white"
          >
            Anuluj
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedGift}
            className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] text-white flex items-center justify-center gap-2"
          >
            <Send size={20} />
            {selectedGiftData
              ? `Wyślij za ${selectedGiftData.price} monet`
              : 'Wybierz prezent'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { X, Smile, Image as ImageIcon } from 'lucide-react';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  profileName?: string;
}

export default function CommentModal({ isOpen, onClose, onSubmit, profileName }: CommentModalProps) {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (comment.trim()) {
      onSubmit(comment);
      setComment('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-modal rounded-[2rem] w-full max-w-lg mx-4 p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-light text-white mb-2">Dodaj komentarz</h2>
        {profileName && (
          <p className="text-sm text-cyan-400 mb-6">
            Komentarz na tablicy: <span className="font-medium">{profileName}</span>
          </p>
        )}

        <div className="relative glass rounded-2xl p-4 mb-4 border border-cyan-500/20">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-transparent border-none text-white outline-none resize-none h-32 placeholder-cyan-400/40"
            placeholder="Napisz coś miłego..."
          />
          
          <div className="flex gap-2 mt-2">
            <button className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-cyan-400 transition-colors">
              <Smile size={18} />
            </button>
            <button className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-cyan-400 transition-colors">
              <ImageIcon size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 glass border border-white/20 hover:border-white/30 py-3 rounded-xl font-medium transition-all text-white"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            disabled={!comment.trim()}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] text-white"
          >
            Opublikuj komentarz
          </button>
        </div>
      </div>
    </div>
  );
}

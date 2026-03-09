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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-modal rounded-[2.5rem] w-full max-w-lg p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h3 className="text-xl font-medium mb-1 flex items-center gap-2 text-white">
          Dodaj komentarz
        </h3>
        {profileName && (
          <p className="text-sm text-gray-400 mb-6">
            Komentarz na tablicy: <span className="font-medium text-white">{profileName}</span>
          </p>
        )}

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none border-glow-cyan resize-none transition-all focus:bg-black/60"
          placeholder="Napisz coś miłego..."
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="text-gray-500 hover:text-cyan-400 transition-colors">
            <Smile size={20} />
          </button>
          <button className="text-gray-500 hover:text-cyan-400 transition-colors">
            <ImageIcon size={20} />
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!comment.trim()}
          className="w-full bg-cyan-600/20 hover:bg-cyan-500 border border-cyan-500/50 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-medium text-white transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)] mt-6"
        >
          Opublikuj komentarz
        </button>
      </div>
    </div>
  );
}

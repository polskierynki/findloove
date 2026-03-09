'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Share2, Send } from 'lucide-react';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  profileName?: string;
  profileAvatar?: string;
  comments?: Array<{ id: string; author: string; text: string; avatar: string }>;
}

export default function GalleryModal({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  profileName = 'User',
  profileAvatar = '',
  comments = [],
}: GalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [newComment, setNewComment] = useState('');

  if (!isOpen || photos.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      console.log('Add comment:', newComment);
      setNewComment('');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex bg-black/95 backdrop-blur-md">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-[160]"
      >
        <X size={24} />
      </button>

      {/* LEFT: Image Viewer */}
      <div className="flex-1 flex items-center justify-center relative">
        <button
          onClick={handlePrev}
          className="absolute left-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
        >
          <ChevronLeft size={24} />
        </button>

        <img
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
        />

        <button
          onClick={handleNext}
          className="absolute right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
        >
          <ChevronRight size={24} />
        </button>

        {/* Image Counter */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm">
          {currentIndex + 1} / {photos.length}
        </div>
      </div>

      {/* RIGHT: Sidebar */}
      <aside className="w-[450px] bg-[#0a0710]/95 backdrop-blur-xl border-l border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          <img
            src={profileAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
            alt={profileName}
            className="w-12 h-12 rounded-full object-cover border border-cyan-500/20"
          />
          <div>
            <h3 className="text-lg font-medium text-white">{profileName}</h3>
            <p className="text-xs text-cyan-400">Zobacz profil</p>
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={comment.avatar}
                  alt={comment.author}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{comment.author}</p>
                  <p className="text-sm text-cyan-300/70 mt-1">{comment.text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-cyan-400/50 py-12">
              <p>Brak komentarzy</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/10 space-y-4">
          <div className="flex gap-3">
            <button className="flex-1 glass border border-white/10 hover:border-red-500/50 py-3 rounded-xl flex items-center justify-center gap-2 text-white hover:text-red-400 transition-all">
              <Heart size={20} />
              Polub
            </button>
            <button className="flex-1 glass border border-white/10 hover:border-cyan-500/50 py-3 rounded-xl flex items-center justify-center gap-2 text-white hover:text-cyan-400 transition-all">
              <Share2 size={20} />
              Udostępnij
            </button>
          </div>

          {/* Add Comment */}
          <div className="relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-5 pr-12 text-white placeholder-cyan-400/40 outline-none focus:border-cyan-500/50 transition-all"
              placeholder="Dodaj komentarz..."
            />
            <button
              onClick={handleAddComment}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

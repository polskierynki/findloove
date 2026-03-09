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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 lg:p-10 bg-black/90 backdrop-blur-md">
      <div className="glass-modal w-full max-w-7xl h-full lg:h-[85vh] lg:rounded-[2.5rem] flex flex-col lg:flex-row overflow-hidden">
        
        {/* Close Button for Mobile */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors lg:hidden z-50"
        >
          <X size={24} />
        </button>

        {/* LEFT: Image Viewer */}
        <div className="flex-1 bg-black flex items-center justify-center relative group">
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
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
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="w-full lg:w-[450px] bg-[#0a0710] flex flex-col border-l border-white/10 shrink-0 h-[50vh] lg:h-auto">
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <img
                src={profileAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
                alt={profileName}
                className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              />
              <div>
                <h4 className="text-white font-medium text-sm flex items-center gap-1">
                  {profileName}
                </h4>
                <p className="text-xs text-cyan-400">Dodano 2 dni temu</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors hidden lg:block"
            >
              <X size={24} />
            </button>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <img
                    src={comment.avatar}
                    alt={comment.author}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                  />
                  <div>
                    <span className="text-sm font-medium text-white mr-2">{comment.author}</span>
                    <span className="text-xs text-gray-500">1 dzień temu</span>
                    <p className="text-[14px] text-gray-300 mt-1 font-light leading-snug">
                      {comment.text}
                    </p>
                    <div className="mt-1.5 flex gap-4">
                      <button className="text-xs text-gray-500 font-medium hover:text-white transition-colors">
                        Odpowiedz
                      </button>
                      <button className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1">
                        <Heart size={12} /> 0
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-12 text-sm">
                Brak komentarzy
              </div>
            )}
          </div>

          {/* Actions & Input */}
          <div className="p-5 border-t border-white/10 bg-black/20 shrink-0">
            <div className="flex gap-4 mb-3">
              <button className="text-gray-400 hover:text-red-500 transition-colors">
                <Heart size={24} />
              </button>
              <button className="text-gray-400 hover:text-cyan-400 transition-colors">
                <Share2 size={24} />
              </button>
            </div>
            <p className="text-[13px] text-white font-medium mb-3">Liczba polubień: <span className="text-cyan-400">124</span></p>

            {/* Add Comment */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Dodaj komentarz..."
                className="w-full bg-black/40 border border-white/10 rounded-full py-3 pl-5 pr-12 text-sm text-white outline-none focus:border-cyan-500/50 focus:bg-black/60 transition-all placeholder-gray-500"
              />
              <button
                onClick={handleAddComment}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 p-2 rounded-full hover:bg-cyan-500/20 transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

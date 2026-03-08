'use client';

import { X, Camera, FileText, Briefcase, AlertCircle } from 'lucide-react';
import { ProfileCompletionLevel } from '@/lib/profileCompletion';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  completionLevel: ProfileCompletionLevel;
  onGoToProfile: () => void;
}

export default function ProfileCompletionModal({ 
  isOpen, 
  onClose, 
  completionLevel,
  onGoToProfile 
}: ProfileCompletionModalProps) {
  if (!isOpen) return null;

  const tasks = [
    {
      id: 'photo',
      icon: <Camera size={20} />,
      label: 'Dodaj swoje zdjęcie',
      description: 'Zobacz zdjęcia innych użytkowników',
      completed: completionLevel.hasPhoto,
      color: 'rose',
    },
    {
      id: 'bio',
      icon: <FileText size={20} />,
      label: 'Napisz opis (min. 20 znaków)',
      description: 'Czytaj opisy profili innych',
      completed: completionLevel.hasBio,
      color: 'amber',
    },
    {
      id: 'contact',
      icon: <Briefcase size={20} />,
      label: 'Uzupełnij zawód i zainteresowania',
      description: 'Wysyłaj wiadomości i kontaktuj się',
      completed: completionLevel.hasContactInfo,
      color: 'emerald',
    },
  ];

  const nextTask = tasks.find(t => !t.completed);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-rose-500 to-pink-500 p-6 rounded-t-3xl text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 backdrop-blur p-3 rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Uzupełnij swój profil</h3>
              <p className="text-rose-100 text-sm">Zdjęcie za zdjęcie, opis za opis</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-slate-600 text-sm leading-relaxed">
            Aby chronić prywatność użytkowników i zachęcać do autentyczności, 
            treści innych odblokowujesz uzupełniając swój profil:
          </p>

          {/* Tasks */}
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                  task.completed
                    ? 'bg-emerald-50 border-emerald-200'
                    : nextTask?.id === task.id
                    ? `bg-${task.color}-50 border-${task.color}-300 ring-2 ring-${task.color}-100`
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  task.completed
                    ? 'bg-emerald-500 text-white'
                    : `bg-${task.color}-100 text-${task.color}-600`
                }`}>
                  {task.completed ? '✓' : task.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${
                    task.completed ? 'text-emerald-700 line-through' : 'text-slate-800'
                  }`}>
                    {task.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-4">
            <button
              onClick={onGoToProfile}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg shadow-rose-200"
            >
              Uzupełnij teraz →
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2.5 text-slate-500 text-sm hover:text-slate-700 transition-colors"
            >
              Później
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

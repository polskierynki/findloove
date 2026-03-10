'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { createPortal } from 'react-dom';
import EmojiPicker from 'emoji-picker-react';
import { X, Send } from 'lucide-react';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Dzień dobry! Jestem Pan Serduszko, Pana/Pani asystent w portalu findloove.pl 💝 W czym mogę pomóc?',
      },
    ],
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, isOpen]);

  const QUICK_QUESTIONS = [
    'Jak napisać pierwszą wiadomość?',
    'Jak rozpoznać oszusta?',
    'Jak działają Szybkie Randki?',
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-14 right-4 z-50 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200"
      style={{ height: '520px', width: '360px', maxWidth: 'calc(100vw - 2rem)' }}
    >
      {/* Header */}
      <div className="bg-rose-500 px-5 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-lg shadow-sm shrink-0">
              🤖
            </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Pan Serduszko</p>
            <p className="text-rose-100 text-xs">Asystent findloove.pl • online</p>
          </div>
        </div>
        <button onClick={onClose} className="text-rose-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-rose-600">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m) => {
              const isAI = m.role === 'assistant';
              return (
                <div key={m.id} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                  {isAI && (
                    <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-sm mr-2 shrink-0 mt-1">
                      🤖
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isAI
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                        : 'bg-rose-500 text-white rounded-tr-none'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-sm mr-2 shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Szybkie pytania — tylko na początku */}
            {messages.length === 1 && (
              <div className="space-y-2 pt-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      handleInputChange({ target: { value: q } } as React.ChangeEvent<HTMLInputElement>);
                      setTimeout(() => {
                        const form = document.getElementById('serduszko-form') as HTMLFormElement;
                        form?.requestSubmit();
                      }, 50);
                    }}
                    className="w-full text-left text-sm px-3 py-2 rounded-xl bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

      {/* Input */}
      <div className="border-t border-slate-100 bg-white p-3 shrink-0">
        <form
          id="serduszko-form"
          onSubmit={handleSubmit}
          className="flex gap-2 items-center"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Napisz do Pana Serduszko..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-200 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="bg-rose-100 text-rose-600 p-2.5 rounded-xl hover:bg-rose-200 transition-all"
            title="Dodaj emoji"
          >
            😀
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-rose-500 text-white p-2.5 rounded-xl hover:bg-rose-600 disabled:opacity-40 transition-all"
          >
            <Send size={16} />
          </button>
        </form>
        {showEmojiPicker && isClient && createPortal(
          <div className="fixed inset-0 z-[199]" onClick={() => setShowEmojiPicker(false)}>
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-xl shadow-xl flex justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <EmojiPicker
                onEmojiClick={(e) => {
                  handleInputChange({
                    target: { value: input + e.emoji },
                  } as React.ChangeEvent<HTMLInputElement>);
                  inputRef.current?.focus();
                  setShowEmojiPicker(false);
                }}
                height={300}
                width={280}
              />
            </div>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Send, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  image: string;
  isActive: boolean;
}

export default function NewMessagesView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    // Mock conversations for demo
    setConversations([
      {
        id: '1',
        name: 'Kasia',
        lastMessage: 'Zdecydowanie wino i kino! 🍷',
        timestamp: 'Teraz',
        image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=150&q=80',
        isActive: true,
      },
      {
        id: '2',
        name: 'Agnieszka',
        lastMessage: 'Dzięki za serduszko! Skąd jesteś?',
        timestamp: 'Wczoraj',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80',
        isActive: false,
      },
    ]);

    if (selectedConversation) {
      setMessages([
        {
          id: '1',
          text: 'Cześć Kasia! Widzę w tagach, że lubisz dobre jedzenie. Wolisz włoską pizzę czy sushi? 😊',
          isFromMe: true,
          timestamp: '14:23',
        },
        {
          id: '2',
          text: 'Hej! 👋 Zdecydowanie włoska kuchnia. Pizza to moje życie, ale dobrej pasty też nie odmówię. A Ty?',
          isFromMe: false,
          timestamp: '14:25',
        },
        {
          id: '3',
          text: 'Też włoska! Znam świetną knajpę niedaleko centrum. Może kino i wino w weekend? 🎬',
          isFromMe: true,
          timestamp: '14:26',
        },
        {
          id: '4',
          text: 'Zdecydowanie wino i kino! 🍷',
          isFromMe: false,
          timestamp: '14:27',
        },
      ]);
    }
  }, [selectedConversation]);

  return (
    <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
      <div className="glass rounded-[2rem] w-full chat-height flex overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        {/* Left Column: Contacts */}
        <div className="w-full md:w-80 lg:w-96 border-r border-white/5 bg-black/20 flex flex-col">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-2xl font-light mb-4">Wiadomości</h2>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Szukaj pary..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white outline-none border-glow-cyan transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${
                  selectedConversation?.id === conv.id
                    ? 'bg-white/10 border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(0,255,255,0.05)]'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className={`relative w-12 h-12 rounded-full p-[2px] ${selectedConversation?.id === conv.id ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-500' : 'bg-white/20'}`}>
                  <img src={conv.image} className="w-full h-full rounded-full object-cover border border-black" alt={conv.name} />
                  {conv.isActive && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#110a22] rounded-full"></span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-white font-medium truncate">{conv.name}</h4>
                    <span className={`text-xs ${selectedConversation?.id === conv.id ? 'text-cyan-400' : 'text-gray-500'}`}>{conv.timestamp}</span>
                  </div>
                  <p className={`text-sm truncate ${selectedConversation?.id === conv.id ? 'text-gray-200' : 'text-gray-400'}`}>{conv.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="flex-1 flex flex-col bg-black/10 relative hidden md:flex">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                    <img src={selectedConversation.image} alt={selectedConversation.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{selectedConversation.name}</h3>
                    <p className={`text-xs ${selectedConversation.isActive ? 'text-green-400 font-light' : 'text-gray-500'}`}>
                      {selectedConversation.isActive ? 'Dostępna' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-3xl text-sm ${msg.isFromMe ? 'chat-bubble-me' : 'chat-bubble-them'} shadow-lg`}>
                      <p className={msg.isFromMe ? 'text-white' : 'text-gray-200'}>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-sm">
                <div className="relative flex items-center bg-black/40 border border-white/10 rounded-full px-2 py-2 border-glow-magenta transition-all focus-within:bg-black/60">
                  <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-fuchsia-400 transition-colors rounded-full">
                    😊
                  </button>
                  <input
                    type="text"
                    placeholder="Napisz wiadomość..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-transparent border-none text-white text-sm px-4 outline-none"
                  />
                  <button className="w-10 h-10 bg-gradient-to-tr from-fuchsia-600 to-cyan-600 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,0,255,0.4)] mr-1">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 text-gray-400">
              <MessageCircle size={64} className="opacity-30" />
              <p className="text-xl font-light">Wybierz rozmowę, aby начать</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

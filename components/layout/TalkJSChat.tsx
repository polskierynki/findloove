'use client';

import { useEffect, useState } from 'react';
import { Chatbox } from '@talkjs/react-components';
import { AlertCircle } from 'lucide-react';

interface TalkJSChatProps {
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserImage?: string;
}

/**
 * TalkJS Chatbox dla rozmów 1:1
 * Automatycznie generuje unikalny conversationId na podstawie ID obu użytkowników
 */
export default function TalkJSChat({
  currentUserId,
  otherUserId,
  otherUserName,
}: TalkJSChatProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Konwersacja musi być deterministic - zawsze taka sama dla pary użytkowników
  const conversationId = [currentUserId, otherUserId].sort().join('_');

  // Załaduj TalkJS Script (wymagany dla Chatbox)
  useEffect(() => {
    // Sprawdź czy Talk jest już załadowany
    if (typeof window !== 'undefined' && !(window as any).Talk) {
      const script = document.createElement('script');
      script.src = 'https://cdn.talkjs.com/talk.js';
      script.async = true;
      script.onload = () => {
        setReady(true);
      };
      script.onerror = () => {
        setError('Nie udało się załadować TalkJS');
      };
      document.body.appendChild(script);
    } else if ((window as any).Talk) {
      setReady(true);
    }

    return () => {
      // Nie usuwamy scriptu - może być potrzebny później
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div className="space-y-4">
          <AlertCircle size={48} className="text-red-500 mx-auto" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-white">
      {ready ? (
        <Chatbox
          appId="tGMNi9UN"
          userId={currentUserId}
          conversationId={conversationId}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-rose-300 border-t-rose-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Ładowanie czatu...</p>
          </div>
        </div>
      )}
    </div>
  );
}

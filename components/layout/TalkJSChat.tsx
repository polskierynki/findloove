'use client';

import { useEffect, useState } from 'react';
import { Chatbox, Session } from '@talkjs/react-components';

interface TalkJSChatProps {
  currentUserId: string;
  otherUserId?: string;
  otherUserName?: string;
  otherUserImage?: string;
}

/**
 * TalkJS full chat interface with inbox and conversation list
 * Auto-loads all conversations for the current user
 */
export default function TalkJSChat({
  currentUserId,
}: TalkJSChatProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load TalkJS Script
  useEffect(() => {
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
      // Don't remove the script - it might be needed later
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center w-full">
        <div className="space-y-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-black/10 flex flex-col w-full">
      {ready ? (
        <Session appId="tGMNi9UN" userId={currentUserId}>
          <Chatbox
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </Session>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-cyan-500/40 border-t-cyan-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-cyan-400">Ładowanie czatu...</p>
          </div>
        </div>
      )}
    </div>
  );
}

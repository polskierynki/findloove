'use client';

import { useEffect, useRef, useState } from 'react';

const TALKJS_APP_ID = 'tGMNi9UN';
const TALKJS_THEME_NAME = process.env.NEXT_PUBLIC_TALKJS_THEME_NAME?.trim() || '';
const TALKJS_ROLE_NAME = process.env.NEXT_PUBLIC_TALKJS_ROLE_NAME?.trim() || '';

type TalkUser = {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
};

interface TalkJSChatProps {
  currentUser: TalkUser;
  targetUser?: TalkUser | null;
}

type TalkConversation = {
  setParticipant: (user: unknown) => void;
  setAttributes?: (attrs: Record<string, unknown>) => void;
};

function buildDemoThemeConfig(): Record<string, unknown> {
  const theme: Record<string, unknown> = {
    custom: {
      brand: 'findloove-demo',
      shellBg: '#0b071a',
      panelBg: '#130b2a',
      accentPrimary: '#00ffff',
      accentSecondary: '#ff00ff',
      textPrimary: '#f5f7ff',
      textMuted: '#95a2c7',
    },
  };

  if (TALKJS_THEME_NAME) {
    theme.name = TALKJS_THEME_NAME;
  }

  return theme;
}

type TalkWindow = Window & {
  Talk?: {
    ready: Promise<void>;
    User: new (config: Record<string, unknown>) => unknown;
    Session: new (config: Record<string, unknown>) => {
      getOrCreateConversation: (id: string) => TalkConversation;
      createInbox: (config?: Record<string, unknown>) => {
        mount: (element: HTMLElement) => Promise<void> | void;
        destroy?: () => void;
      };
      destroy?: () => void;
    };
  };
};

async function ensureTalkScriptLoaded(): Promise<void> {
  const win = window as TalkWindow;
  if (win.Talk) return;

  const existingScript = document.querySelector('script[data-talkjs-sdk="1"]') as HTMLScriptElement | null;
  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('TalkJS script error')), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.talkjs.com/talk.js';
    script.async = true;
    script.dataset.talkjsSdk = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TalkJS script load failed'));
    document.body.appendChild(script);
  });
}

/**
 * TalkJS inbox rendered with JS SDK.
 * This path synchronizes users on the fly and avoids "User not found" errors.
 */
export default function TalkJSChat({ currentUser, targetUser }: TalkJSChatProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    let inboxInstance: { destroy?: () => void } | null = null;
    let sessionInstance: { destroy?: () => void } | null = null;

    const initTalk = async () => {
      try {
        setError(null);
        setReady(false);

        await ensureTalkScriptLoaded();

        const win = window as TalkWindow;
        const talk = win.Talk;

        if (!talk || !containerRef.current) {
          throw new Error('TalkJS is unavailable');
        }

        await talk.ready;

        const me = new talk.User({
          id: currentUser.id,
          name: currentUser.name || 'Uzytkownik',
          email: currentUser.email || undefined,
          photoUrl: currentUser.photoUrl || undefined,
          role: TALKJS_ROLE_NAME || undefined,
        });

        const session = new talk.Session({
          appId: TALKJS_APP_ID,
          me,
        });
        sessionInstance = session;

        const inboxConfig: Record<string, unknown> = {
          theme: buildDemoThemeConfig(),
        };

        let inbox;

        if (targetUser?.id && targetUser.id !== currentUser.id) {
          const other = new talk.User({
            id: targetUser.id,
            name: targetUser.name || 'Uzytkownik',
            email: targetUser.email || undefined,
            photoUrl: targetUser.photoUrl || undefined,
            role: TALKJS_ROLE_NAME || undefined,
          });

          const conversationId = [currentUser.id, targetUser.id].sort().join('_');
          const conversation = session.getOrCreateConversation(conversationId);
          conversation.setParticipant(me);
          conversation.setParticipant(other);

          // If dashboard theme reads conversation custom fields, this keeps style consistent.
          conversation.setAttributes?.({
            custom: {
              themePreset: 'findloove-demo',
              accent: 'neon-cyan-magenta',
            },
          });

          inboxConfig.selected = conversation;
        } else {
          // Inbox without preselected conversation still uses the same theme shell.
        }

        inbox = session.createInbox(inboxConfig);

        inboxInstance = inbox;
        await inbox.mount(containerRef.current);

        if (mounted) {
          setReady(true);
        }
      } catch (err) {
        console.error('TalkJS init error:', err);
        if (mounted) {
          setError('Nie udalo sie uruchomic czatu. Odswiez strone i sproboj ponownie.');
        }
      }
    };

    void initTalk();

    return () => {
      mounted = false;
      try {
        inboxInstance?.destroy?.();
      } catch (e) {
        console.error('TalkJS inbox cleanup error:', e);
      }
      try {
        sessionInstance?.destroy?.();
      } catch (e) {
        console.error('TalkJS session cleanup error:', e);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [
    currentUser.id,
    currentUser.name,
    currentUser.email,
    currentUser.photoUrl,
    targetUser?.id,
    targetUser?.name,
    targetUser?.email,
    targetUser?.photoUrl,
  ]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center w-full">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden w-full talkjs-shell talkjs-embed">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-cyan-500/40 border-t-cyan-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-cyan-300">Ladowanie czatu...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

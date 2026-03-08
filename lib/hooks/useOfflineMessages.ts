'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PendingMessage } from '@/lib/offlineMessages';
import {
  getPendingMessagesForConversation,
  addPendingMessage,
  markMessageAsSent,
  deletePendingMessage,
} from '@/lib/offlineMessages';

interface UseOfflineMessagesProps {
  conversationId: string;
  isOnline: boolean;
}

export function useOfflineMessages({ conversationId, isOnline }: UseOfflineMessagesProps) {
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Load pending messages on mount and when conversationId changes
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messages = await getPendingMessagesForConversation(conversationId);
        setPendingMessages(messages);
      } catch (error) {
        console.error('Failed to load pending messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  // Add message to offline queue
  const queueMessage = useCallback(
    async (userId: string, otherUserId: string, content: string): Promise<PendingMessage> => {
      try {
        const message = await addPendingMessage(
          conversationId,
          userId,
          otherUserId,
          content
        );
        setPendingMessages((prev) => [...prev, message]);
        return message;
      } catch (error) {
        console.error('Failed to queue message:', error);
        throw error;
      }
    },
    [conversationId]
  );

  // Mark message as sent (removes from queue)
  const markSent = useCallback(async (messageId: string) => {
    try {
      await markMessageAsSent(messageId);
      setPendingMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error('Failed to mark message as sent:', error);
      throw error;
    }
  }, []);

  // Delete message from queue
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await deletePendingMessage(messageId);
      setPendingMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error('Failed to delete pending message:', error);
      throw error;
    }
  }, []);

  return {
    pendingMessages,
    loading,
    queueMessage,
    markSent,
    deleteMessage,
  };
}

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SupabaseMessage } from '@/lib/types';

const MY_PROFILE_ID = '00000000-0000-0000-0000-000000000001';

export function useMessages(otherProfileId: string | null) {
  const [messages, setMessages] = useState<SupabaseMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!otherProfileId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(from_profile_id.eq.${MY_PROFILE_ID},to_profile_id.eq.${otherProfileId}),` +
        `and(from_profile_id.eq.${otherProfileId},to_profile_id.eq.${MY_PROFILE_ID})`
      )
      .order('created_at', { ascending: true });

    setMessages(data ?? []);
    setLoading(false);
  }, [otherProfileId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (content: string): Promise<boolean> => {
    if (!otherProfileId || !content.trim()) {
      return false;
    }

    const { error } = await supabase.from('messages').insert({
      from_profile_id: MY_PROFILE_ID,
      to_profile_id: otherProfileId,
      content,
    });

    if (!error) {
      await fetchMessages();
      return true;
    }
    return false;
  };

  return { messages, loading, sendMessage, refreshMessages: fetchMessages };
}

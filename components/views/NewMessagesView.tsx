'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MagnifyingGlass, Prohibit, Trash, Flag, PaperPlaneRight, ArrowLeft } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';

const HIDDEN_ADMIN_EMAILS = new Set([
  'lio1985lodz@gmail.com',
]);

function isHiddenAdminProfile(profile: { role?: string | null; email?: string | null }): boolean {
  const normalizedRole = (profile.role || '').trim().toLowerCase();
  const normalizedEmail = (profile.email || '').trim().toLowerCase();

  return (
    normalizedRole === 'admin' ||
    normalizedRole === 'super_admin' ||
    HIDDEN_ADMIN_EMAILS.has(normalizedEmail)
  );
}

async function resolveProfileIdForAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const normalizedEmail = user.email?.trim().toLowerCase() || null;

  // 1) Preferred mapping: profile row with the same id as auth user id.
  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!byIdError && byId?.id) {
    return byId.id as string;
  }

  // 2) Fallback mapping by email for legacy accounts migrated from older schema.
  if (normalizedEmail) {
    const { data: byEmail, error: byEmailError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!byEmailError && byEmail?.id) {
      return byEmail.id as string;
    }
  }

  // 3) Last resort: create a minimal profile row so FK on messages can pass.
  const fallbackName =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
    'Uzytkownik';

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: normalizedEmail,
        name: fallbackName,
        age: 30,
        city: 'Nieznane',
        bio: '',
        interests: [],
        image_url: '',
      },
      { onConflict: 'id' },
    )
    .select('id')
    .maybeSingle();

  if (createError) {
    console.error('Nie udalo sie utworzyc/finalizowac profilu dla czatu:', createError.message);
    return null;
  }

  return (created?.id as string | undefined) || user.id;
}

interface Message {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  content: string;
  created_at: string;
}

interface ConversationProfile {
  id: string;
  name: string;
  image_url: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

function mergeMessagesUnique(rows: Message[]): Message[] {
  const merged = new Map<string, Message>();
  rows.forEach((row) => {
    merged.set(row.id, row);
  });
  return Array.from(merged.values());
}

export default function NewMessagesView() {
  const [targetProfileId, setTargetProfileId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ConversationProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const identityIds = useMemo(
    () => Array.from(new Set([authUserId, currentUserId].filter(Boolean))) as string[],
    [authUserId, currentUserId],
  );

  const identityChannelKey = useMemo(
    () => (identityIds.length > 0 ? identityIds.join('_') : 'none'),
    [identityIds],
  );

  // Read direct-chat target from URL without coupling hydration to search params.
  useEffect(() => {
    const readTargetFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const rawTarget = params.get('user');
      setTargetProfileId(rawTarget ? rawTarget.trim() : null);
    };

    readTargetFromLocation();
    window.addEventListener('popstate', readTargetFromLocation);

    return () => {
      window.removeEventListener('popstate', readTargetFromLocation);
    };
  }, []);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAuthUserId(null);
        setCurrentUserId(null);
        setLoading(false);
        return;
      }

      setAuthUserId(user.id);

      const resolvedProfileId = await resolveProfileIdForAuthUser(user);
      if (!resolvedProfileId) {
        setChatError('Nie mozna uruchomic czatu, bo profil konta nie zostal poprawnie znaleziony.');
      }
      setCurrentUserId(resolvedProfileId);
      setLoading(false);
    };

    void getCurrentUser();
  }, []);

  const loadConversations = useCallback(async () => {
    if (identityIds.length === 0) return;

    try {
      setChatError(null);

      const [fromMessagesResult, toMessagesResult] = await Promise.all([
        supabase
          .from('messages')
          .select('id, from_profile_id, to_profile_id, content, created_at')
          .in('from_profile_id', identityIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('id, from_profile_id, to_profile_id, content, created_at')
          .in('to_profile_id', identityIds)
          .order('created_at', { ascending: false }),
      ]);

      if (fromMessagesResult.error) {
        throw fromMessagesResult.error;
      }
      if (toMessagesResult.error) {
        throw toMessagesResult.error;
      }

      const conversationMessages = mergeMessagesUnique([
        ...((fromMessagesResult.data as Message[]) || []),
        ...((toMessagesResult.data as Message[]) || []),
      ]).sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      const newestConversationByPartner = new Map<
        string,
        { lastMessage: string; lastMessageTime: string }
      >();

      (conversationMessages || []).forEach((row) => {
        const fromId = row.from_profile_id as string;
        const toId = row.to_profile_id as string;
        const fromIsMe = identityIds.includes(fromId);
        const toIsMe = identityIds.includes(toId);

        if (!fromIsMe && !toIsMe) return;

        const partnerId = fromIsMe ? toId : fromId;
        if (!partnerId || identityIds.includes(partnerId)) return;

        if (!newestConversationByPartner.has(partnerId)) {
          newestConversationByPartner.set(partnerId, {
            lastMessage: (row.content as string) || '',
            lastMessageTime: (row.created_at as string) || '',
          });
        }
      });

      if (newestConversationByPartner.size === 0) {
        setConversations([]);
        return;
      }

      const partnerIds = Array.from(newestConversationByPartner.keys());
      let profileRows: Array<{ id: string; name?: string | null; image_url?: string | null; role?: string | null; email?: string | null }> = [];

      const { data: profilesWithAdminData, error: profilesWithAdminDataError } = await supabase
        .from('profiles')
        .select('id, name, image_url, role, email')
        .in('id', partnerIds);

      if (profilesWithAdminDataError) {
        console.error('Blad ladowania profili rozmowcow (pelne pola):', profilesWithAdminDataError.message);
        const { data: fallbackProfiles, error: fallbackProfilesError } = await supabase
          .from('profiles')
          .select('id, name, image_url')
          .in('id', partnerIds);

        if (fallbackProfilesError) {
          console.error('Blad ladowania profili rozmowcow (fallback):', fallbackProfilesError.message);
        }

        profileRows = (fallbackProfiles || []).map((profile) => ({
          id: profile.id as string,
          name: (profile as { name?: string | null }).name,
          image_url: (profile as { image_url?: string | null }).image_url,
          role: null,
          email: null,
        }));
      } else {
        profileRows = (profilesWithAdminData || []).map((profile) => ({
          id: profile.id as string,
          name: (profile as { name?: string | null }).name,
          image_url: (profile as { image_url?: string | null }).image_url,
          role: (profile as { role?: string | null }).role,
          email: (profile as { email?: string | null }).email,
        }));
      }

      const profileMap = new Map(profileRows.map((profile) => [profile.id, profile]));

      const conversationsData: ConversationProfile[] = partnerIds
        .flatMap((partnerId) => {
          const preview = newestConversationByPartner.get(partnerId);
          if (!preview) return [];

          const partnerProfile = profileMap.get(partnerId);
          if (partnerProfile && isHiddenAdminProfile(partnerProfile)) {
            return [];
          }

          return [{
            id: partnerId,
            name: partnerProfile?.name || 'Uzytkownik',
            image_url: partnerProfile?.image_url || '',
            lastMessage: preview.lastMessage,
            lastMessageTime: preview.lastMessageTime,
          }];
        })
        .sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return timeB - timeA;
        });

      setConversations(conversationsData);
      setSelectedProfile((currentSelectedProfile) => {
        if (!currentSelectedProfile) return currentSelectedProfile;
        return conversationsData.find((conversation) => conversation.id === currentSelectedProfile.id) || currentSelectedProfile;
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
      const code = (error as { code?: string } | null)?.code;
      const message = (error as { message?: string } | null)?.message;
      if (code === '42501') {
        setChatError('Brak uprawnien do czatu (RLS). Uruchom migracje: supabase/fix_messages_rls_simple.sql.');
      } else if (message) {
        setChatError(`Brak dostepu do listy rozmow: ${message}`);
      }
    }
  }, [identityIds]);

  // Load conversations
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Keep left-side conversation previews up to date in real-time.
  useEffect(() => {
    if (identityIds.length === 0) return;

    const conversationChannel = supabase
      .channel(`messages-conversations-${identityChannelKey}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const nextMessage = payload.new as Message;
        const touchesMyConversationList =
          identityIds.includes(nextMessage.from_profile_id) ||
          identityIds.includes(nextMessage.to_profile_id);

        if (touchesMyConversationList) {
          void loadConversations();
        }
      })
      .subscribe();

    return () => {
      conversationChannel.unsubscribe();
    };
  }, [identityChannelKey, identityIds, loadConversations]);

  // Open direct conversation when arriving from profile cards (`/messages?user=<id>`)
  useEffect(() => {
    if (!targetProfileId || identityIds.length === 0 || identityIds.includes(targetProfileId)) return;

    const existing = conversations.find((c) => c.id === targetProfileId);
    if (existing) {
      if (selectedProfile?.id !== existing.id) {
        setSelectedProfile(existing);
      }
      return;
    }

    const loadTargetProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, image_url, role, email')
        .eq('id', targetProfileId)
        .maybeSingle();

      if (error || !data) return;
      if (isHiddenAdminProfile(data as { role?: string | null; email?: string | null })) return;

      const directConversation: ConversationProfile = {
        id: data.id as string,
        name: (data as { name?: string | null }).name || 'User',
        image_url: (data as { image_url?: string | null }).image_url || '',
        lastMessage: '',
        lastMessageTime: '',
      };

      setConversations((prev) => {
        if (prev.some((c) => c.id === directConversation.id)) return prev;
        return [directConversation, ...prev];
      });
      setSelectedProfile(directConversation);
    };

    void loadTargetProfile();
  }, [conversations, identityIds, selectedProfile?.id, targetProfileId]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedProfile || identityIds.length === 0) return;

    const loadMessages = async () => {
      try {
        setChatError(null);

        const [outgoingResult, incomingResult] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .in('from_profile_id', identityIds)
            .eq('to_profile_id', selectedProfile.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('messages')
            .select('*')
            .eq('from_profile_id', selectedProfile.id)
            .in('to_profile_id', identityIds)
            .order('created_at', { ascending: true }),
        ]);

        if (outgoingResult.error) {
          throw outgoingResult.error;
        }
        if (incomingResult.error) {
          throw incomingResult.error;
        }

        const mergedMessages = mergeMessagesUnique([
          ...((outgoingResult.data as Message[]) || []),
          ...((incomingResult.data as Message[]) || []),
        ]).sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        });

        setMessages(mergedMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
        const code = (error as { code?: string } | null)?.code;
        const message = (error as { message?: string } | null)?.message;
        if (code === '42501') {
          setChatError('Brak uprawnien do wiadomosci (RLS). Uruchom migracje: supabase/fix_messages_rls_simple.sql.');
        } else if (message) {
          setChatError(`Brak dostepu do wiadomosci: ${message}`);
        }
      }
    };

    loadMessages();

    // Subscribe to new messages in real-time
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const nextMessage = payload.new as Message;
        const isRelevant =
          (nextMessage.from_profile_id === selectedProfile.id && identityIds.includes(nextMessage.to_profile_id)) ||
          (nextMessage.to_profile_id === selectedProfile.id && identityIds.includes(nextMessage.from_profile_id));

        if (isRelevant) {
          setMessages((prev) => (prev.some((msg) => msg.id === nextMessage.id) ? prev : [...prev, nextMessage]));
        }

        const touchesMyConversationList =
          identityIds.includes(nextMessage.from_profile_id) ||
          identityIds.includes(nextMessage.to_profile_id);

        if (touchesMyConversationList) {
          void loadConversations();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [identityIds, loadConversations, selectedProfile]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedProfile || !currentUserId) return;

    setChatError(null);

    try {
      const senderCandidates = Array.from(
        new Set([currentUserId, authUserId].filter(Boolean)),
      ) as string[];

      let successfulInsert: Message | null = null;
      let successfulSenderId: string | null = null;
      let lastError: { code?: string; message?: string } | null = null;

      for (const senderId of senderCandidates) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            from_profile_id: senderId,
            to_profile_id: selectedProfile.id,
            content: messageText.trim(),
          })
          .select()
          .single();

        if (!error && data) {
          successfulInsert = data as Message;
          successfulSenderId = senderId;
          break;
        }

        lastError = {
          code: (error as { code?: string } | null)?.code,
          message: (error as { message?: string } | null)?.message,
        };

        const shouldRetryWithNextSender =
          (lastError.code === '23503' || lastError.code === '42501') &&
          senderId !== senderCandidates[senderCandidates.length - 1];

        if (!shouldRetryWithNextSender) {
          break;
        }
      }

      if (!successfulInsert) {
        if (lastError?.code === '23503') {
          setChatError('Nie mozna wyslac wiadomosci: konto nadawcy nie jest poprawnie powiazane z profilem. Odswiez strone.');
        } else if (lastError?.code === '42501') {
          setChatError('Brak uprawnien do wysylania wiadomosci (RLS). Uruchom migracje: supabase/fix_messages_rls_simple.sql.');
        } else {
          setChatError(`Nie udalo sie wyslac wiadomosci: ${lastError?.message || 'Nieznany blad'}`);
        }
        throw new Error(lastError?.message || 'Insert wiadomosci zakonczony niepowodzeniem');
      }

      if (successfulSenderId && successfulSenderId !== currentUserId) {
        setCurrentUserId(successfulSenderId);
      }

      setMessages(prev => [...prev, successfulInsert]);
      setMessageText('');
      void loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedProfile || !currentUserId) return;
    
    const confirmed = window.confirm(`Czy na pewno chcesz zablokować użytkownika ${selectedProfile.name}?`);
    if (!confirmed) return;

    try {
      // Block user (admin action or user-level block)
      await supabase
        .from('profiles')
        .update({ is_blocked: true })
        .eq('id', selectedProfile.id);

      alert('Użytkownik został zablokowany');
      setSelectedProfile(null);
      setConversations(prev => prev.filter(c => c.id !== selectedProfile.id));
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Nie udało się zablokować użytkownika');
    }
  };

  const handleDeleteMessages = async () => {
    if (!selectedProfile || identityIds.length === 0) return;
    
    const confirmed = window.confirm('Czy na pewno chcesz usunąć wszystkie wiadomości z tą rozmową?');
    if (!confirmed) return;

    try {
      const [deleteOutgoingResult, deleteIncomingResult] = await Promise.all([
        supabase
          .from('messages')
          .delete()
          .in('from_profile_id', identityIds)
          .eq('to_profile_id', selectedProfile.id),
        supabase
          .from('messages')
          .delete()
          .eq('from_profile_id', selectedProfile.id)
          .in('to_profile_id', identityIds),
      ]);

      if (deleteOutgoingResult.error) {
        throw deleteOutgoingResult.error;
      }
      if (deleteIncomingResult.error) {
        throw deleteIncomingResult.error;
      }

      setMessages([]);
      alert('Wiadomości zostały usunięte');
    } catch (error) {
      console.error('Error deleting messages:', error);
      alert('Nie udało się usunąć wiadomości');
    }
  };

  const handleReportUser = async () => {
    if (!selectedProfile || !currentUserId) return;
    
    const reason = window.prompt('Podaj powód zgłoszenia:');
    if (!reason || !reason.trim()) return;

    try {
      await supabase
        .from('admin_reports')
        .insert({
          reported_profile_id: selectedProfile.id,
          reporter_profile_id: currentUserId,
          reason: reason.trim(),
          status: 'pending',
        });

      alert('Zgłoszenie zostało wysłane do administratora');
    } catch (error) {
      console.error('Error reporting user:', error);
      alert('Nie udało się wysłać zgłoszenia');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `${diffMins}m temu`;
    if (diffHours < 24) return `${diffHours}h temu`;
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays}d temu`;
    
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center">
          <p className="text-cyan-400">Ładowanie czatu...</p>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
        <div className="glass rounded-[2rem] p-12 text-center">
          <p className="text-white">{authUserId ? 'Brak profilu czatu dla konta. Odswiez strone.' : 'Musisz być zalogowany, aby korzystać z czatu'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 pt-24 pb-6 px-6 lg:px-12 max-w-[1800px] mx-auto">
      <div className="glass rounded-[2rem] w-full chat-height flex overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        {/* Left Column: Contacts */}
        <div className={`${selectedProfile ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 border-r border-white/5 bg-black/20 flex-col`}>
          <div className="p-6 border-b border-white/5">
            <h2 className="text-2xl font-light mb-4">Wiadomości</h2>
            <div className="relative group">
              <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" size={16} weight="bold" />
              <input
                type="text"
                placeholder="Szukaj pary..."
                className="w-full bg-white/10 border border-cyan-500/20 rounded-full py-2.5 pl-11 pr-4 text-sm text-white outline-none border-glow-cyan transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-cyan-400/60">
                <p className="text-sm">Brak konwersacji</p>
                <p className="text-xs mt-2">Napisz do kogoś, aby rozpocząć czat</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedProfile(conv)}
                  className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${
                    selectedProfile?.id === conv.id
                      ? 'bg-white/10 border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(0,255,255,0.05)]'
                      : 'hover:bg-cyan-500/10'
                  }`}
                >
                  <div className={`relative w-12 h-12 rounded-full p-[2px] ${selectedProfile?.id === conv.id ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-500' : 'bg-white/20'}`}>
                    <img 
                      src={conv.image_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80`} 
                      className="w-full h-full rounded-full object-cover border border-black" 
                      alt={conv.name} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-white font-medium truncate">{conv.name}</h4>
                      <span className={`text-xs ${selectedProfile?.id === conv.id ? 'text-cyan-400' : 'text-cyan-500/60'}`}>
                        {conv.lastMessageTime ? formatTime(conv.lastMessageTime) : ''}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${selectedProfile?.id === conv.id ? 'text-white' : 'text-cyan-400'}`}>
                      {conv.lastMessage || 'Brak wiadomości'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className={`flex-1 flex-col bg-black/10 relative ${selectedProfile ? 'flex' : 'hidden md:flex'}`}>
          {selectedProfile ? (
            <>
              {/* Chat Header with Action Icons */}
              <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-300 hover:bg-white/10"
                    title="Wróć do listy"
                  >
                    <ArrowLeft size={18} weight="bold" />
                  </button>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-cyan-500/20">
                    <img 
                      src={selectedProfile.image_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80`} 
                      alt={selectedProfile.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{selectedProfile.name}</h3>
                    <p className="text-xs text-cyan-500/60">Konwersacja</p>
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReportUser}
                    title="Zgłoś użytkownika"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 transition-all group"
                  >
                    <Flag size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={handleDeleteMessages}
                    title="Usuń wszystkie wiadomości"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all group"
                  >
                    <Trash size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={handleBlockUser}
                    title="Zablokuj użytkownika"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-500/40 text-fuchsia-400 hover:text-fuchsia-300 transition-all group"
                  >
                    <Prohibit size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-cyan-400/60">
                    <p>Brak wiadomości - napisz coś!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isFromMe = identityIds.includes(msg.from_profile_id);
                    const msgTime = new Date(msg.created_at).toLocaleTimeString('pl-PL', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });

                    return (
                      <div key={msg.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-4 rounded-3xl text-sm ${isFromMe ? 'chat-bubble-me' : 'chat-bubble-them'} shadow-lg`}>
                          <p className="text-white">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isFromMe ? 'text-cyan-200/60' : 'text-white/60'}`}>
                            {msgTime}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-sm">
                {chatError && (
                  <p className="mb-3 text-sm text-red-300">{chatError}</p>
                )}
                <div className="relative flex items-center bg-black/40 border border-cyan-500/20 rounded-full px-2 py-2 border-glow-magenta transition-all focus-within:bg-black/60">
                  <input
                    type="text"
                    placeholder="Napisz wiadomość..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    className="flex-1 bg-transparent border-none text-white text-sm px-4 outline-none"
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!messageText.trim() || !currentUserId}
                    className="w-10 h-10 bg-gradient-to-tr from-fuchsia-600 to-cyan-600 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,0,255,0.4)] mr-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <PaperPlaneRight size={18} weight="fill" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 text-cyan-400">
              <MagnifyingGlass size={64} weight="duotone" className="opacity-30" />
              <p className="text-xl font-light">Wybierz rozmowę, aby rozpocząć</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

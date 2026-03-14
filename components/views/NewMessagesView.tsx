'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MagnifyingGlass, Prohibit, Trash, Flag, PaperPlaneRight, ArrowLeft, Smiley, DotsThreeVertical } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { resolveProfileIdForAuthUser } from '@/lib/profileAuth';
import {
  consumePendingChatTarget,
  getChatTargetFromSearch,
  persistPendingChatTarget,
} from '@/lib/chatNavigation';
import {
  applyEmojiSuggestionAtCursor,
  getEmojiSuggestionsAtCursor,
  processEmojiAssistInput,
  type EmojiKeywordSuggestion,
} from '@/lib/emojiAssist';
import EmojiKeywordSuggestions from '@/components/ui/EmojiKeywordSuggestions';
import EmojiPopover from '@/components/ui/EmojiPopover';
import HoverHintIconButton from '@/components/ui/HoverHintIconButton';

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

const MESSAGE_AVATAR_FALLBACK = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80';
const MESSAGE_LIST_AVATAR_SIZES = '48px';
const MESSAGE_HEADER_AVATAR_SIZES = '40px';

export default function NewMessagesView() {
  const [targetProfileId, setTargetProfileId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ConversationProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [messageSuggestions, setMessageSuggestions] = useState<EmojiKeywordSuggestion[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showMessageEmojiPicker, setShowMessageEmojiPicker] = useState(false);
  const [showMobileActionsMenu, setShowMobileActionsMenu] = useState(false);
  const [mobileKeyboardOffset, setMobileKeyboardOffset] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messageEmojiButtonRef = useRef<HTMLButtonElement>(null);
  const mobileActionsMenuRef = useRef<HTMLDivElement>(null);
  const mobileActionsButtonRef = useRef<HTMLButtonElement>(null);

  const identityIds = useMemo(
    () => Array.from(new Set([authUserId, currentUserId].filter(Boolean))) as string[],
    [authUserId, currentUserId],
  );

  const identityChannelKey = useMemo(
    () => (identityIds.length > 0 ? identityIds.join('_') : 'none'),
    [identityIds],
  );
  const isMobileChatOpen = Boolean(selectedProfile);

  // Read direct-chat target from URL without coupling hydration to search params.
  useEffect(() => {
    const readTargetFromLocation = () => {
      const targetFromSearch = getChatTargetFromSearch(window.location.search);
      if (targetFromSearch) {
        setTargetProfileId(targetFromSearch);
        persistPendingChatTarget(targetFromSearch);
        return;
      }

      const pendingTarget = consumePendingChatTarget();
      if (pendingTarget) {
        setTargetProfileId(pendingTarget);

        const nextParams = new URLSearchParams(window.location.search);
        nextParams.set('user', pendingTarget);
        const nextQuery = nextParams.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
        window.history.replaceState(null, '', nextUrl);
        return;
      }

      setTargetProfileId(null);
    };

    readTargetFromLocation();
    window.addEventListener('popstate', readTargetFromLocation);
    window.addEventListener('zl-url-change', readTargetFromLocation);
    window.addEventListener('focus', readTargetFromLocation);

    return () => {
      window.removeEventListener('popstate', readTargetFromLocation);
      window.removeEventListener('zl-url-change', readTargetFromLocation);
      window.removeEventListener('focus', readTargetFromLocation);
    };
  }, []);

  // Lock background scroll on mobile while conversation panel is open.
  useEffect(() => {
    if (!isMobileChatOpen) return;
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    html.classList.add('mobile-chat-open');
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';

    return () => {
      html.classList.remove('mobile-chat-open');
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      body.style.overscrollBehavior = prevBodyOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [isMobileChatOpen]);

  // Move composer above virtual keyboard on mobile browsers.
  useEffect(() => {
    if (!isMobileChatOpen) {
      setMobileKeyboardOffset(0);
      return;
    }
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setMobileKeyboardOffset(Math.round(offset));
    };

    updateKeyboardOffset();
    viewport.addEventListener('resize', updateKeyboardOffset);
    viewport.addEventListener('scroll', updateKeyboardOffset);

    return () => {
      viewport.removeEventListener('resize', updateKeyboardOffset);
      viewport.removeEventListener('scroll', updateKeyboardOffset);
      setMobileKeyboardOffset(0);
    };
  }, [isMobileChatOpen]);

  useEffect(() => {
    if (!selectedProfile) {
      setShowMobileActionsMenu(false);
    }
  }, [selectedProfile]);

  useEffect(() => {
    if (!showMobileActionsMenu) return;

    const closeMenuOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (mobileActionsMenuRef.current?.contains(target)) return;
      if (mobileActionsButtonRef.current?.contains(target)) return;
      setShowMobileActionsMenu(false);
    };

    const closeMenuOnEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMobileActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', closeMenuOnOutsidePress);
    document.addEventListener('touchstart', closeMenuOnOutsidePress, { passive: true });
    document.addEventListener('keydown', closeMenuOnEsc);

    return () => {
      document.removeEventListener('mousedown', closeMenuOnOutsidePress);
      document.removeEventListener('touchstart', closeMenuOnOutsidePress);
      document.removeEventListener('keydown', closeMenuOnEsc);
    };
  }, [showMobileActionsMenu]);

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
      let profileRows: Array<{ id: string; name?: string | null; image_url?: string | null; role?: string | null; email?: string | null; is_blocked?: boolean | null }> = [];

      const { data: profilesWithAdminData, error: profilesWithAdminDataError } = await supabase
        .from('profiles')
        .select('id, name, image_url, role, email, is_blocked')
        .in('id', partnerIds);

      if (profilesWithAdminDataError) {
        console.error('Blad ladowania profili rozmowcow (pelne pola):', profilesWithAdminDataError.message);
        const { data: fallbackProfiles, error: fallbackProfilesError } = await supabase
          .from('profiles')
          .select('id, name, image_url, is_blocked')
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
          is_blocked: (profile as { is_blocked?: boolean | null }).is_blocked,
        }));
      } else {
        profileRows = (profilesWithAdminData || []).map((profile) => ({
          id: profile.id as string,
          name: (profile as { name?: string | null }).name,
          image_url: (profile as { image_url?: string | null }).image_url,
          role: (profile as { role?: string | null }).role,
          email: (profile as { email?: string | null }).email,
          is_blocked: (profile as { is_blocked?: boolean | null }).is_blocked,
        }));
      }

      const profileMap = new Map(profileRows.map((profile) => [profile.id, profile]));

      const conversationsData: ConversationProfile[] = partnerIds
        .flatMap((partnerId) => {
          const preview = newestConversationByPartner.get(partnerId);
          if (!preview) return [];

          const partnerProfile = profileMap.get(partnerId);
          if (partnerProfile?.is_blocked) return [];

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
        setChatError('Brak uprawnien do czatu (RLS). Uruchom migracje: supabase/messages_rls_ultra_simple.sql.');
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
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, image_url, is_blocked')
        .eq('id', targetProfileId)
        .maybeSingle();

      if (profileError) {
        console.error('Blad ladowania profilu docelowego rozmowy:', profileError.message);
        return;
      }
      if (!profileRow) return;
      if ((profileRow as { is_blocked?: boolean | null }).is_blocked) return;

      const directConversation: ConversationProfile = {
        id: profileRow.id as string,
        name: (profileRow as { name?: string | null }).name || 'User',
        image_url: (profileRow as { image_url?: string | null }).image_url || '',
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
          setChatError('Brak uprawnien do wiadomosci (RLS). Uruchom migracje: supabase/messages_rls_ultra_simple.sql.');
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
    const container = messagesContainerRef.current;
    if (!container) return;

    // Scroll only the chat panel to avoid moving the whole page.
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, selectedProfile?.id]);

  const sendMessage = async () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || !selectedProfile) return;

    setChatError(null);
    console.log('📤 Sending message...');
    console.log('  From (currentUserId):', currentUserId);
    console.log('  From (authUserId):', authUserId);
    console.log('  To:', selectedProfile.id);
    console.log('  Content:', trimmedMessage.substring(0, 50) + '...');

    try {
      let successfulInsert: Message | null = null;
      let lastError: { code?: string; message?: string } | null = null;

      // Try to send using currentUserId first (most likely to work)
      const senderCandidates = Array.from(
        new Set([currentUserId, authUserId].filter(Boolean)),
      ) as string[];

      const participantIds = Array.from(new Set([...senderCandidates, selectedProfile.id]));
      const { data: participantProfiles, error: participantProfilesError } = await supabase
        .from('profiles')
        .select('id')
        .in('id', participantIds)
        .neq('is_blocked', true);

      if (participantProfilesError) {
        console.warn('Nie udalo sie zweryfikowac profili przed wysylka:', participantProfilesError.message);
      }

      const existingProfileIds = new Set(
        ((participantProfiles as Array<{ id: string }> | null) || []).map((profile) => profile.id),
      );

      if (!existingProfileIds.has(selectedProfile.id)) {
        setChatError('Profil odbiorcy nie istnieje albo zostal usuniety. Otworz rozmowe ponownie.');
        return;
      }

      const validSenderCandidates = senderCandidates.filter((senderId) => existingProfileIds.has(senderId));

      if (validSenderCandidates.length === 0) {
        setChatError('Profil nadawcy nie istnieje w tabeli profiles. Uruchom migracje: supabase/messages_rls_ultra_simple.sql.');
        return;
      }

      console.log('📤 Sender candidates:', senderCandidates);
      console.log('📤 Valid sender candidates:', validSenderCandidates);

      for (const senderId of validSenderCandidates) {
        console.log(`📤 Trying to send FROM profile: ${senderId}`);

        const { data, error } = await supabase
          .from('messages')
          .insert({
            from_profile_id: senderId,
            to_profile_id: selectedProfile.id,
            content: trimmedMessage,
          })
          .select()
          .single();

        if (!error && data) {
          console.log('✅ Message sent successfully!', data);
          successfulInsert = data as Message;
          break;
        }

        const code = (error as { code?: string } | null)?.code;
        const message = (error as { message?: string } | null)?.message;
        
        console.log(`❌ Failed with senderId=${senderId}`);
        console.log(`   Code: ${code}`);
        console.log(`   Message: ${message}`);

        lastError = { code, message };
      }

      if (!successfulInsert) {
        let errorMsg = 'Nie udało się wysłać wiadomości';
        
        if (lastError?.code === '42501') {
          errorMsg = 'Brak uprawnień do wysyłania (RLS). Uruchom: supabase/messages_rls_ultra_simple.sql';
        } else if (lastError?.code === '23503') {
          errorMsg = 'Profil nadawcy lub odbiorcy nie istnieje w tabeli profiles.';
        } else if (lastError?.message) {
          errorMsg = `Błąd: ${lastError.message}`;
        }

        console.error('❌ All send attempts failed:', lastError);
        setChatError(errorMsg);
        return;
      }

      // Update UI
      setMessages(prev => [...prev, successfulInsert]);
      setMessageText('');
      setMessageSuggestions([]);
      setShowMessageEmojiPicker(false);
      console.log('📤 Reloading conversations...');
      void loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      setChatError(`Exception: ${(error as Error).message}`);
    }
  };

  const updateMessageInputWithEmojiAssist = useCallback((rawValue: string, cursor: number | null) => {
    const next = processEmojiAssistInput(rawValue, cursor);
    setMessageText(next.value);
    setMessageSuggestions(next.suggestions);

    window.requestAnimationFrame(() => {
      const input = messageInputRef.current;
      if (!input || document.activeElement !== input) return;
      input.setSelectionRange(next.cursor, next.cursor);
    });
  }, []);

  const handlePickMessageSuggestion = useCallback((suggestion: EmojiKeywordSuggestion) => {
    const input = messageInputRef.current;
    const cursor = input?.selectionStart ?? messageText.length;
    const next = applyEmojiSuggestionAtCursor(messageText, cursor, suggestion);

    setMessageText(next.value);
    setMessageSuggestions(getEmojiSuggestionsAtCursor(next.value, next.cursor));

    window.requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      input.setSelectionRange(next.cursor, next.cursor);
    });
  }, [messageText]);

  const insertEmojiToMessage = useCallback((emoji: string) => {
    const input = messageInputRef.current;

    if (!input) {
      setMessageText((prev) => `${prev}${emoji}`);
      return;
    }

    const selectionStart = input.selectionStart ?? input.value.length;
    const selectionEnd = input.selectionEnd ?? input.value.length;

    setMessageText((prev) => {
      const safeStart = Math.min(selectionStart, prev.length);
      const safeEnd = Math.min(selectionEnd, prev.length);
      return `${prev.slice(0, safeStart)}${emoji}${prev.slice(safeEnd)}`;
    });

    setMessageSuggestions([]);

    window.requestAnimationFrame(() => {
      const caretPosition = selectionStart + emoji.length;
      input.focus();
      input.setSelectionRange(caretPosition, caretPosition);
    });
  }, []);

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

    const deletingConversationId = selectedProfile.id;
    
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
      setConversations((prev) => prev.filter((conversation) => conversation.id !== deletingConversationId));
      setSelectedProfile(null);

      if (targetProfileId === deletingConversationId) {
        setTargetProfileId(null);

        const params = new URLSearchParams(window.location.search);
        params.delete('user');
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
        window.history.replaceState(null, '', nextUrl);
      }

      void loadConversations();
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
        <div className="glass rounded-[2rem] w-full chat-height flex overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="w-full md:w-80 lg:w-96 border-r border-white/5 bg-black/20 p-4 md:p-6 space-y-4">
            <div className="h-10 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="h-12 w-12 rounded-full bg-white/10 animate-pulse" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-24 rounded-full bg-white/10 animate-pulse" />
                    <div className="h-3 w-32 rounded-full bg-white/5 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex flex-1 flex-col bg-black/10 p-8">
            <div className="h-16 rounded-2xl border border-white/5 bg-white/[0.04] animate-pulse" />
            <div className="mt-6 flex-1 rounded-[2rem] border border-white/5 bg-white/[0.03] animate-pulse" />
            <div className="mt-6 h-16 rounded-[1.5rem] border border-white/5 bg-white/[0.04] animate-pulse" />
          </div>
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
    <div className="relative z-10 pt-24 pb-0 px-0 md:pb-6 md:px-6 lg:px-12 max-w-[1800px] mx-auto">
      <div className="glass rounded-none md:rounded-[2rem] w-full chat-height flex overflow-hidden border-y md:border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        {/* Left Column: Contacts */}
        <div className={`${selectedProfile ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 border-r border-white/5 bg-black/20 flex-col`}>
          <div className="p-4 md:p-6 border-b border-white/5">
            <h2 className="text-xl md:text-2xl font-light mb-3 md:mb-4">Wiadomości</h2>
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
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    selectedProfile?.id === conv.id
                      ? 'bg-white/10 border border-cyan-500/30 shadow-[inset_0_0_15px_rgba(0,255,255,0.05)]'
                      : 'hover:bg-cyan-500/10'
                  }`}
                >
                  <div className={`relative w-12 h-12 rounded-full p-[2px] ${selectedProfile?.id === conv.id ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-500' : 'bg-white/20'}`}>
                    <Image
                      src={conv.image_url || MESSAGE_AVATAR_FALLBACK}
                      alt={conv.name}
                      fill
                      sizes={MESSAGE_LIST_AVATAR_SIZES}
                      className="rounded-full object-cover border border-black"
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
        <div
          className={`flex-1 flex-col bg-black/10 relative min-h-0 ${
            selectedProfile ? 'flex mobile-chat-panel overflow-x-hidden' : 'hidden md:flex'
          }`}
        >
          {selectedProfile ? (
            <>
              {/* Chat Header with Action Icons */}
              <div className="h-14 md:h-20 shrink-0 pt-safe md:pt-0 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-black/20 backdrop-blur-sm z-20">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-300 hover:bg-white/10"
                    title="Wróć do listy"
                  >
                    <ArrowLeft size={18} weight="bold" />
                  </button>
                  <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border border-cyan-500/20 shrink-0">
                    <Image
                      src={selectedProfile.image_url || MESSAGE_AVATAR_FALLBACK}
                      alt={selectedProfile.name}
                      fill
                      sizes={MESSAGE_HEADER_AVATAR_SIZES}
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-medium text-white leading-tight truncate">{selectedProfile.name}</h3>
                    <p className="text-xs text-cyan-500/60 hidden md:block">Konwersacja</p>
                  </div>
                </div>

                {/* Desktop action icons */}
                <div className="hidden md:flex items-center gap-1 md:gap-2 shrink-0">
                  <button
                    onClick={handleReportUser}
                    title="Zgłoś użytkownika"
                    className="p-2 md:p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 transition-all group"
                  >
                    <Flag size={18} weight="duotone" className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={handleDeleteMessages}
                    title="Usuń wszystkie wiadomości"
                    className="p-2 md:p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all group"
                  >
                    <Trash size={18} weight="duotone" className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={handleBlockUser}
                    title="Zablokuj użytkownika"
                    className="p-2 md:p-2.5 rounded-xl bg-white/5 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-500/40 text-fuchsia-400 hover:text-fuchsia-300 transition-all group"
                  >
                    <Prohibit size={18} weight="duotone" className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                {/* Mobile action menu */}
                <div className="relative md:hidden shrink-0">
                  <button
                    ref={mobileActionsButtonRef}
                    onClick={() => setShowMobileActionsMenu((prev) => !prev)}
                    title="Więcej opcji"
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-cyan-300 hover:bg-white/10"
                    aria-expanded={showMobileActionsMenu}
                    aria-controls="chat-mobile-actions-menu"
                  >
                    <DotsThreeVertical size={20} weight="bold" />
                  </button>

                  {showMobileActionsMenu && (
                    <div
                      id="chat-mobile-actions-menu"
                      ref={mobileActionsMenuRef}
                      className="absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-2xl border border-white/10 bg-[#070d1e]/95 backdrop-blur-xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                    >
                      <button
                        onClick={() => {
                          setShowMobileActionsMenu(false);
                          void handleReportUser();
                        }}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-amber-300 hover:bg-amber-500/15"
                      >
                        <Flag size={18} weight="duotone" />
                        <span>Zgłoś użytkownika</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMobileActionsMenu(false);
                          void handleDeleteMessages();
                        }}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-500/15"
                      >
                        <Trash size={18} weight="duotone" />
                        <span>Usuń wiadomości</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMobileActionsMenu(false);
                          void handleBlockUser();
                        }}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-fuchsia-300 hover:bg-fuchsia-500/15"
                      >
                        <Prohibit size={18} weight="duotone" />
                        <span>Zablokuj użytkownika</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="mobile-chat-messages flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 md:p-8 space-y-2 md:space-y-6">
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
                        <div className={`max-w-[85%] md:max-w-[70%] px-3 py-2 md:p-4 rounded-2xl md:rounded-3xl text-sm ${isFromMe ? 'chat-bubble-me' : 'chat-bubble-them'} shadow-lg`}>
                          <p className="text-white leading-relaxed break-words">{msg.content}</p>
                          <p className={`text-[10px] md:text-xs mt-1 ${isFromMe ? 'text-cyan-200/60' : 'text-white/60'}`}>
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
              <div
                className="shrink-0 px-3 pt-2 pb-safe md:p-6 border-t border-white/5 bg-black/20 backdrop-blur-sm"
                style={
                  mobileKeyboardOffset > 0
                    ? { paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileKeyboardOffset}px)` }
                    : undefined
                }
              >
                {chatError && (
                  <p className="mb-3 text-sm text-red-300">{chatError}</p>
                )}
                <div className="relative flex items-center bg-black/40 border border-cyan-500/20 rounded-[1.35rem] md:rounded-full px-2 py-2.5 md:py-2 border-glow-magenta transition-all focus-within:bg-black/60">
                  <EmojiKeywordSuggestions
                    suggestions={messageSuggestions}
                    onSelect={handlePickMessageSuggestion}
                    className="absolute left-2 right-2 bottom-full mb-2"
                  />
                  <input
                    ref={messageInputRef}
                    type="text"
                    placeholder="Napisz wiadomość..."
                    value={messageText}
                    onChange={(e) => updateMessageInputWithEmojiAssist(e.target.value, e.target.selectionStart)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setMessageSuggestions([]), 120);
                    }}
                    onFocus={() => {
                      window.setTimeout(() => {
                        const container = messagesContainerRef.current;
                        if (!container) return;

                        container.scrollTo({
                          top: container.scrollHeight,
                          behavior: 'smooth',
                        });
                      }, 140);
                    }}
                    className="flex-1 bg-transparent border-none text-white text-[15px] md:text-sm px-4 py-1 outline-none"
                  />
                  <HoverHintIconButton
                    ref={messageEmojiButtonRef}
                    onClick={() => setShowMessageEmojiPicker((prev) => !prev)}
                    tooltip="Wstaw emoji"
                    regularIcon={<Smiley size={20} weight="regular" />}
                    filledIcon={<Smiley size={20} weight="fill" />}
                    variant="cyan"
                    wrapperClassName="mr-1"
                  />
                  <HoverHintIconButton
                    onClick={sendMessage}
                    disabled={!messageText.trim() || !currentUserId}
                    tooltip="Wyślij wiadomość"
                    regularIcon={<PaperPlaneRight size={20} weight="regular" />}
                    filledIcon={<PaperPlaneRight size={20} weight="fill" />}
                    variant="cyan"
                    wrapperClassName="mr-1"
                  />
                </div>
                <EmojiPopover
                  open={showMessageEmojiPicker}
                  anchorRef={messageEmojiButtonRef}
                  onClose={() => setShowMessageEmojiPicker(false)}
                  onSelect={insertEmojiToMessage}
                  searchPlaceholder="Szukaj emoji do wiadomosci"
                />
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

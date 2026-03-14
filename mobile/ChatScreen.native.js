import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function mergeMessagesUnique(rows) {
  const merged = new Map();
  rows.forEach((row) => {
    merged.set(row.id, row);
  });
  return Array.from(merged.values()).sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });
}

async function persistAuthUserMapping(client, profile, authUserId) {
  if (!profile?.id) return;
  if (profile.auth_user_id === authUserId) return;
  if (profile.auth_user_id && profile.auth_user_id !== authUserId) return;

  await client
    .from('profiles')
    .update({ auth_user_id: authUserId })
    .eq('id', profile.id);
}

async function resolveProfileIdForAuthUser(client, user) {
  const normalizedEmail = user?.email?.trim().toLowerCase() || null;

  const { data: byId } = await client
    .from('profiles')
    .select('id, auth_user_id, email')
    .eq('id', user.id)
    .maybeSingle();

  if (byId?.id) {
    await persistAuthUserMapping(client, byId, user.id);
    return byId.id;
  }

  const { data: byAuthUserId } = await client
    .from('profiles')
    .select('id, auth_user_id, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (byAuthUserId?.id) {
    return byAuthUserId.id;
  }

  if (normalizedEmail) {
    const { data: byEmail } = await client
      .from('profiles')
      .select('id, auth_user_id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (byEmail?.id) {
      await persistAuthUserMapping(client, byEmail, user.id);
      return byEmail.id;
    }
  }

  const fallbackName =
    (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
    'Uzytkownik';

  const { data: created } = await client
    .from('profiles')
    .upsert(
      {
        id: user.id,
        auth_user_id: user.id,
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

  return created?.id || user.id;
}

function formatClock(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * React Native chat screen compatible with this project's Supabase schema:
 * - messages.from_profile_id
 * - messages.to_profile_id
 * - messages.content
 *
 * Route params example:
 * - targetProfileId: '<uuid profile id>'
 */
export default function ChatScreen({ route, navigation }) {
  const targetProfileId =
    route?.params?.targetProfileId ||
    route?.params?.userId ||
    null;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatError, setChatError] = useState(null);
  const [authUserId, setAuthUserId] = useState(null);
  const [currentProfileId, setCurrentProfileId] = useState(null);
  const [targetProfile, setTargetProfile] = useState(null);
  const flatListRef = useRef(null);

  const identityIds = useMemo(
    () => Array.from(new Set([authUserId, currentProfileId].filter(Boolean))),
    [authUserId, currentProfileId],
  );

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated });
      }
    });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!supabase) return;
    if (!targetProfileId || identityIds.length === 0) return;

    const [outgoingResult, incomingResult] = await Promise.all([
      supabase
        .from('messages')
        .select('id, from_profile_id, to_profile_id, content, created_at')
        .in('from_profile_id', identityIds)
        .eq('to_profile_id', targetProfileId)
        .order('created_at', { ascending: true }),
      supabase
        .from('messages')
        .select('id, from_profile_id, to_profile_id, content, created_at')
        .eq('from_profile_id', targetProfileId)
        .in('to_profile_id', identityIds)
        .order('created_at', { ascending: true }),
    ]);

    if (outgoingResult.error || incomingResult.error) {
      const message = outgoingResult.error?.message || incomingResult.error?.message || 'Nie udalo sie pobrac wiadomosci.';
      setChatError(message);
      return;
    }

    const merged = mergeMessagesUnique([
      ...((outgoingResult.data || [])),
      ...((incomingResult.data || [])),
    ]);

    setMessages(merged);
    setTimeout(() => scrollToBottom(false), 60);
  }, [identityIds, scrollToBottom, targetProfileId]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!supabase) {
        if (isMounted) {
          setChatError('Brak konfiguracji Supabase. Ustaw EXPO_PUBLIC_SUPABASE_URL i EXPO_PUBLIC_SUPABASE_ANON_KEY.');
          setLoading(false);
        }
        return;
      }

      if (!targetProfileId) {
        if (isMounted) {
          setChatError('Brak targetProfileId. Otworz chat z profilem docelowym.');
          setLoading(false);
        }
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setChatError('Uzytkownik nie jest zalogowany.');
          setLoading(false);
        }
        return;
      }

      const resolvedProfileId = await resolveProfileIdForAuthUser(supabase, user);

      const { data: targetRow } = await supabase
        .from('profiles')
        .select('id, name, city, is_blocked')
        .eq('id', targetProfileId)
        .maybeSingle();

      if (targetRow?.is_blocked) {
        if (isMounted) {
          setChatError('Ten profil jest niedostepny.');
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setAuthUserId(user.id);
        setCurrentProfileId(resolvedProfileId);
        setTargetProfile(targetRow || null);
        setLoading(false);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [targetProfileId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!supabase) return undefined;
    if (!targetProfileId || identityIds.length === 0) return undefined;

    const realtimeChannel = supabase
      .channel(`chat-${targetProfileId}-${identityIds.join('_')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const nextMessage = payload.new;
          const isRelevant =
            (identityIds.includes(nextMessage.from_profile_id) && nextMessage.to_profile_id === targetProfileId) ||
            (nextMessage.from_profile_id === targetProfileId && identityIds.includes(nextMessage.to_profile_id));

          if (!isRelevant) return;

          setMessages((prev) => mergeMessagesUnique([...prev, nextMessage]));
          scrollToBottom();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [identityIds, scrollToBottom, targetProfileId]);

  const sendMessage = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!supabase || !trimmed || !targetProfileId) return;

    const senderCandidates = Array.from(new Set([currentProfileId, authUserId].filter(Boolean)));
    if (senderCandidates.length === 0) {
      setChatError('Brak profilu nadawcy.');
      return;
    }

    const participantIds = Array.from(new Set([...senderCandidates, targetProfileId]));
    const { data: participants, error: participantError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', participantIds)
      .neq('is_blocked', true);

    if (participantError) {
      setChatError(`Blad profilow: ${participantError.message}`);
      return;
    }

    const existingIds = new Set((participants || []).map((row) => row.id));
    if (!existingIds.has(targetProfileId)) {
      setChatError('Profil odbiorcy nie istnieje lub jest zablokowany.');
      return;
    }

    const validSenderCandidates = senderCandidates.filter((id) => existingIds.has(id));
    if (validSenderCandidates.length === 0) {
      setChatError('Profil nadawcy nie istnieje w tabeli profiles.');
      return;
    }

    setChatError(null);
    setInputText('');

    let sentRow = null;
    let lastError = null;

    for (const senderId of validSenderCandidates) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          from_profile_id: senderId,
          to_profile_id: targetProfileId,
          content: trimmed,
        })
        .select('id, from_profile_id, to_profile_id, content, created_at')
        .single();

      if (!error && data) {
        sentRow = data;
        break;
      }

      lastError = error;
    }

    if (!sentRow) {
      setChatError(lastError?.message || 'Nie udalo sie wyslac wiadomosci.');
      return;
    }

    setMessages((prev) => mergeMessagesUnique([...prev, sentRow]));
    scrollToBottom();
  }, [authUserId, currentProfileId, inputText, scrollToBottom, targetProfileId]);

  const renderItem = ({ item }) => {
    const isMine = identityIds.includes(item.from_profile_id);

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={[styles.timeText, isMine ? styles.timeMine : styles.timeOther]}>
            {formatClock(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#23c6ff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            }
          }}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>{'<'} </Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {targetProfile?.name || 'Wiadomosci'}
          </Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {targetProfile?.city || 'Rozmowa'}
          </Text>
        </View>
      </View>

      {chatError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{chatError}</Text>
        </View>
      ) : null}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollToBottom(false)}
        onLayout={() => scrollToBottom(false)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.inputBar}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Napisz wiadomosc..."
            placeholderTextColor="#7a8aa5"
            style={styles.input}
            multiline
            maxLength={1500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.sendText}>Wyslij</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040a18',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 58,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(6,14,32,0.96)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 10,
  },
  backText: {
    color: '#d8ecff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#f4f8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 1,
    color: '#8fb1d8',
    fontSize: 12,
  },
  errorBox: {
    marginHorizontal: 12,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,80,80,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.25)',
  },
  errorText: {
    color: '#ffd6d6',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    width: '100%',
    marginBottom: 8,
    flexDirection: 'row',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: '#1f7dff',
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    color: '#f5fbff',
    fontSize: 15,
    lineHeight: 20,
  },
  timeText: {
    marginTop: 4,
    fontSize: 10,
  },
  timeMine: {
    color: 'rgba(224,238,255,0.8)',
    textAlign: 'right',
  },
  timeOther: {
    color: 'rgba(190,212,238,0.75)',
    textAlign: 'left',
  },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(6,14,32,0.98)',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(130,200,255,0.35)',
    color: '#eff7ff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  sendButton: {
    height: 44,
    minWidth: 78,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f7dff',
    paddingHorizontal: 14,
  },
  sendButtonDisabled: {
    backgroundColor: '#5f7393',
  },
  sendText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

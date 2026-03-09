'use client';

import NewMessagesView from './NewMessagesView';
import { Profile } from '@/lib/types';

interface MessagesViewProps {
  selectedProfile: Profile | null;
  onBack: () => void;
  onNotify: (msg: string) => void;
  isLoggedIn?: boolean;
  isPremium?: boolean;
  tokens?: number;
  onSpendToken?: () => boolean;
  onLoginRequest?: () => void;
}

export default function MessagesView(_props: MessagesViewProps) {
  return <NewMessagesView />;
}

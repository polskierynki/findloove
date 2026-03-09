'use client';

import NewProfileDetailView from './NewProfileDetailView';
import { Profile } from '@/lib/types';

interface ProfileDetailViewProps {
  profile: Profile;
  onBack: () => void;
  onMessage: () => void;
  onContactRequest: (name: string) => void;
  onNotify: (message: string) => void;
  isLoggedIn: boolean;
  tokens: number;
  onSpendToken: () => boolean;
  unlockedGalleries: string[];
  onUnlockGallery: (id: string) => void;
  onLoginRequest: () => void;
  onOpenAuthorProfile?: (profileId: string) => void;
  isAdmin?: boolean;
  guestRestrictions?: {
    isRestricted: boolean;
    canSendMessage: () => boolean;
    canLikeProfile: () => boolean;
  };
  onGuestFeatureBlock?: (featureName: string) => void;
}

export default function ProfileDetailView({ profile }: ProfileDetailViewProps) {
  return <NewProfileDetailView profileId={profile.id} />;
}

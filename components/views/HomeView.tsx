'use client';

import NewHomeView from './NewHomeView';
import { LookingForCategory, Profile, ViewType } from '@/lib/types';

interface HomeViewProps {
  profiles: Profile[];
  onNavigate: (view: ViewType) => void;
  onSelectProfile: (profile: Profile) => void;
  onSearchFor: (cat: LookingForCategory) => void;
  userName?: string;
  isLoggedIn?: boolean;
  guestRestrictions?: {
    isRestricted: boolean;
    shouldBlurPhoto: (index: number, total: number) => boolean;
    getVisibleProfilesLimit: () => number;
    canViewFullProfile: () => boolean;
  };
  profileCompletion?: {
    shouldBlurPhotos: boolean;
    shouldBlurBios: boolean;
    canContact: boolean;
    message: string;
  };
  onShowCompletionModal?: () => void;
}

export default function HomeView(_props: HomeViewProps) {
  return <NewHomeView />;
}

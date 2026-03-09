'use client';

import NewSearchView from './NewSearchView';
import { LookingForCategory, Profile } from '@/lib/types';

interface SearchViewProps {
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
  onBack: () => void;
  initialLookingFor?: LookingForCategory;
  guestRestrictions?: {
    isRestricted: boolean;
    shouldBlurPhoto: (index: number, total: number) => boolean;
    getVisibleProfilesLimit: () => number;
    canViewFullProfile: () => boolean;
  };
}

export default function SearchView(_props: SearchViewProps) {
  return <NewSearchView />;
}

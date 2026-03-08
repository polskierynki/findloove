import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { getProfileCompletionLevel, ProfileCompletionLevel, getCompletionMessage } from '@/lib/profileCompletion';

/**
 * Hook monitorujący poziom uzupełnienia profilu użytkownika
 * i zwracający restrykcje dostępu do treści innych użytkowników
 */
export function useProfileCompletion(isLoggedIn: boolean) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [completionLevel, setCompletionLevel] = useState<ProfileCompletionLevel>({
    hasPhoto: false,
    hasBio: false,
    hasContactInfo: false,
    canViewPhotos: false,
    canViewBios: false,
    canContact: false,
    missingFields: ['Musisz się zalogować'],
  });

  useEffect(() => {
    if (!isLoggedIn) {
      setCurrentProfile(null);
      setCompletionLevel({
        hasPhoto: false,
        hasBio: false,
        hasContactInfo: false,
        canViewPhotos: false,
        canViewBios: false,
        canContact: false,
        missingFields: ['Musisz się zalogować'],
      });
      return;
    }

    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        const profile: Profile = {
          id: profileData.id,
          name: profileData.name,
          age: profileData.age,
          city: profileData.city,
          bio: profileData.bio,
          interests: profileData.interests || [],
          status: profileData.status,
          image: profileData.image_url,
          details: {
            occupation: profileData.occupation,
            zodiac: profileData.zodiac,
            smoking: profileData.smoking,
            children: profileData.children,
            education: profileData.education,
            drinking: profileData.drinking,
            relationship_goal: profileData.relationship_goal,
            wants_children: profileData.wants_children,
          },
          isVerified: profileData.is_verified,
          gender: profileData.gender,
          seeking_gender: profileData.seeking_gender,
        };

        setCurrentProfile(profile);
        const level = getProfileCompletionLevel(profile);
        setCompletionLevel(level);
      }
    };

    loadProfile();

    // Subscribe to profile updates
    const channel = supabase
      .channel('profile_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, () => {
        loadProfile();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isLoggedIn]);

  return {
    completionLevel,
    currentProfile,
    message: getCompletionMessage(completionLevel),
    shouldBlurPhotos: !completionLevel.canViewPhotos,
    shouldBlurBios: !completionLevel.canViewBios,
    canContact: completionLevel.canContact,
  };
}

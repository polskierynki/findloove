import { Profile } from './types';

export type ProfileCompletionLevel = {
  hasPhoto: boolean;
  hasBio: boolean;
  hasContactInfo: boolean;
  canViewPhotos: boolean;      // widzi zdjęcia innych (sam ma zdjęcie)
  canViewBios: boolean;         // widzi opisy innych (sam ma opis)
  canContact: boolean;          // może kontaktować się (ma pełny profil)
  missingFields: string[];
};

/**
 * Sprawdza poziom uzupełnienia profilu użytkownika
 */
export function getProfileCompletionLevel(profile: Profile | null): ProfileCompletionLevel {
  if (!profile) {
    return {
      hasPhoto: false,
      hasBio: false,
      hasContactInfo: false,
      canViewPhotos: false,
      canViewBios: false,
      canContact: false,
      missingFields: ['Musisz się zalogować'],
    };
  }

  const hasPhoto = !!(profile.image && 
    profile.image !== '' && 
    !profile.image.includes('ui-avatars.com') &&
    !profile.image.includes('photo-1530268729831')); // nie placeholder

  const hasBio = !!(profile.bio && profile.bio.trim().length >= 20);

  const hasContactInfo = !!(
    profile.details?.occupation && 
    profile.interests && 
    profile.interests.length >= 2
  );

  const missingFields: string[] = [];
  if (!hasPhoto) missingFields.push('Dodaj swoje zdjęcie');
  if (!hasBio) missingFields.push('Napisz opis (min. 20 znaków)');
  if (!hasContactInfo) missingFields.push('Uzupełnij zawód i zainteresowania');

  return {
    hasPhoto,
    hasBio,
    hasContactInfo,
    canViewPhotos: hasPhoto,
    canViewBios: hasPhoto && hasBio,
    canContact: hasPhoto && hasBio && hasContactInfo,
    missingFields,
  };
}

/**
 * Zwraca komunikat dla użytkownika co musi zrobić
 */
export function getCompletionMessage(level: ProfileCompletionLevel): string {
  if (!level.hasPhoto) {
    return 'Dodaj swoje zdjęcie, aby zobaczyć zdjęcia innych użytkowników';
  }
  if (!level.hasBio) {
    return 'Napisz coś o sobie (min. 20 znaków), aby zobaczyć opisy innych';
  }
  if (!level.hasContactInfo) {
    return 'Uzupełnij zawód i zainteresowania, aby móc wysyłać wiadomości';
  }
  return 'Profil kompletny!';
}

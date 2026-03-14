export type ViewType =
  | 'home'
  | 'discover'
  | 'profile'
  | 'messages'
  | 'safety'
  | 'likes'
  | 'friends'
  | 'search'
  | 'auth'
  | 'register'
  | 'terms'
  | 'privacy'
  | 'cookies';

// App-level views include internal/admin screens that are not part of public nav contracts.
export type AppView = ViewType | 'admin' | 'myprofile' | 'notifications';

export type LookingForCategory = 'miłość' | 'przyjaźń' | 'przygoda';

export const LOOKING_FOR_OPTIONS: { id: LookingForCategory; label: string; description: string; iconName: string; color: string }[] = [
  { id: 'miłość',   label: 'Miłości',   description: 'Szukasz poważnego związku i partnera na całe życie', iconName: 'Heart', color: 'rose' },
  { id: 'przyjaźń', label: 'Przyjaźni', description: 'Zależy Ci na szczerych relacjach i wspólnym spędzaniu czasu',  iconName: 'Users', color: 'amber' },
  { id: 'przygoda', label: 'Przygody',   description: 'Cenisz spontaniczność, nowe miejsca i nowe znajomości',          iconName: 'Sparkles', color: 'violet' },
];

export function getLookingFor(status: string): LookingForCategory | null {
  const s = status.toLowerCase();
  if (s.includes('miło') || s.includes('partner')) return 'miłość';
  if (s.includes('przyja')) return 'przyjaźń';
  if (s.includes('przygod') || s.includes('towarzys')) return 'przygoda';
  return null;
}

export interface ProfileDetails {
  occupation: string;
  zodiac: string;
  smoking: string;
  children: string;
  education?: string;
  drinking?: string;
  pets?: string;
  sexual_orientation?: string;
  looking_for?: string;
  relationship_goal?: string;
  wants_children?: string;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  status: string;
  image_url: string;
  email?: string;
  photos?: string[];         // gallery photos (index 0 = main = same as image_url)
  details: ProfileDetails;
  isVerified: boolean;
  verificationPending?: boolean;
  gender?: string;          // 'K' | 'M'
  seeking_gender?: string;  // 'K' | 'M'
  seeking_age_min?: number;
  seeking_age_max?: number;
  isBlocked?: boolean;
  suspendedAt?: string | null;
  deletionRequestedAt?: string | null;
  deletionScheduledAt?: string | null;
  lastActive?: string;
  createdAt?: string;
  role?: string;            // 'user' | 'admin' | 'super_admin'
  isPremium?: boolean;
  premiumUntil?: string;
}

// Surowy format z Supabase
export interface SupabaseProfile {
  id: string;
  email?: string | null;
  name: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  status: string;
  image_url: string;
  is_verified: boolean;
  verification_pending?: boolean;
  occupation: string;
  zodiac: string;
  smoking: string;
  children: string;
  drinking?: string;
  pets?: string;
  sexual_orientation?: string;
  looking_for?: string;
  created_at: string;
  gender?: string;
  seeking_gender?: string;
  seeking_age_min?: number;
  seeking_age_max?: number;
  is_blocked?: boolean;
  suspended_at?: string | null;
  deletion_requested_at?: string | null;
  deletion_scheduled_at?: string | null;
  last_active?: string;
  role?: string;
  is_premium?: boolean;
  premium_until?: string;
}
// ADMIN: Typ zgłoszenia użytkownika
export interface AdminReport {
  id: string;
  reported_profile_id: string;
  reporter_profile_id: string | null;
  reason: string;
  details?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
}

export interface SupabaseMessage {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  content: string;
  created_at: string;
}

export type ProfileInteractionKind = 'poke' | 'gift' | 'emote';

export interface SupabaseProfileInteraction {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  kind: ProfileInteractionKind;
  emoji?: string | null;
  label?: string | null;
  token_cost?: number | null;
  is_anonymous?: boolean | null;
  message?: string | null;
  created_at: string;
}

const KNOWN_BROKEN_IMAGE_FRAGMENTS = [
  'photo-1581579438747-104c53d2f93b',
];

function buildProfileFallbackImage(name?: string): string {
  const safeName = encodeURIComponent(name || 'Uzytkownik');
  return `https://ui-avatars.com/api/?name=${safeName}&background=C05868&color=fff&size=256`;
}

function normalizeProfileImageUrl(imageUrl: string | null | undefined, profileName?: string): string {
  if (!imageUrl) return buildProfileFallbackImage(profileName);
  if (KNOWN_BROKEN_IMAGE_FRAGMENTS.some((fragment) => imageUrl.includes(fragment))) {
    return buildProfileFallbackImage(profileName);
  }
  return imageUrl;
}

export function mapSupabaseProfile(p: SupabaseProfile): Profile {
  const safeImageUrl = normalizeProfileImageUrl(p.image_url, p.name);

  return {
    id: p.id,
    name: p.name,
    age: p.age,
    city: p.city,
    bio: p.bio,
    interests: p.interests ?? [],
    status: p.status,
    image_url: safeImageUrl,
    email: p.email ?? undefined,
    isVerified: p.is_verified,
    verificationPending: p.verification_pending,
    gender: p.gender,
    seeking_gender: p.seeking_gender,
    seeking_age_min: p.seeking_age_min,
    seeking_age_max: p.seeking_age_max,
    isBlocked: p.is_blocked,
    suspendedAt: p.suspended_at,
    deletionRequestedAt: p.deletion_requested_at,
    deletionScheduledAt: p.deletion_scheduled_at,
    lastActive: p.last_active,
    createdAt: p.created_at,
    role: p.role || 'user',
    isPremium: p.is_premium,
    premiumUntil: p.premium_until,
    photos: [safeImageUrl].filter(Boolean),
    details: {
      occupation: p.occupation,
      zodiac: p.zodiac,
      smoking: p.smoking,
      children: p.children,
      drinking: p.drinking,
      pets: p.pets,
      sexual_orientation: p.sexual_orientation,
      looking_for: p.looking_for,
    },
  };
}

/**
 * Filtruje profile wykluczając konta techniczne (adminy)
 * oraz profile ukryte/zawieszone.
 */
export function filterNonAdminProfiles(profiles: Profile[]): Profile[] {
  return profiles.filter((p) => {
    const isAdminAccount = Boolean(p.role && (p.role === 'admin' || p.role === 'super_admin'));
    const isHidden = Boolean(p.isBlocked) || Boolean(p.suspendedAt) || Boolean(p.deletionScheduledAt);
    return !isAdminAccount && !isHidden;
  });
}

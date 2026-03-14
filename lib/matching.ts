import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, SupabaseProfile, getLookingFor, mapSupabaseProfile } from '@/lib/types';

export type MatchSort = 'recommended' | 'match' | 'closest' | 'newest' | 'active' | 'ageAsc' | 'ageDesc';

export type MatchCursor = {
  sortValue: number;
  createdAt: string;
  id: string;
};

export type RankedProfileItem = {
  profile: Profile;
  matchScore: number;
  recommendedScore: number;
  sharedInterests: number;
  isNearby: boolean;
  activityTs: number;
  sortValue: number;
};

export type RankedProfilesResult = {
  items: RankedProfileItem[];
  nextCursor: MatchCursor | null;
  hasMore: boolean;
};

type RankedProfileRpcRow = SupabaseProfile & {
  match_score?: number | null;
  recommended_score?: number | null;
  shared_interests?: number | null;
  is_nearby?: boolean | null;
  activity_ts?: string | null;
  sort_value?: number | null;
};

export type RankedProfilesQuery = {
  viewerProfileId?: string | null;
  limit?: number;
  cursor?: MatchCursor | null;
  sort?: MatchSort;
  ageMin?: number | null;
  ageMax?: number | null;
  lookingFor?: Iterable<string> | null;
  orientation?: Iterable<string> | null;
  pets?: Iterable<string> | null;
  drinking?: Iterable<string> | null;
  referenceCity?: string | null;
};

export type MatchableProfile = {
  id?: string | null;
  age?: number | null;
  city?: string | null;
  interests?: string[] | null;
  status?: string | null;
  details?: {
    looking_for?: string | null;
  } | null;
  looking_for?: string | null;
  gender?: string | null;
  seeking_gender?: string | null;
  seeking_age_min?: number | null;
  seeking_age_max?: number | null;
  last_active?: string | null;
  lastActive?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  isVerified?: boolean | null;
  is_verified?: boolean | null;
};

export type UnifiedCompatibilityResult = {
  matchScore: number;
  recommendedScore: number;
  sharedInterests: number;
  sharedTraits: number;
  isNearby: boolean;
  lookingForMatch: boolean;
  ageCompatibility: boolean;
  genderCompatibility: boolean;
  activityTs: number;
};

function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getProfileLookingFor(profile: MatchableProfile | null): string {
  if (!profile) return '';

  const nested = normalizeText(profile.details?.looking_for);
  if (nested) return nested;

  const direct = normalizeText(profile.looking_for);
  if (direct) return direct;

  const inferred = getLookingFor(profile.status || '');
  return inferred ? normalizeText(inferred) : '';
}

function isAgeWithinRange(age: number, min?: number | null, max?: number | null): boolean {
  if (!Number.isFinite(age)) return false;
  if (typeof min === 'number' && age < min) return false;
  if (typeof max === 'number' && age > max) return false;
  return true;
}

function getActivityBonus(activityTs: number): number {
  if (!activityTs) return 0;
  const hoursAgo = (Date.now() - activityTs) / 3600000;
  if (hoursAgo <= 2) return 12;
  if (hoursAgo <= 24) return 8;
  if (hoursAgo <= 72) return 5;
  if (hoursAgo <= 168) return 2;
  return 0;
}

export function computeUnifiedCompatibility(
  viewer: MatchableProfile | null,
  target: MatchableProfile | null,
): UnifiedCompatibilityResult {
  if (!target || !viewer) {
    return {
      matchScore: 0,
      recommendedScore: 0,
      sharedInterests: 0,
      sharedTraits: 0,
      isNearby: false,
      lookingForMatch: false,
      ageCompatibility: false,
      genderCompatibility: false,
      activityTs: 0,
    };
  }

  const myInterests = new Set((viewer.interests || []).map((interest) => normalizeText(interest)));
  const targetInterests = (target.interests || []).map((interest) => normalizeText(interest));
  const sharedInterests = targetInterests.filter((interest) => interest && myInterests.has(interest)).length;

  const isNearby = normalizeText(viewer.city) !== ''
    && normalizeText(viewer.city) === normalizeText(target.city);

  const lookingForMatch = Boolean(
    getProfileLookingFor(viewer)
    && getProfileLookingFor(viewer) === getProfileLookingFor(target),
  );

  const ageCompatibility = isAgeWithinRange(
    Number(target.age || 0),
    viewer.seeking_age_min,
    viewer.seeking_age_max,
  ) && isAgeWithinRange(
    Number(viewer.age || 0),
    target.seeking_age_min,
    target.seeking_age_max,
  );

  const genderCompatibility =
    (!viewer.seeking_gender || !target.gender || normalizeText(viewer.seeking_gender) === normalizeText(target.gender))
    && (!target.seeking_gender || !viewer.gender || normalizeText(target.seeking_gender) === normalizeText(viewer.gender));

  const activityTs = toTimestamp(target.lastActive || target.last_active || target.createdAt || target.created_at);
  const activityBonus = getActivityBonus(activityTs);
  const isVerified = Boolean(target.isVerified || target.is_verified);

  const recommendedScore =
    sharedInterests * 18
    + (isNearby ? 14 : 0)
    + (lookingForMatch ? 16 : 0)
    + (ageCompatibility ? 10 : 0)
    + (genderCompatibility ? 6 : -8)
    + (isVerified ? 4 : 0)
    + activityBonus;

  const matchScore = clamp(
    50
      + sharedInterests * 11
      + (isNearby ? 8 : 0)
      + (lookingForMatch ? 9 : 0)
      + (ageCompatibility ? 6 : 0)
      + Math.min(10, activityBonus)
      + (genderCompatibility ? 4 : -6),
    52,
    99,
  );

  const sharedTraits =
    sharedInterests
    + (isNearby ? 1 : 0)
    + (lookingForMatch ? 1 : 0)
    + (ageCompatibility ? 1 : 0)
    + (genderCompatibility ? 1 : 0);

  if (viewer.id && target.id && viewer.id === target.id) {
    return {
      matchScore: 100,
      recommendedScore,
      sharedInterests,
      sharedTraits: Math.max(sharedTraits, 1),
      isNearby: true,
      lookingForMatch: true,
      ageCompatibility: true,
      genderCompatibility: true,
      activityTs,
    };
  }

  return {
    matchScore,
    recommendedScore,
    sharedInterests,
    sharedTraits,
    isNearby,
    lookingForMatch,
    ageCompatibility,
    genderCompatibility,
    activityTs,
  };
}

function clampLimit(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 24;
  return Math.max(1, Math.min(100, Math.floor(value)));
}

function normalizeFilter(values?: Iterable<string> | null): string[] | null {
  if (!values) return null;

  const normalized = Array.from(values)
    .map((value) => value.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : null;
}

function toSortParam(sort: MatchSort | undefined): string {
  if (!sort) return 'recommended';
  if (sort === 'ageAsc') return 'ageasc';
  if (sort === 'ageDesc') return 'agedesc';
  return sort;
}

function toTimestamp(value?: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

export async function fetchRankedProfilesPage(query: RankedProfilesQuery): Promise<RankedProfilesResult> {
  const pageSize = clampLimit(query.limit);

  const { data, error } = await supabase.rpc('search_ranked_profiles', {
    p_viewer_profile_id: query.viewerProfileId ?? null,
    p_limit: pageSize + 1,
    p_cursor_sort_value: query.cursor?.sortValue ?? null,
    p_cursor_created_at: query.cursor?.createdAt ?? null,
    p_cursor_id: query.cursor?.id ?? null,
    p_age_min: query.ageMin ?? null,
    p_age_max: query.ageMax ?? null,
    p_looking_for: normalizeFilter(query.lookingFor),
    p_orientation: normalizeFilter(query.orientation),
    p_pets: normalizeFilter(query.pets),
    p_drinking: normalizeFilter(query.drinking),
    p_reference_city: query.referenceCity?.trim() || null,
    p_sort: toSortParam(query.sort),
  });

  if (error) throw error;

  const rows = ((data || []) as RankedProfileRpcRow[]);
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  const items = pageRows.map((row) => {
    const profile = mapSupabaseProfile(row as SupabaseProfile);
    return {
      profile,
      matchScore: Math.round(row.match_score ?? 0),
      recommendedScore: Math.round(row.recommended_score ?? 0),
      sharedInterests: Math.max(0, Math.round(row.shared_interests ?? 0)),
      isNearby: Boolean(row.is_nearby),
      activityTs: toTimestamp(row.activity_ts || row.last_active || row.created_at),
      sortValue: Number(row.sort_value ?? 0),
    } satisfies RankedProfileItem;
  });

  const last = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && last
    ? {
      sortValue: Number(last.sort_value ?? 0),
      createdAt: String(last.created_at || ''),
      id: String(last.id),
    }
    : null;

  return { items, nextCursor, hasMore };
}

export function isMissingMatchingRpc(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybe = error as PostgrestError;
  const code = String(maybe.code || '');
  const message = String(maybe.message || '').toLowerCase();

  if (code === 'PGRST202') return true;
  return message.includes('search_ranked_profiles') && message.includes('not found');
}

import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, SupabaseProfile, mapSupabaseProfile } from '@/lib/types';

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

import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isAdminRole,
  resolveProfileForAuthUser,
  verifyAuthUserFromBearer,
} from '@/lib/server/supabaseAdmin';

type VerificationRequestRow = {
  id: string;
  profile_id: string;
  selfie_storage_path: string;
  status: 'pending_ai' | 'pending_admin' | 'approved' | 'rejected';
  ai_score?: number | null;
  ai_reason?: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  name?: string | null;
  image_url?: string | null;
  city?: string | null;
  age?: number | null;
  is_verified?: boolean | null;
};

const SELFIE_BUCKET = 'verification-selfies';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const authResult = await verifyAuthUserFromBearer(supabase, request.headers.get('authorization'));

    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status });
    }

    const requesterProfile = await resolveProfileForAuthUser(supabase, authResult.user);
    if (!requesterProfile || !isAdminRole(requesterProfile.role)) {
      return NextResponse.json({ error: 'Only admins can access verification queue' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('verification_requests')
      .select('id, profile_id, selfie_storage_path, status, ai_score, ai_reason, created_at')
      .in('status', ['pending_ai', 'pending_admin'])
      .order('created_at', { ascending: false })
      .limit(120);

    if (error) {
      const lowerMessage = error.message.toLowerCase();
      if (lowerMessage.includes('verification_requests')) {
        return NextResponse.json(
          { error: 'Run migration first: supabase/verification_selfie_migration.sql' },
          { status: 500 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (data as VerificationRequestRow[] | null) || [];
    const profileIds = Array.from(new Set(rows.map((row) => row.profile_id)));

    const profileMap = new Map<string, ProfileRow>();
    if (profileIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, image_url, city, age, is_verified')
        .in('id', profileIds);

      for (const row of ((profileData as ProfileRow[] | null) || [])) {
        profileMap.set(row.id, row);
      }
    }

    const queue = await Promise.all(
      rows.map(async (row) => {
        const profile = profileMap.get(row.profile_id);

        const { data: signedUrlData } = await supabase.storage
          .from(SELFIE_BUCKET)
          .createSignedUrl(row.selfie_storage_path, 60 * 30);

        return {
          id: row.id,
          profileId: row.profile_id,
          profileName: profile?.name || 'Nieznany',
          profileImage: profile?.image_url || null,
          profileCity: profile?.city || null,
          profileAge: typeof profile?.age === 'number' ? profile.age : null,
          profileVerified: Boolean(profile?.is_verified),
          status: row.status,
          aiScore: row.ai_score ?? null,
          aiReason: row.ai_reason ?? null,
          selfiePreviewUrl: signedUrlData?.signedUrl || null,
          createdAt: row.created_at,
        };
      }),
    );

    return NextResponse.json({ success: true, queue });
  } catch (error) {
    console.error('Error loading verification queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

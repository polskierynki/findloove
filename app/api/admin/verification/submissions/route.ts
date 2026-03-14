import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isAdminRole,
  resolveProfileForAuthUser,
  verifyAuthUserFromBearer,
} from '@/lib/server/supabaseAdmin';

type VerificationSubmissionRow = {
  id: string;
  profile_id: string;
  selfie_storage_path: string;
  status: 'pending_ai' | 'pending_admin' | 'approved' | 'rejected';
  ai_score?: number | null;
  ai_reason?: string | null;
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
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
      return NextResponse.json({ error: 'Only admins can access verification submissions' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('verification_requests')
      .select('id, profile_id, selfie_storage_path, status, ai_score, ai_reason, admin_note, created_at, reviewed_at')
      .order('created_at', { ascending: false })
      .limit(300);

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

    const rows = (data as VerificationSubmissionRow[] | null) || [];
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

    const submissions = await Promise.all(
      rows.map(async (row) => {
        const profile = profileMap.get(row.profile_id);

        let selfiePreviewUrl: string | null = null;
        if (row.selfie_storage_path) {
          const { data: signedUrlData } = await supabase.storage
            .from(SELFIE_BUCKET)
            .createSignedUrl(row.selfie_storage_path, 60 * 30);

          selfiePreviewUrl = signedUrlData?.signedUrl || null;
        }

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
          adminNote: row.admin_note ?? null,
          selfiePreviewUrl,
          createdAt: row.created_at,
          reviewedAt: row.reviewed_at ?? null,
        };
      }),
    );

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('Error loading verification submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

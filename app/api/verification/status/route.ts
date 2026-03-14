import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  resolveProfileForAuthUser,
  verifyAuthUserFromBearer,
} from '@/lib/server/supabaseAdmin';

type ProfileStatusRow = {
  is_verified?: boolean | null;
  verification_pending?: boolean | null;
};

type VerificationRequestRow = {
  id: string;
  status: 'pending_ai' | 'pending_admin' | 'approved' | 'rejected';
  ai_score?: number | null;
  ai_reason?: string | null;
  admin_note?: string | null;
  selfie_storage_path?: string | null;
  created_at: string;
  reviewed_at?: string | null;
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
    if (!requesterProfile) {
      return NextResponse.json({ error: 'Profile not linked to current account' }, { status: 403 });
    }

    const { data: profileState, error: profileStateError } = await supabase
      .from('profiles')
      .select('is_verified, verification_pending')
      .eq('id', requesterProfile.id)
      .maybeSingle();

    if (profileStateError) {
      return NextResponse.json({ error: profileStateError.message }, { status: 400 });
    }

    const profileRow = (profileState as ProfileStatusRow | null) || null;

    const { data: latestRequest, error: latestRequestError } = await supabase
      .from('verification_requests')
      .select('id, status, ai_score, ai_reason, admin_note, selfie_storage_path, created_at, reviewed_at')
      .eq('profile_id', requesterProfile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRequestError) {
      const lowerMessage = latestRequestError.message.toLowerCase();
      if (lowerMessage.includes('verification_requests')) {
        return NextResponse.json(
          {
            isVerified: Boolean(profileRow?.is_verified),
            verificationPending: Boolean(profileRow?.verification_pending),
            request: null,
            setupRequired: true,
            setupMessage: 'Uruchom migracje: supabase/verification_selfie_migration.sql',
          },
          { status: 200 },
        );
      }

      return NextResponse.json({ error: latestRequestError.message }, { status: 400 });
    }

    const requestRow = latestRequest as VerificationRequestRow | null;
    let selfiePreviewUrl: string | null = null;

    if (requestRow?.selfie_storage_path) {
      const { data: signedUrlData } = await supabase.storage
        .from(SELFIE_BUCKET)
        .createSignedUrl(requestRow.selfie_storage_path, 60 * 20);

      selfiePreviewUrl = signedUrlData?.signedUrl || null;
    }

    return NextResponse.json({
      isVerified: Boolean(profileRow?.is_verified),
      verificationPending: Boolean(profileRow?.verification_pending),
      request: requestRow
        ? {
            id: requestRow.id,
            status: requestRow.status,
            aiScore: requestRow.ai_score ?? null,
            aiReason: requestRow.ai_reason ?? null,
            adminNote: requestRow.admin_note ?? null,
            selfiePreviewUrl,
            createdAt: requestRow.created_at,
            reviewedAt: requestRow.reviewed_at ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('Error reading verification status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

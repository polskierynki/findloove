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
};

const SELFIE_BUCKET = 'verification-selfies';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const authResult = await verifyAuthUserFromBearer(supabase, request.headers.get('authorization'));

    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status });
    }

    const requesterProfile = await resolveProfileForAuthUser(supabase, authResult.user);
    if (!requesterProfile || !isAdminRole(requesterProfile.role)) {
      return NextResponse.json({ error: 'Only admins can delete verification selfie submissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestId = String((body as { requestId?: string }).requestId || '').trim();

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    const { data: verificationRequest, error: verificationRequestError } = await supabase
      .from('verification_requests')
      .select('id, profile_id, selfie_storage_path, status')
      .eq('id', requestId)
      .maybeSingle();

    if (verificationRequestError) {
      return NextResponse.json({ error: verificationRequestError.message }, { status: 400 });
    }

    const requestRow = verificationRequest as VerificationRequestRow | null;
    if (!requestRow) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }

    let storageWarning: string | null = null;
    if (requestRow.selfie_storage_path) {
      const { error: removeStorageError } = await supabase.storage
        .from(SELFIE_BUCKET)
        .remove([requestRow.selfie_storage_path]);

      if (removeStorageError) {
        const lowerMsg = removeStorageError.message.toLowerCase();
        const isNotFound = lowerMsg.includes('not found') || lowerMsg.includes('does not exist');
        if (!isNotFound) {
          storageWarning = removeStorageError.message;
        }
      }
    }

    const { error: deleteRequestError } = await supabase
      .from('verification_requests')
      .delete()
      .eq('id', requestRow.id);

    if (deleteRequestError) {
      return NextResponse.json({ error: deleteRequestError.message }, { status: 400 });
    }

    // Recalculate profile verification flags based on remaining requests
    const { data: remainingRequests, error: remainingError } = await supabase
      .from('verification_requests')
      .select('status')
      .eq('profile_id', requestRow.profile_id)
      .in('status', ['pending_ai', 'pending_admin', 'approved']);

    if (remainingError) {
      return NextResponse.json({ error: remainingError.message }, { status: 400 });
    }

    const remainingStatuses = ((remainingRequests as Array<{ status: string }> | null) || []).map((item) => item.status);
    const hasPending = remainingStatuses.includes('pending_ai') || remainingStatuses.includes('pending_admin');
    const hasApproved = remainingStatuses.includes('approved');

    const { error: profilePatchError } = await supabase
      .from('profiles')
      .update({
        verification_pending: hasPending,
        is_verified: hasApproved,
      })
      .eq('id', requestRow.profile_id);

    if (profilePatchError) {
      return NextResponse.json({ error: profilePatchError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Selfie zostało usunięte przez administratora.',
      storageWarning,
    });
  } catch (error) {
    console.error('Error deleting verification submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

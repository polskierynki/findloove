import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  isAdminRole,
  resolveProfileForAuthUser,
  verifyAuthUserFromBearer,
} from '@/lib/server/supabaseAdmin';

type ReviewDecision = 'approve' | 'reject';

type VerificationRequestRow = {
  id: string;
  profile_id: string;
  status: 'pending_ai' | 'pending_admin' | 'approved' | 'rejected';
};

function normalizeDecision(value: unknown): ReviewDecision | null {
  if (value === 'approve' || value === 'reject') return value;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const authResult = await verifyAuthUserFromBearer(supabase, request.headers.get('authorization'));

    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status });
    }

    const requesterProfile = await resolveProfileForAuthUser(supabase, authResult.user);
    if (!requesterProfile || !isAdminRole(requesterProfile.role)) {
      return NextResponse.json({ error: 'Only admins can review selfie verification' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestId = String((body as { requestId?: string }).requestId || '').trim();
    const decision = normalizeDecision((body as { decision?: string }).decision);
    const note = String((body as { note?: string }).note || '').trim();

    if (!requestId || !decision) {
      return NextResponse.json({ error: 'requestId and decision are required' }, { status: 400 });
    }

    const { data: verificationRequest, error: verificationRequestError } = await supabase
      .from('verification_requests')
      .select('id, profile_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (verificationRequestError) {
      return NextResponse.json({ error: verificationRequestError.message }, { status: 400 });
    }

    const requestRow = verificationRequest as VerificationRequestRow | null;
    if (!requestRow) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }

    if (requestRow.status !== 'pending_admin' && requestRow.status !== 'pending_ai') {
      return NextResponse.json({ error: 'This request has already been reviewed' }, { status: 409 });
    }

    const targetStatus = decision === 'approve' ? 'approved' : 'rejected';

    const { error: reviewError } = await supabase
      .from('verification_requests')
      .update({
        status: targetStatus,
        admin_reviewer_id: requesterProfile.id,
        admin_note: note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 400 });
    }

    const profilePatch =
      decision === 'approve'
        ? { is_verified: true, verification_pending: false }
        : { verification_pending: false };

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profilePatch)
      .eq('id', requestRow.profile_id);

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: targetStatus,
      message:
        decision === 'approve'
          ? 'Weryfikacja zostala zaakceptowana.'
          : 'Weryfikacja zostala odrzucona.',
    });
  } catch (error) {
    console.error('Error reviewing verification request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  resolveProfileForAuthUser,
  verifyAuthUserFromBearer,
} from '@/lib/server/supabaseAdmin';

type VerificationStatus = 'pending_ai' | 'pending_admin' | 'approved' | 'rejected';

type PendingRequestRow = {
  id: string;
  status: VerificationStatus;
};

type ProfileVerificationRow = {
  is_verified?: boolean | null;
  verification_pending?: boolean | null;
};

type ParsedImage = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  fileExt: 'jpg' | 'png' | 'webp';
  buffer: Buffer;
};

const SELFIE_BUCKET = 'verification-selfies';
const MAX_SELFIE_BYTES = 5 * 1024 * 1024;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseSelfieDataUrl(value: string): ParsedImage | null {
  const normalized = (value || '').trim();
  const match = normalized.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);

  if (!match) return null;

  const mimeRaw = match[1].toLowerCase();
  const base64Payload = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer || buffer.length === 0 || buffer.length > MAX_SELFIE_BYTES) {
    return null;
  }

  if (mimeRaw === 'image/png') {
    return { mimeType: 'image/png', fileExt: 'png', buffer };
  }

  if (mimeRaw === 'image/webp') {
    return { mimeType: 'image/webp', fileExt: 'webp', buffer };
  }

  return { mimeType: 'image/jpeg', fileExt: 'jpg', buffer };
}

function evaluateSelfieAiScore(image: ParsedImage): { score: number; reason: string } {
  const sizeKb = image.buffer.length / 1024;

  let score = 0.56;
  if (sizeKb >= 35) score += 0.16;
  if (sizeKb >= 75) score += 0.1;
  if (sizeKb < 18) score -= 0.22;
  if (sizeKb > 900) score -= 0.16;

  if (image.mimeType === 'image/jpeg') score += 0.06;
  if (image.mimeType === 'image/webp') score += 0.04;

  score = clamp(score, 0.3, 0.97);

  let reason = 'Niska jakosc selfie, potrzebne ponowienie.';
  if (score >= 0.92) {
    reason = 'Bardzo wysoka jakosc selfie, mozliwa automatyczna akceptacja.';
  } else if (score >= 0.75) {
    reason = 'Selfie dobrej jakosci, przekazane do decyzji moderatora.';
  } else if (score >= 0.45) {
    reason = 'Selfie wymaga recznej weryfikacji przez moderatora.';
  }

  return {
    score: Number(score.toFixed(4)),
    reason,
  };
}

export async function POST(request: NextRequest) {
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

    const payload = await request.json().catch(() => ({}));
    const imageData = String((payload as { imageData?: string }).imageData || '');

    const parsedSelfie = parseSelfieDataUrl(imageData);
    if (!parsedSelfie) {
      return NextResponse.json(
        { error: 'Nieprawidlowe selfie. Uzyj zdjecia JPG/PNG/WEBP (max 5MB).' },
        { status: 400 },
      );
    }

    const { data: profileState, error: profileStateError } = await supabase
      .from('profiles')
      .select('is_verified, verification_pending')
      .eq('id', requesterProfile.id)
      .maybeSingle();

    if (profileStateError) {
      return NextResponse.json({ error: profileStateError.message }, { status: 400 });
    }

    const profileRow = (profileState as ProfileVerificationRow | null) || null;

    if (profileRow?.is_verified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        status: 'approved',
        message: 'Profil jest juz zweryfikowany.',
      });
    }

    const { data: pendingRequest, error: pendingRequestError } = await supabase
      .from('verification_requests')
      .select('id, status')
      .eq('profile_id', requesterProfile.id)
      .in('status', ['pending_ai', 'pending_admin'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingRequestError) {
      const lowerMessage = pendingRequestError.message.toLowerCase();
      if (lowerMessage.includes('verification_requests')) {
        return NextResponse.json(
          {
            error: 'Brak tabeli verification_requests. Uruchom migracje: supabase/verification_selfie_migration.sql',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ error: pendingRequestError.message }, { status: 400 });
    }

    const pendingRow = pendingRequest as PendingRequestRow | null;

    if (pendingRow?.id) {
      return NextResponse.json(
        {
          error: 'Masz juz aktywna prosbe o weryfikacje. Poczekaj na decyzje.',
          status: pendingRow.status,
        },
        { status: 409 },
      );
    }

    const storagePath = `selfies/${requesterProfile.id}/${Date.now()}-${randomUUID()}.${parsedSelfie.fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(SELFIE_BUCKET)
      .upload(storagePath, parsedSelfie.buffer, {
        contentType: parsedSelfie.mimeType,
        upsert: false,
      });

    if (uploadError) {
      const lowerMessage = uploadError.message.toLowerCase();
      if (lowerMessage.includes('bucket') || lowerMessage.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Brak konfiguracji storage dla selfie. Uruchom migracje: supabase/verification_selfie_migration.sql',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { score: aiScore, reason: aiReason } = evaluateSelfieAiScore(parsedSelfie);
    const autoApproveEnabled = process.env.VERIFICATION_AUTO_APPROVE === '1';

    let finalStatus: VerificationStatus = 'pending_admin';
    if (aiScore < 0.45) {
      finalStatus = 'rejected';
    } else if (autoApproveEnabled && aiScore >= 0.92) {
      finalStatus = 'approved';
    }

    const { error: insertError } = await supabase
      .from('verification_requests')
      .insert({
        profile_id: requesterProfile.id,
        selfie_storage_path: storagePath,
        status: finalStatus,
        ai_score: aiScore,
        ai_reason: aiReason,
        ...(finalStatus === 'approved' || finalStatus === 'rejected'
          ? { reviewed_at: new Date().toISOString() }
          : {}),
      });

    if (insertError) {
      const { error: cleanupError } = await supabase.storage
        .from(SELFIE_BUCKET)
        .remove([storagePath]);

      if (cleanupError) {
        console.error('Failed to cleanup uploaded selfie after insert error:', cleanupError);
      }

      const lowerMessage = insertError.message.toLowerCase();
      if (lowerMessage.includes('verification_requests')) {
        return NextResponse.json(
          {
            error: 'Brak tabeli verification_requests. Uruchom migracje: supabase/verification_selfie_migration.sql',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    const profilePatch: Record<string, boolean> = {
      verification_pending: finalStatus === 'pending_admin',
    };

    if (finalStatus === 'approved') {
      profilePatch.is_verified = true;
      profilePatch.verification_pending = false;
    }

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update(profilePatch)
      .eq('id', requesterProfile.id);

    if (updateProfileError) {
      return NextResponse.json({ error: updateProfileError.message }, { status: 400 });
    }

    const message =
      finalStatus === 'approved'
        ? 'Weryfikacja zakonczona pozytywnie.'
        : finalStatus === 'rejected'
        ? 'Selfie odrzucone automatycznie. Sprobuj ponownie przy lepszym oswietleniu.'
        : 'Selfie wyslane. Czeka na akceptacje moderatora.';

    return NextResponse.json({
      success: true,
      status: finalStatus,
      aiScore,
      aiReason,
      message,
    });
  } catch (error) {
    console.error('Error submitting selfie verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

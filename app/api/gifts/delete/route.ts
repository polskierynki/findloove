import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type RequesterProfile = {
  id: string;
  role: string | null;
};

type GiftRow = {
  id: string;
  kind: string | null;
  to_profile_id: string | null;
  message: string | null;
};

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function resolveRequesterProfile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  email?: string | null,
): Promise<RequesterProfile | null> {
  const { data: byId } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  const byIdRow = byId as { id?: string | null; role?: string | null } | null;

  if (byIdRow?.id) {
    return {
      id: byIdRow.id,
      role: byIdRow.role || null,
    };
  }

  if (!email) return null;

  const { data: byEmail } = await supabase
    .from('profiles')
    .select('id, role')
    .ilike('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const byEmailRow = byEmail as { id?: string | null; role?: string | null } | null;

  if (byEmailRow?.id) {
    return {
      id: byEmailRow.id,
      role: byEmailRow.role || null,
    };
  }

  return null;
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requesterProfile = await resolveRequesterProfile(supabase, user.id, user.email);
    if (!requesterProfile) {
      return NextResponse.json({ error: 'Profile not linked to current session' }, { status: 403 });
    }

    const payload = await request.json().catch(() => ({}));
    const giftId = String((payload as { giftId?: string }).giftId || '').trim();

    if (!giftId) {
      return NextResponse.json({ error: 'Gift ID is required' }, { status: 400 });
    }

    const { data: gift, error: giftError } = await supabase
      .from('profile_interactions')
      .select('id, kind, to_profile_id, message')
      .eq('id', giftId)
      .maybeSingle();

    if (giftError) {
      return NextResponse.json({ error: giftError.message }, { status: 400 });
    }

    const giftRow = gift as GiftRow | null;

    if (!giftRow || giftRow.kind !== 'gift') {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    const role = (requesterProfile.role || '').trim().toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isGiftRecipient = requesterProfile.id === giftRow.to_profile_id;
    const giftHasComment = Boolean((giftRow.message || '').trim());

    const canDeleteAsUser = isGiftRecipient && giftHasComment;

    if (!isAdmin && !canDeleteAsUser) {
      return NextResponse.json(
        { error: 'Only admins or recipient of gift with offensive comment can delete this gift' },
        { status: 403 },
      );
    }

    const { error: deleteError } = await supabase
      .from('profile_interactions')
      .delete()
      .eq('id', giftId)
      .eq('kind', 'gift');

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: isAdmin
        ? 'Prezent zostal usuniety przez moderatora.'
        : 'Prezent z niestosownym komentarzem zostal usuniety.',
    });
  } catch (error) {
    console.error('Error deleting gift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

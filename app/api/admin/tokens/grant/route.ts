import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =============================================================
// POST /api/admin/tokens/grant
//
// Protected — only admin/super_admin callers.
// Body: { targetProfileId: string, amount: number, reason: string }
// Auth: Bearer token in Authorization header
// =============================================================

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!accessToken) {
      return NextResponse.json({ error: 'Brak tokenu autoryzacji.' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Błąd konfiguracji serwera.' }, { status: 500 });
    }

    // Verify caller identity
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: 'Nieautoryzowany.' }, { status: 401 });
    }

    // Check caller has admin role
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const callerRole = (callerProfile as { role?: string } | null)?.role ?? '';
    if (!['admin', 'super_admin'].includes(callerRole)) {
      return NextResponse.json({ error: 'Brak uprawnień.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetProfileId = String(body?.targetProfileId || '').trim();
    const amount = Number(body?.amount || 0);
    const reason = String(body?.reason || '').trim();

    if (!targetProfileId) {
      return NextResponse.json({ error: 'Brak targetProfileId.' }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
      return NextResponse.json({ error: 'Nieprawidłowa kwota tokenów (1–100000).' }, { status: 400 });
    }

    // Credit tokens directly (bypass RPC since we already verified role)
    const { data: profileData, error: balanceError } = await supabaseAdmin
      .from('profiles')
      .update({ token_balance: supabaseAdmin.rpc as unknown as number })
      .eq('id', targetProfileId)
      .select('token_balance, name')
      .maybeSingle();

    // Use raw update + select pattern instead of RPC (avoids RLS complexity here)
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('token_balance, name')
      .eq('id', targetProfileId)
      .maybeSingle();

    if (!currentProfile) {
      return NextResponse.json({ error: 'Profil docelowy nie istnieje.' }, { status: 404 });
    }

    const currentBalance = Number((currentProfile as { token_balance?: number | null }).token_balance ?? 0);
    const newBalance = currentBalance + amount;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ token_balance: newBalance })
      .eq('id', targetProfileId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the transaction
    const { data: txData } = await supabaseAdmin
      .from('token_transactions')
      .insert({
        profile_id:    targetProfileId,
        amount,
        balance_after: newBalance,
        type:          'admin_grant',
        description:   reason || 'Doładowanie od admina',
        reference_id:  user.id,
      })
      .select('id')
      .maybeSingle();

    const profileName = (currentProfile as { name?: string }).name ?? 'Użytkownik';

    void balanceError; // unused, suppress lint
    void profileData;

    return NextResponse.json({
      ok: true,
      newBalance,
      tokensAdded: amount,
      transactionId: (txData as { id?: string } | null)?.id ?? null,
      profileName,
    });
  } catch (err) {
    console.error('Admin token grant error:', err);
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera.' }, { status: 500 });
  }
}

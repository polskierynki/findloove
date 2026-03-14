import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =============================================================
// POST /api/tokens/webhook
//
// Called by Przelewy24 when payment is confirmed.
// Body (P24 notification):
//   { merchantId, posId, sessionId, amount, originAmount, currency,
//     orderId, methodId, statement, sign }
//
// Also accepts manual body for internal use:
//   { provider: 'manual', sessionId, profileId, packageId }
// =============================================================

const TOKEN_PACKAGES: Record<
  string,
  { name: string; tokens: number; bonusTokens: number; priceGrosze: number }
> = {
  starter:      { name: 'Starter',   tokens: 200,  bonusTokens: 0,    priceGrosze: 900   },
  standard:     { name: 'Standard',  tokens: 500,  bonusTokens: 150,  priceGrosze: 2500  },
  popular:      { name: 'Popularny', tokens: 1000, bonusTokens: 500,  priceGrosze: 5000  },
  premium_pack: { name: 'Premium+',  tokens: 2000, bonusTokens: 1500, priceGrosze: 10000 },
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Błąd konfiguracji serwera.' }, { status: 500 });
    }

    // ──── Manual / internal mode ────
    if (body?.provider === 'manual') {
      const profileId = String(body?.profileId || '').trim();
      const packageId = String(body?.packageId || '').trim();
      const sessionId = String(body?.sessionId || `manual_${Date.now()}`).trim();
      const webhookSecret = process.env.BILLING_WEBHOOK_SECRET;

      if (webhookSecret && req.headers.get('x-billing-signature') !== webhookSecret) {
        return NextResponse.json({ error: 'Nieprawidłowy podpis.' }, { status: 401 });
      }

      const pkg = packageId ? TOKEN_PACKAGES[packageId] : null;
      if (!profileId || !pkg) {
        return NextResponse.json({ error: 'Brak wymaganych danych.' }, { status: 400 });
      }

      const totalTokens = pkg.tokens + pkg.bonusTokens;
      const { data, error } = await supabaseAdmin.rpc('credit_purchased_tokens', {
        p_profile_id:  profileId,
        p_amount:      totalTokens,
        p_price_grosz: pkg.priceGrosze,
        p_session_id:  sessionId,
        p_description: `${pkg.name} — ${totalTokens} tokenów`,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const newBalance = (data as Array<{ new_balance: number }>)?.[0]?.new_balance ?? 0;
      return NextResponse.json({ ok: true, newBalance, tokensAdded: totalTokens });
    }

    // ──── Przelewy24 notification ────
    const sessionId = String(body?.sessionId || '').trim();
    const amount = Number(body?.amount || 0);
    const orderId = Number(body?.orderId || 0);
    const sign = String(body?.sign || '').trim();

    if (!sessionId || !orderId) {
      return NextResponse.json({ error: 'Brak sessionId lub orderId.' }, { status: 400 });
    }

    const p24MerchantId = process.env.P24_MERCHANT_ID;
    const p24PosId = process.env.P24_POS_ID;
    const p24CrcKey = process.env.P24_CRC_KEY;
    const p24ApiKey = process.env.P24_API_KEY;
    const p24Sandbox = process.env.P24_SANDBOX !== 'false';

    if (!p24MerchantId || !p24PosId || !p24CrcKey || !p24ApiKey) {
      return NextResponse.json({ error: 'Brak konfiguracji P24.' }, { status: 500 });
    }

    // Verify signature
    const expectedSignPayload = JSON.stringify({
      sessionId,
      orderId,
      amount,
      currency: 'PLN',
      crc: p24CrcKey,
    });
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-384',
      encoder.encode(expectedSignPayload),
    );
    const expectedSign = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (sign !== expectedSign) {
      console.error('P24 webhook signature mismatch');
      return NextResponse.json({ error: 'Nieprawidłowy podpis.' }, { status: 401 });
    }

    // Verify payment with P24
    const p24BaseUrl = p24Sandbox
      ? 'https://sandbox.przelewy24.pl'
      : 'https://secure.przelewy24.pl';

    const verifySignPayload = JSON.stringify({
      sessionId,
      orderId,
      amount,
      currency: 'PLN',
      crc: p24CrcKey,
    });
    const verifyHashBuffer = await crypto.subtle.digest(
      'SHA-384',
      encoder.encode(verifySignPayload),
    );
    const verifySign = Array.from(new Uint8Array(verifyHashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const p24Credentials = Buffer.from(`${p24PosId}:${p24ApiKey}`).toString('base64');

    const verifyResponse = await fetch(`${p24BaseUrl}/api/v1/transaction/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${p24Credentials}`,
      },
      body: JSON.stringify({
        merchantId: Number(p24MerchantId),
        posId: Number(p24PosId),
        sessionId,
        amount,
        currency: 'PLN',
        orderId,
        sign: verifySign,
      }),
    });

    if (!verifyResponse.ok) {
      console.error('P24 verify failed:', await verifyResponse.text());
      return NextResponse.json({ error: 'Weryfikacja płatności nieudana.' }, { status: 502 });
    }

    // Find the pending transaction for this session to get profileId and amount
    const { data: pendingTx } = await supabaseAdmin
      .from('token_transactions')
      .select('profile_id, description')
      .eq('reference_id', sessionId)
      .eq('type', 'purchase_pending')
      .maybeSingle();

    if (!pendingTx?.profile_id) {
      console.error('No pending transaction for session:', sessionId);
      return NextResponse.json({ error: 'Brak powiązanej transakcji.' }, { status: 404 });
    }

    // Determine tokens from amount paid (match to package by price)
    const matchedPkg = Object.values(TOKEN_PACKAGES).find(
      (p) => p.priceGrosze === amount,
    );
    const totalTokens = matchedPkg ? matchedPkg.tokens + matchedPkg.bonusTokens : 0;

    if (totalTokens === 0) {
      return NextResponse.json({ error: 'Nieznana kwota płatności.' }, { status: 400 });
    }

    // Delete the pending placeholder
    await supabaseAdmin
      .from('token_transactions')
      .delete()
      .eq('reference_id', sessionId)
      .eq('type', 'purchase_pending');

    // Credit tokens
    const { data, error } = await supabaseAdmin.rpc('credit_purchased_tokens', {
      p_profile_id:  pendingTx.profile_id,
      p_amount:      totalTokens,
      p_price_grosz: amount,
      p_session_id:  sessionId,
      p_description: `${matchedPkg?.name ?? 'Pakiet'} — ${totalTokens} tokenów (${(amount / 100).toFixed(2)} PLN)`,
    });

    if (error) {
      console.error('credit_purchased_tokens error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const newBalance = (data as Array<{ new_balance: number }>)?.[0]?.new_balance ?? 0;
    return NextResponse.json({ ok: true, newBalance, tokensAdded: totalTokens });
  } catch (err) {
    console.error('Token webhook error:', err);
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera.' }, { status: 500 });
  }
}

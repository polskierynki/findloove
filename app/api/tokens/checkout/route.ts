import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =============================================================
// POST /api/tokens/checkout
//
// Body: { profileId: string, packageId: string }
//
// Returns:
//   { mode: 'demo', newBalance: number, tokensAdded: number }  — demo mode (P24 keys not set)
//   { mode: 'p24', paymentUrl: string, sessionId: string }     — live Przelewy24 mode
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
    const profileId = String(body?.profileId || '').trim();
    const packageId = String(body?.packageId || '').trim();

    if (!profileId) {
      return NextResponse.json({ error: 'Brak profileId.' }, { status: 400 });
    }

    const pkg = TOKEN_PACKAGES[packageId];
    if (!pkg) {
      return NextResponse.json({ error: 'Nieznany pakiet tokenów.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Błąd konfiguracji serwera.' }, { status: 500 });
    }

    const totalTokens = pkg.tokens + pkg.bonusTokens;
    const sessionId = `tok_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const p24MerchantId = process.env.P24_MERCHANT_ID;
    const p24PosId = process.env.P24_POS_ID;
    const p24CrcKey = process.env.P24_CRC_KEY;
    const p24ApiKey = process.env.P24_API_KEY;
    const p24Sandbox = process.env.P24_SANDBOX !== 'false';

    const hasP24 = p24MerchantId && p24PosId && p24CrcKey && p24ApiKey;

    if (!hasP24) {
      // ──── DEMO MODE ────
      // Immediately credit tokens (for testing without payment gateway)
      const { data, error } = await supabaseAdmin.rpc('credit_purchased_tokens', {
        p_profile_id:  profileId,
        p_amount:      totalTokens,
        p_price_grosz: pkg.priceGrosze,
        p_session_id:  sessionId,
        p_description: `[DEMO] ${pkg.name} — ${totalTokens} tokenów`,
      });

      if (error) {
        console.error('credit_purchased_tokens error:', error);
        return NextResponse.json({ error: 'Nie udało się doładować konta.' }, { status: 500 });
      }

      const newBalance = (data as Array<{ new_balance: number }>)?.[0]?.new_balance ?? 0;

      return NextResponse.json({
        mode: 'demo',
        newBalance,
        tokensAdded: totalTokens,
        packageName: pkg.name,
      });
    }

    // ──── PRZELEWY24 LIVE MODE ────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zlotelata.pl';
    const p24BaseUrl = p24Sandbox
      ? 'https://sandbox.przelewy24.pl'
      : 'https://secure.przelewy24.pl';

    // Compute CRC sign: sha384 of JSON payload + CRC key
    const signPayload = JSON.stringify({
      sessionId,
      merchantId: Number(p24MerchantId),
      amount: pkg.priceGrosze,
      currency: 'PLN',
      crc: p24CrcKey,
    });

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-384', encoder.encode(signPayload));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sign = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const p24Payload = {
      merchantId: Number(p24MerchantId),
      posId: Number(p24PosId),
      sessionId,
      amount: pkg.priceGrosze,
      currency: 'PLN',
      description: `Żłote Lata — ${pkg.name} (${totalTokens} tokenów)`,
      email: 'brak@zlotelata.pl', // will be overridden by P24 from buyer's data
      country: 'PL',
      language: 'pl',
      urlReturn: `${baseUrl}/wallet?payment=success&session=${sessionId}`,
      urlStatus: `${baseUrl}/api/tokens/webhook`,
      sign,
      encoding: 'UTF-8',
    };

    const p24Credentials = Buffer.from(`${p24PosId}:${p24ApiKey}`).toString('base64');

    const registerResponse = await fetch(`${p24BaseUrl}/api/v1/transaction/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${p24Credentials}`,
      },
      body: JSON.stringify(p24Payload),
    });

    const registerData = (await registerResponse.json().catch(() => ({}))) as {
      data?: { token?: string };
      error?: string;
    };

    if (!registerResponse.ok || !registerData.data?.token) {
      console.error('P24 register error:', registerData);
      return NextResponse.json(
        { error: `Błąd bramki płatniczej: ${registerData.error || 'nieznany błąd'}` },
        { status: 502 },
      );
    }

    // Store pending checkout in token_transactions (amount=0, will be updated on webhook)
    await supabaseAdmin.from('token_transactions').insert({
      profile_id:    profileId,
      amount:        0,
      balance_after: 0,
      type:          'purchase_pending',
      description:   `Oczekuje płatność: ${pkg.name} (${totalTokens} tokenów, ${(pkg.priceGrosze / 100).toFixed(2)} PLN)`,
      reference_id:  sessionId,
    });

    const paymentUrl = `${p24BaseUrl}/trnRequest/${registerData.data.token}`;

    return NextResponse.json({ mode: 'p24', paymentUrl, sessionId });
  } catch (err) {
    console.error('Token checkout error:', err);
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CheckoutPlanCode = 'premium_monthly' | 'premium_quarterly';

const PLAN_CONFIG: Record<CheckoutPlanCode, { amountGross: number; periodDays: number }> = {
  premium_monthly: {
    amountGross: 3900,
    periodDays: 30,
  },
  premium_quarterly: {
    amountGross: 9900,
    periodDays: 90,
  },
};

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = String(body?.profileId || '').trim();
    const provider = String(body?.provider || 'manual').trim();
    const planCode = String(body?.planCode || '').trim() as CheckoutPlanCode;

    if (!profileId) {
      return NextResponse.json({ error: 'Brak profileId.' }, { status: 400 });
    }

    if (!(planCode in PLAN_CONFIG)) {
      return NextResponse.json({ error: 'Nieprawidlowy planCode.' }, { status: 400 });
    }

    const plan = PLAN_CONFIG[planCode];
    const checkoutId = crypto.randomUUID();
    const now = new Date();
    const periodEnd = new Date(now.getTime() + plan.periodDays * 24 * 60 * 60 * 1000);

    const supabaseAdmin = getSupabaseAdminClient();
    let subscriptionId: string | null = null;

    if (supabaseAdmin) {
      const { data: createdSub, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          profile_id: profileId,
          provider,
          plan_code: planCode,
          status: 'pending',
          amount_gross: plan.amountGross,
          currency: 'PLN',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          provider_subscription_id: checkoutId,
        })
        .select('id')
        .maybeSingle();

      if (subError) {
        console.error('Checkout subscription insert error:', subError);
      } else {
        subscriptionId = (createdSub?.id as string) || null;
      }

      await supabaseAdmin
        .from('subscription_events')
        .insert({
          subscription_id: subscriptionId,
          provider,
          event_type: 'checkout_created',
          event_id: checkoutId,
          payload: {
            profile_id: profileId,
            plan_code: planCode,
            amount_gross: plan.amountGross,
          },
        });
    }

    // Placeholder URL - podmień po integracji operatora płatności.
    const paymentUrl = `/premium?checkoutId=${checkoutId}&plan=${planCode}`;

    return NextResponse.json(
      {
        ok: true,
        checkoutId,
        paymentUrl,
        subscriptionId,
        amountGross: plan.amountGross,
        currency: 'PLN',
        provider,
        providerConfigured: Boolean(supabaseAdmin),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Checkout route error:', error);
    return NextResponse.json({ error: 'Nie udalo sie utworzyc checkoutu.' }, { status: 500 });
  }
}

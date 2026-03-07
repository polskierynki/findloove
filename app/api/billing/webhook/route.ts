import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

function mapWebhookStatus(eventType: string, explicitStatus?: string): string {
  if (explicitStatus) return explicitStatus;

  const type = eventType.toLowerCase();
  if (type.includes('cancel')) return 'canceled';
  if (type.includes('expire')) return 'expired';
  if (type.includes('fail') || type.includes('past_due')) return 'past_due';
  if (type.includes('trial')) return 'trial';
  return 'active';
}

function shouldEnablePremium(status: string, premiumUntil?: string | null): boolean {
  if (status !== 'active' && status !== 'trial') return false;
  if (!premiumUntil) return true;
  return new Date(premiumUntil).getTime() > Date.now();
}

export async function POST(req: Request) {
  try {
    const secret = process.env.BILLING_WEBHOOK_SECRET;
    const signature = req.headers.get('x-billing-signature');

    if (secret && signature !== secret) {
      return NextResponse.json({ error: 'Nieprawidlowy podpis webhooka.' }, { status: 401 });
    }

    const body = await req.json();
    const provider = String(body?.provider || 'manual').trim();
    const eventType = String(body?.type || '').trim();
    const eventId = String(body?.eventId || crypto.randomUUID()).trim();
    const profileId = String(body?.profileId || '').trim();
    const providerSubscriptionId = String(body?.providerSubscriptionId || '').trim();
    const planCode = String(body?.planCode || 'premium_monthly').trim();
    const explicitStatus = body?.status ? String(body.status).trim() : undefined;

    if (!profileId || !eventType) {
      return NextResponse.json({ error: 'Brak wymaganych danych: profileId i type.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Brak konfiguracji SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 },
      );
    }

    const status = mapWebhookStatus(eventType, explicitStatus);
    const nowIso = new Date().toISOString();
    const premiumUntil = body?.currentPeriodEnd
      ? String(body.currentPeriodEnd)
      : body?.premiumUntil
      ? String(body.premiumUntil)
      : null;

    let subscriptionId: string | null = null;

    if (providerSubscriptionId) {
      const { data: existing } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('provider_subscription_id', providerSubscriptionId)
        .maybeSingle();

      if (existing?.id) {
        subscriptionId = existing.id as string;
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status,
            plan_code: planCode,
            current_period_end: premiumUntil,
          })
          .eq('id', subscriptionId);
      }
    }

    if (!subscriptionId) {
      const { data: created } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          profile_id: profileId,
          provider,
          plan_code: planCode,
          status,
          amount_gross: Number(body?.amountGross || 0),
          currency: String(body?.currency || 'PLN'),
          current_period_start: String(body?.currentPeriodStart || nowIso),
          current_period_end: premiumUntil,
          provider_customer_id: body?.providerCustomerId || null,
          provider_subscription_id: providerSubscriptionId || `wh-${eventId}`,
        })
        .select('id')
        .maybeSingle();

      subscriptionId = (created?.id as string) || null;
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        is_premium: shouldEnablePremium(status, premiumUntil),
        premium_until: premiumUntil,
      })
      .eq('id', profileId);

    await supabaseAdmin
      .from('subscription_events')
      .insert({
        subscription_id: subscriptionId,
        provider,
        event_type: eventType,
        event_id: eventId,
        payload: body,
      });

    return NextResponse.json({ ok: true, subscriptionId, status }, { status: 200 });
  } catch (error) {
    console.error('Webhook route error:', error);
    return NextResponse.json({ error: 'Nie udalo sie obsluzyc webhooka.' }, { status: 500 });
  }
}

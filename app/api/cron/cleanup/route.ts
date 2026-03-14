import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function hasValidCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const directSecret = req.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}` || directSecret === cronSecret;
}

async function runCleanup(req: NextRequest) {
  // Sprawdz sekretny token - bez niego odrzuc request
  if (!hasValidCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY env var' },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabaseAdmin.rpc('process_due_account_deletions');

  if (error) {
    console.error('[cron/cleanup] RPC error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron/cleanup] Deleted ${data} accounts`);
  return NextResponse.json({ deleted: data });
}

export async function POST(req: NextRequest) {
  return runCleanup(req);
}

export async function GET(req: NextRequest) {
  return runCleanup(req);
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AuthUser = {
  id: string;
  email?: string | null;
};

type ProfileIdentityRow = {
  id: string;
  role?: string | null;
  email?: string | null;
  auth_user_id?: string | null;
};

export type ResolvedAuthProfile = {
  id: string;
  role: string | null;
  email: string | null;
};

function normalizeEmail(email?: string | null): string | null {
  const normalized = (email || '').trim().toLowerCase();
  return normalized ? normalized : null;
}

export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function verifyAuthUserFromBearer(
  supabase: SupabaseClient,
  authorizationHeader: string | null,
): Promise<{ user: AuthUser | null; error: string | null; status: number }> {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Unauthorized', status: 401 };
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) {
    return { user: null, error: 'Unauthorized', status: 401 };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: 'Unauthorized', status: 401 };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    error: null,
    status: 200,
  };
}

export async function resolveProfileForAuthUser(
  supabase: SupabaseClient,
  authUser: AuthUser,
): Promise<ResolvedAuthProfile | null> {
  const normalizedEmail = normalizeEmail(authUser.email);

  const { data: byId } = await supabase
    .from('profiles')
    .select('id, role, email, auth_user_id')
    .eq('id', authUser.id)
    .maybeSingle();

  const byIdRow = byId as ProfileIdentityRow | null;
  if (byIdRow?.id) {
    return {
      id: byIdRow.id,
      role: byIdRow.role || null,
      email: normalizeEmail(byIdRow.email),
    };
  }

  const { data: byAuthUserId } = await supabase
    .from('profiles')
    .select('id, role, email, auth_user_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  const byAuthRow = byAuthUserId as ProfileIdentityRow | null;
  if (byAuthRow?.id) {
    return {
      id: byAuthRow.id,
      role: byAuthRow.role || null,
      email: normalizeEmail(byAuthRow.email),
    };
  }

  if (normalizedEmail) {
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('id, role, email, auth_user_id')
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const byEmailRow = byEmail as ProfileIdentityRow | null;
    if (byEmailRow?.id) {
      return {
        id: byEmailRow.id,
        role: byEmailRow.role || null,
        email: normalizeEmail(byEmailRow.email),
      };
    }
  }

  return null;
}

export function isAdminRole(role: string | null | undefined): boolean {
  const normalized = (role || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'super_admin';
}

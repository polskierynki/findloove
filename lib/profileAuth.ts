import { supabase } from '@/lib/supabase';

export type AuthProfileUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type ProfileIdentityRow = {
  id: string;
  auth_user_id?: string | null;
  email?: string | null;
};

async function persistAuthUserMapping(profile: ProfileIdentityRow, authUserId: string) {
  if (profile.auth_user_id === authUserId) return;
  if (profile.auth_user_id && profile.auth_user_id !== authUserId) {
    console.warn('Profil jest juz przypiety do innego auth_user_id:', profile.id);
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ auth_user_id: authUserId })
    .eq('id', profile.id);

  if (error) {
    console.warn('Nie udalo sie utrwalic auth_user_id dla profilu:', profile.id, error.message);
  }
}

export async function resolveProfileIdForAuthUser(user: AuthProfileUser): Promise<string | null> {
  const normalizedEmail = user.email?.trim().toLowerCase() || null;

  const { data: byId, error: byIdError } = await supabase
    .from('profiles')
    .select('id, auth_user_id, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!byIdError && byId?.id) {
    await persistAuthUserMapping(byId as ProfileIdentityRow, user.id);
    return byId.id as string;
  }

  const { data: byAuthUserId, error: byAuthUserIdError } = await supabase
    .from('profiles')
    .select('id, auth_user_id, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!byAuthUserIdError && byAuthUserId?.id) {
    return byAuthUserId.id as string;
  }

  if (normalizedEmail) {
    const { data: byEmail, error: byEmailError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!byEmailError && byEmail?.id) {
      await persistAuthUserMapping(byEmail as ProfileIdentityRow, user.id);
      return byEmail.id as string;
    }
  }

  const fallbackName =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
    'Uzytkownik';

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        auth_user_id: user.id,
        email: normalizedEmail,
        name: fallbackName,
        age: 30,
        city: 'Nieznane',
        bio: '',
        interests: [],
        image_url: '',
      },
      { onConflict: 'id' },
    )
    .select('id')
    .maybeSingle();

  if (createError) {
    console.error('Nie udalo sie utworzyc/finalizowac profilu auth->profile:', createError.message);
    return null;
  }

  return (created?.id as string | undefined) || user.id;
}
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract token from Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Only admins can issue strikes' },
        { status: 403 }
      );
    }

    const { userProfileId, reason, commentId } = await request.json();

    if (!userProfileId || !reason) {
      return NextResponse.json(
        { error: 'User ID and reason are required' },
        { status: 400 }
      );
    }

    // Add strike
    const { error: strikeError } = await supabase
      .from('user_strikes')
      .insert({
        user_profile_id: userProfileId,
        reason,
        comment_id: commentId || null,
        admin_profile_id: user.id
      });

    if (strikeError) {
      return NextResponse.json(
        { error: strikeError.message },
        { status: 400 }
      );
    }

    // Get strike count
    const { data: strikes } = await supabase
      .from('user_strikes')
      .select('id')
      .eq('user_profile_id', userProfileId);

    const strikeCount = strikes?.length || 0;
    const isBanned = strikeCount >= 3;

    return NextResponse.json({
      success: true,
      strikeCount,
      isBanned,
      message: isBanned 
        ? 'User has been banned (3 strikes)' 
        : `Strike ${strikeCount}/3 issued`
    });
  } catch (error) {
    console.error('Error issuing strike:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

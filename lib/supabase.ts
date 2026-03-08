import { createClient, processLock } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
	throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseKey) {
	throw new Error(
		'Missing env: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)',
	);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		lock: processLock,
	},
});

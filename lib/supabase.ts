import { createClient } from '@supabase/supabase-js';

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

// Avoid browser lock contention warnings in React Strict Mode and rapid re-renders.
const relaxedAuthLock = async <R>(
	_lockName: string,
	_acquireTimeout: number,
	fn: () => Promise<R>,
): Promise<R> => await fn();

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		lock: relaxedAuthLock,
	},
});

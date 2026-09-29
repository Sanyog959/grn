import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseServerClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url =
    customUrl ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Use service role key if available for administrative bypass of RLS on backend,
  // otherwise fallback to anon key
  const key =
    customKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key || !url.startsWith('http')) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Extract Supabase configuration from incoming Next.js Request headers or environment variables
 */
export function getSupabaseFromRequest(request?: Request): SupabaseClient | null {
  let customUrl: string | undefined;
  let customKey: string | undefined;

  if (request) {
    const urlHeader = request.headers.get('x-supabase-url');
    const keyHeader = request.headers.get('x-supabase-key');
    if (urlHeader && keyHeader) {
      customUrl = urlHeader;
      customKey = keyHeader;
    }
  }

  return getSupabaseServerClient(customUrl, customKey);
}

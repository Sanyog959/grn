import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cache client instance to prevent multiple client creations
let browserClient: SupabaseClient | null = null;
let lastUsedConfig: { url: string; key: string } | null = null;

export function getSupabaseBrowserClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  // Check custom override, otherwise environment variables, otherwise local storage if in browser
  let url = customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = customKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof window !== 'undefined' && (!url || !key)) {
    try {
      const storedUrl = localStorage.getItem('aura_supabase_url');
      const storedKey = localStorage.getItem('aura_supabase_anon_key');
      if (storedUrl && storedKey) {
        url = url || storedUrl;
        key = key || storedKey;
      }
    } catch {
      // Ignore localStorage access errors
    }
  }

  if (!url || !key || !url.startsWith('http')) {
    return null;
  }

  // Return cached client if config matches
  if (
    browserClient &&
    lastUsedConfig &&
    lastUsedConfig.url === url &&
    lastUsedConfig.key === key
  ) {
    return browserClient;
  }

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  lastUsedConfig = { url, key };
  return browserClient;
}

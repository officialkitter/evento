import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()
  || '';
const hasPlaceholderUrl = url.includes('YOUR-PROJECT');
let hasInvalidUrl = false;

if (url && !hasPlaceholderUrl) {
  try {
    const parsedUrl = new URL(url);
    hasInvalidUrl = !['https:', 'http:'].includes(parsedUrl.protocol) || !parsedUrl.hostname;
  } catch {
    hasInvalidUrl = true;
  }
}

export const supabaseConfigurationError = !url || hasPlaceholderUrl || !publishableKey || hasInvalidUrl
  ? 'Add a valid Supabase project URL and publishable key to apps/mobile/.env, then restart Expo.'
  : null;

let client: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }

  if (!client) {
    client = createClient(url, publishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }

  return client;
}

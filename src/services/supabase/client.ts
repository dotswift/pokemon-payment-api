import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../../config/supabase';
import { logger } from '../../utils/logger';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseConfig.isEnabled) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    logger.info('Supabase client initialized');
  }

  return supabaseClient;
}

export function isSupabaseEnabled(): boolean {
  return supabaseConfig.isEnabled;
}

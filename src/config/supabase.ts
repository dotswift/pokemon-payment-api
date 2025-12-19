import { config } from './index';

export const supabaseConfig = {
  url: config.supabase.url,
  serviceRoleKey: config.supabase.serviceRoleKey,
  isEnabled: Boolean(config.supabase.url && config.supabase.serviceRoleKey),
};

import { getSupabaseClient, isSupabaseEnabled } from './client';
import { logger } from '../../utils/logger';

export interface TransfiUser {
  id?: string;
  transfi_user_id?: string;
  user_type: 'individual' | 'business';
  email: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  country: string;
  phone?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export class UsersRepository {
  private tableName = 'transfi_users';

  async create(user: TransfiUser): Promise<TransfiUser | null> {
    if (!isSupabaseEnabled()) {
      logger.debug('Supabase not enabled, skipping user persistence');
      return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .insert(user)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create user in Supabase', { error });
      return null;
    }

    return data;
  }

  async findByEmail(email: string): Promise<TransfiUser | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found is not an error
        logger.error('Failed to find user', { error });
      }
      return null;
    }

    return data;
  }

  async findByTransfiId(transfiUserId: string): Promise<TransfiUser | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('transfi_user_id', transfiUserId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error('Failed to find user by TransFi ID', { error });
      }
      return null;
    }

    return data;
  }

  async updateStatus(email: string, status: string): Promise<TransfiUser | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update user status', { error });
      return null;
    }

    return data;
  }
}

export const usersRepository = new UsersRepository();

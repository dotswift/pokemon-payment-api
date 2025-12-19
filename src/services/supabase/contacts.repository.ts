import { getSupabaseClient, isSupabaseEnabled } from './client';
import { logger } from '../../utils/logger';

export interface TransfiContact {
  id?: string;
  transfi_recipient_id?: string;
  user_id?: string;
  contact_type: 'individual' | 'business';
  email: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  country: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export class ContactsRepository {
  private tableName = 'transfi_payout_contacts';

  async create(contact: TransfiContact): Promise<TransfiContact | null> {
    if (!isSupabaseEnabled()) {
      logger.debug('Supabase not enabled, skipping contact persistence');
      return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .insert(contact)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create contact in Supabase', { error });
      return null;
    }

    return data;
  }

  async findByEmail(email: string): Promise<TransfiContact | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error('Failed to find contact', { error });
      }
      return null;
    }

    return data;
  }

  async softDelete(email: string): Promise<boolean> {
    if (!isSupabaseEnabled()) return false;

    const client = getSupabaseClient();
    if (!client) return false;

    const { error } = await client
      .from(this.tableName)
      .update({ is_active: false })
      .eq('email', email);

    if (error) {
      logger.error('Failed to soft delete contact', { error });
      return false;
    }

    return true;
  }

  async listByUserId(userId: string, limit = 50): Promise<TransfiContact[]> {
    if (!isSupabaseEnabled()) return [];

    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to list contacts', { error });
      return [];
    }

    return data || [];
  }
}

export const contactsRepository = new ContactsRepository();

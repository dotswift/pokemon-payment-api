import { getSupabaseClient, isSupabaseEnabled } from './client';
import { logger } from '../../utils/logger';

export interface TransfiKycRecord {
  id?: string;
  user_id: string;
  kyc_level?: 'standard' | 'advanced';
  status?: string;
  redirect_url?: string;
  reject_labels?: string[];
  submitted_at?: string;
  reviewed_at?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export class KycRepository {
  private tableName = 'transfi_kyc_records';

  async create(record: TransfiKycRecord): Promise<TransfiKycRecord | null> {
    if (!isSupabaseEnabled()) {
      logger.debug('Supabase not enabled, skipping KYC persistence');
      return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .insert(record)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create KYC record in Supabase', { error });
      return null;
    }

    return data;
  }

  async findByUserId(userId: string): Promise<TransfiKycRecord | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error('Failed to find KYC record', { error });
      }
      return null;
    }

    return data;
  }

  async updateStatus(
    userId: string,
    status: string,
    metadata?: { rejectLabels?: string[]; reviewedAt?: string }
  ): Promise<TransfiKycRecord | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (metadata?.rejectLabels) {
      updates.reject_labels = metadata.rejectLabels;
    }

    if (metadata?.reviewedAt) {
      updates.reviewed_at = metadata.reviewedAt;
    }

    const { data, error } = await client
      .from(this.tableName)
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update KYC status', { error });
      return null;
    }

    return data;
  }
}

export const kycRepository = new KycRepository();

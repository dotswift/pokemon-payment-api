import { getSupabaseClient, isSupabaseEnabled } from './client';
import { logger } from '../../utils/logger';

export interface TransfiOrder {
  id?: string;
  transfi_order_id: string;
  user_id?: string;
  order_type: 'payin' | 'payout' | 'crypto_payin' | 'crypto_payout';
  status?: string;
  deposit_amount?: number;
  deposit_currency?: string;
  withdraw_amount?: number;
  withdraw_currency?: string;
  payment_code?: string;
  payment_url?: string;
  wallet_address?: string;
  total_fee?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export class OrdersRepository {
  private tableName = 'transfi_orders';

  async create(order: TransfiOrder): Promise<TransfiOrder | null> {
    if (!isSupabaseEnabled()) {
      logger.debug('Supabase not enabled, skipping order persistence');
      return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .insert(order)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create order in Supabase', { error });
      return null;
    }

    return data;
  }

  async findByTransfiOrderId(transfiOrderId: string): Promise<TransfiOrder | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('transfi_order_id', transfiOrderId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error('Failed to find order', { error });
      }
      return null;
    }

    return data;
  }

  async updateStatus(transfiOrderId: string, status: string, metadata?: Record<string, unknown>): Promise<TransfiOrder | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (metadata) {
      updates.metadata = metadata;
    }

    const { data, error } = await client
      .from(this.tableName)
      .update(updates)
      .eq('transfi_order_id', transfiOrderId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update order status', { error });
      return null;
    }

    return data;
  }

  async listByUserId(userId: string, limit = 50): Promise<TransfiOrder[]> {
    if (!isSupabaseEnabled()) return [];

    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to list orders', { error });
      return [];
    }

    return data || [];
  }
}

export const ordersRepository = new OrdersRepository();

import { getSupabaseClient, isSupabaseEnabled } from './client';
import { logger } from '../../utils/logger';

export interface TransfiWebhookEvent {
  id?: string;
  event_type: string;
  payload: Record<string, unknown>;
  order_id?: string;
  status?: 'received' | 'processed' | 'failed';
  error_message?: string;
  received_at?: string;
}

export class WebhookEventsRepository {
  private tableName = 'transfi_webhook_events';

  async create(event: TransfiWebhookEvent): Promise<TransfiWebhookEvent | null> {
    if (!isSupabaseEnabled()) {
      logger.debug('Supabase not enabled, skipping webhook event persistence');
      return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from(this.tableName)
      .insert({
        ...event,
        received_at: event.received_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create webhook event in Supabase', { error });
      return null;
    }

    return data;
  }

  async updateStatus(
    eventId: string,
    status: 'processed' | 'failed',
    errorMessage?: string
  ): Promise<TransfiWebhookEvent | null> {
    if (!isSupabaseEnabled()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    const updates: Record<string, unknown> = { status };
    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { data, error } = await client
      .from(this.tableName)
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update webhook event status', { error });
      return null;
    }

    return data;
  }

  async findRecentByOrderId(orderId: string, limit = 10): Promise<TransfiWebhookEvent[]> {
    if (!isSupabaseEnabled()) return [];

    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('order_id', orderId)
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to find webhook events', { error });
      return [];
    }

    return data || [];
  }
}

export const webhookEventsRepository = new WebhookEventsRepository();

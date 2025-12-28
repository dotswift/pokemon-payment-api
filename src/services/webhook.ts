import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ordersRepository, kycRepository, webhookEventsRepository, usersRepository } from './supabase';

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

export class WebhookService {
  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!config.security.webhookSecret) {
      logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    if (!signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.security.webhookSecret)
      .update(payload)
      .digest('hex');

    // Ensure same length for timing-safe comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Process incoming webhook event
   */
  async processEvent(payload: WebhookPayload): Promise<void> {
    const { event, data } = payload;

    logger.info('Processing webhook event', { event, orderId: data.orderId });

    // Log event to Supabase
    const webhookEvent = await webhookEventsRepository.create({
      event_type: event,
      payload: data,
      status: 'received',
    });

    try {
      switch (event) {
        case 'order.completed':
        case 'order.success':
          await this.handleOrderSuccess(data);
          break;

        case 'order.failed':
        case 'order.rejected':
          await this.handleOrderFailed(data);
          break;

        case 'order.pending':
        case 'order.processing':
          await this.handleOrderPending(data);
          break;

        case 'kyc.approved':
        case 'kyc.completed':
          await this.handleKycApproved(data);
          break;

        case 'kyc.rejected':
        case 'kyc.failed':
          await this.handleKycRejected(data);
          break;

        case 'kyc.pending':
        case 'kyc.in_review':
          await this.handleKycPending(data);
          break;

        default:
          logger.info('Unhandled webhook event type', { event });
      }

      // Update webhook event status to processed
      if (webhookEvent?.id) {
        await webhookEventsRepository.updateStatus(webhookEvent.id, 'processed');
      }
    } catch (error) {
      logger.error('Failed to process webhook event', { event, error });

      // Update webhook event status to failed
      if (webhookEvent?.id) {
        await webhookEventsRepository.updateStatus(
          webhookEvent.id,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      throw error;
    }
  }

  private async handleOrderSuccess(data: Record<string, unknown>): Promise<void> {
    const orderId = data.orderId as string;
    if (orderId) {
      await ordersRepository.updateStatus(orderId, 'completed', data);
      logger.info('Order marked as completed', { orderId });
    }
  }

  private async handleOrderFailed(data: Record<string, unknown>): Promise<void> {
    const orderId = data.orderId as string;
    if (orderId) {
      await ordersRepository.updateStatus(orderId, 'failed', data);
      logger.info('Order marked as failed', { orderId });
    }
  }

  private async handleOrderPending(data: Record<string, unknown>): Promise<void> {
    const orderId = data.orderId as string;
    if (orderId) {
      await ordersRepository.updateStatus(orderId, 'processing', data);
      logger.info('Order marked as processing', { orderId });
    }
  }

  private async handleKycApproved(data: Record<string, unknown>): Promise<void> {
    const email = data.email as string;
    if (email) {
      const user = await usersRepository.findByEmail(email);
      if (user?.id) {
        await kycRepository.updateStatus(user.id, 'approved', {
          reviewedAt: new Date().toISOString(),
        });
        await usersRepository.updateStatus(email, 'verified');
        logger.info('KYC approved', { email });
      }
    }
  }

  private async handleKycRejected(data: Record<string, unknown>): Promise<void> {
    const email = data.email as string;
    if (email) {
      const user = await usersRepository.findByEmail(email);
      if (user?.id) {
        await kycRepository.updateStatus(user.id, 'rejected', {
          rejectLabels: data.rejectLabels as string[] | undefined,
          reviewedAt: new Date().toISOString(),
        });
        logger.info('KYC rejected', { email });
      }
    }
  }

  private async handleKycPending(data: Record<string, unknown>): Promise<void> {
    const email = data.email as string;
    if (email) {
      const user = await usersRepository.findByEmail(email);
      if (user?.id) {
        await kycRepository.updateStatus(user.id, 'pending');
        logger.info('KYC pending review', { email });
      }
    }
  }
}

export const webhookService = new WebhookService();

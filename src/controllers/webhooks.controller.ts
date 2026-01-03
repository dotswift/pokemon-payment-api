import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ship24Service } from '../services/ship24.service';
import { getSupabaseClient } from '../services/supabase';

export class WebhooksController {
  async handleTransfiWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-transfi-signature'] as string || '';
      const rawBody = JSON.stringify(req.body);

      // Verify signature
      if (!webhookService.verifySignature(rawBody, signature)) {
        logger.warn('Invalid webhook signature received');
        throw new UnauthorizedError('Invalid webhook signature');
      }

      // Validate payload structure
      const { event, data } = req.body;
      if (!event || !data) {
        throw new BadRequestError('Invalid webhook payload: missing event or data');
      }

      // Process event asynchronously (respond quickly to TransFi)
      webhookService.processEvent({ event, data }).catch((error) => {
        logger.error('Async webhook processing failed', { event, error });
      });

      // Acknowledge receipt immediately
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Ship24 tracking webhook
   * Called when package status changes (shipped, in_transit, delivered, etc.)
   */
  async handleShip24Webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body;

      logger.info('Ship24 webhook received', { payload });

      // Parse the webhook payload
      const trackingUpdate = ship24Service.parseWebhook(payload);
      if (!trackingUpdate) {
        logger.warn('Invalid Ship24 webhook payload');
        res.status(200).json({ received: true, processed: false });
        return;
      }

      const { trackingNumber, trackerId, statusMilestone, isDelivered, deliveredAt } = trackingUpdate;

      logger.info('Processing Ship24 tracking update', {
        trackingNumber,
        trackerId,
        statusMilestone,
        isDelivered,
      });

      const supabase = getSupabaseClient();
      if (!supabase) {
        logger.error('Supabase not configured for Ship24 webhook');
        res.status(500).json({ error: 'Database not configured' });
        return;
      }

      // Find settlement by tracking number or Ship24 tracker ID
      const { data: settlement, error: fetchError } = await supabase
        .from('settlements')
        .select('id, delivered_at, delivery_confirmed_at')
        .or(`tracking_number.eq.${trackingNumber},ship24_tracker_id.eq.${trackerId}`)
        .single();

      if (fetchError || !settlement) {
        logger.warn('Settlement not found for tracking update', { trackingNumber, trackerId });
        res.status(200).json({ received: true, processed: false });
        return;
      }

      // If already delivered or confirmed, skip
      if (settlement.delivered_at || settlement.delivery_confirmed_at) {
        logger.info('Settlement already delivered/confirmed, skipping', { settlementId: settlement.id });
        res.status(200).json({ received: true, processed: false, reason: 'already_delivered' });
        return;
      }

      // If delivered, update the settlement
      if (isDelivered && deliveredAt) {
        // Calculate auto-release date (3 days after delivery)
        const autoReleaseDate = new Date(deliveredAt);
        autoReleaseDate.setDate(autoReleaseDate.getDate() + 3);

        const { error: updateError } = await supabase
          .from('settlements')
          .update({
            delivered_at: deliveredAt,
            auto_release_at: autoReleaseDate.toISOString(),
          })
          .eq('id', settlement.id);

        if (updateError) {
          logger.error('Failed to update settlement delivery status', {
            error: updateError,
            settlementId: settlement.id,
          });
        } else {
          logger.info('Settlement marked as delivered', {
            settlementId: settlement.id,
            deliveredAt,
            autoReleaseAt: autoReleaseDate.toISOString(),
          });
        }
      }

      res.status(200).json({ received: true, processed: true });
    } catch (error) {
      logger.error('Ship24 webhook error', { error });
      // Always return 200 to acknowledge receipt even on error
      res.status(200).json({ received: true, error: 'Processing error' });
    }
  }
}

export const webhooksController = new WebhooksController();

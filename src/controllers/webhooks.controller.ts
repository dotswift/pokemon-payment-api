import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

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
}

export const webhooksController = new WebhooksController();

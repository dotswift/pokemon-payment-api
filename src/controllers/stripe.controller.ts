import { Request, Response, NextFunction } from 'express';
import { stripeService, settlementService } from '../services/stripe';
import { stripeConfig } from '../config/stripe';
import { AuthenticatedRequest } from '../middleware/supabaseAuth';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

export class StripeController {
  /**
   * Create a SetupIntent for saving a payment method
   * POST /api/v1/stripe/setup-intent
   */
  async createSetupIntent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: userId, email } = req.user;

      const result = await stripeService.createSetupIntent(userId, email);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save a payment method after successful SetupIntent
   * POST /api/v1/stripe/payment-methods
   */
  async savePaymentMethod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: userId } = req.user;
      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        throw new BadRequestError('paymentMethodId is required');
      }

      const result = await stripeService.savePaymentMethod(userId, paymentMethodId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List user's payment methods
   * GET /api/v1/stripe/payment-methods
   */
  async listPaymentMethods(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: userId } = req.user;

      const result = await stripeService.listPaymentMethods(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a payment method
   * DELETE /api/v1/stripe/payment-methods/:id
   */
  async deletePaymentMethod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: userId } = req.user;
      const paymentMethodId = req.params.id;

      if (!paymentMethodId) {
        throw new BadRequestError('Payment method ID is required');
      }

      await stripeService.deletePaymentMethod(userId, paymentMethodId);

      res.status(200).json({
        success: true,
        message: 'Payment method deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set a payment method as default
   * PUT /api/v1/stripe/payment-methods/:id/default
   */
  async setDefaultPaymentMethod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: userId } = req.user;
      const paymentMethodId = req.params.id;

      if (!paymentMethodId) {
        throw new BadRequestError('Payment method ID is required');
      }

      await stripeService.setDefaultPaymentMethod(userId, paymentMethodId);

      res.status(200).json({
        success: true,
        message: 'Default payment method updated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Stripe webhook
   * POST /webhooks/stripe
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        throw new UnauthorizedError('Missing Stripe signature');
      }

      if (!stripeConfig.webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      // Use raw body for signature verification (set by middleware in app.ts)
      const rawBody = req.rawBody || req.body;

      let event;
      try {
        event = stripeService.verifyWebhookSignature(
          rawBody,
          signature,
          stripeConfig.webhookSecret
        );
      } catch (err) {
        logger.error('Stripe webhook signature verification failed', { error: err });
        throw new UnauthorizedError('Invalid Stripe signature');
      }

      // Process event asynchronously
      stripeService.handleWebhookEvent(event).catch((error) => {
        logger.error('Async Stripe webhook processing failed', { eventType: event.type, error });
      });

      // Acknowledge receipt immediately
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run auction settlement job
   * POST /api/v1/stripe/settle-auctions
   * This endpoint is meant to be called by a cron job or admin
   */
  async settleAuctions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settlementService.settleAuctions();

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const stripeController = new StripeController();

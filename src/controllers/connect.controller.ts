import { Response, NextFunction } from 'express';
import { connectService } from '../services/stripe/connect.service';
import { AuthenticatedRequest } from '../middleware/supabaseAuth';
import { logger } from '../utils/logger';

class ConnectController {
  /**
   * POST /api/v1/connect/account
   * Create a Stripe Express Connect account for the authenticated user
   */
  async createAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const email = req.user!.email!;

      const account = await connectService.createExpressAccount(userId, email);

      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error) {
      logger.error('Error creating Connect account', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/connect/account
   * Get the authenticated user's Connect account status
   */
  async getAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const account = await connectService.getAccountStatus(userId);

      if (!account) {
        res.status(404).json({
          success: false,
          error: 'No Connect account found. Create one to become a seller.',
        });
        return;
      }

      res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      logger.error('Error getting Connect account', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/connect/onboarding-link
   * Create an onboarding link for the seller to complete verification
   */
  async createOnboardingLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { returnUrl } = req.body;

      // Use provided returnUrl or default to origin header
      const frontendUrl = returnUrl || req.headers.origin || 'http://localhost:5173';

      const link = await connectService.createOnboardingLink(userId, frontendUrl);

      res.json({
        success: true,
        data: link,
      });
    } catch (error) {
      logger.error('Error creating onboarding link', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/connect/dashboard-link
   * Get a link to the Stripe Express dashboard for the seller
   */
  async getDashboardLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const url = await connectService.createDashboardLink(userId);

      res.json({
        success: true,
        data: { url },
      });
    } catch (error) {
      logger.error('Error creating dashboard link', { error });
      next(error);
    }
  }
}

export const connectController = new ConnectController();

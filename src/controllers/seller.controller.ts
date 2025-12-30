import { Response, NextFunction } from 'express';
import { payoutService } from '../services/stripe/payout.service';
import { AuthenticatedRequest } from '../middleware/supabaseAuth';
import { logger } from '../utils/logger';

class SellerController {
  /**
   * GET /api/v1/seller/earnings
   * Get the seller's earnings summary
   */
  async getEarnings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const earnings = await payoutService.getSellerEarnings(userId);

      res.json({
        success: true,
        data: earnings,
      });
    } catch (error) {
      logger.error('Error getting seller earnings', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/seller/payouts
   * Get the seller's payout history
   */
  async getPayouts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const payouts = await payoutService.getSellerPayouts(userId);

      res.json({
        success: true,
        data: payouts,
      });
    } catch (error) {
      logger.error('Error getting seller payouts', { error });
      next(error);
    }
  }
}

export const sellerController = new SellerController();

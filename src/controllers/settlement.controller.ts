import { Response, NextFunction } from 'express';
import { payoutService } from '../services/stripe/payout.service';
import { AuthenticatedRequest } from '../middleware/supabaseAuth';
import { logger } from '../utils/logger';

class SettlementController {
  /**
   * POST /api/v1/settlements/:id/confirm-delivery
   * Buyer confirms delivery and triggers payout to seller
   */
  async confirmDelivery(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id: settlementId } = req.params;

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: 'Settlement ID is required',
        });
        return;
      }

      const payout = await payoutService.releaseEscrowToSeller(settlementId, userId);

      res.json({
        success: true,
        data: {
          message: 'Delivery confirmed and payment released to seller',
          payout,
        },
      });
    } catch (error) {
      logger.error('Error confirming delivery', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/purchases
   * Get buyer's won auctions/purchases
   */
  async getPurchases(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const purchases = await payoutService.getBuyerPurchases(userId);

      res.json({
        success: true,
        data: purchases,
      });
    } catch (error) {
      logger.error('Error getting purchases', { error });
      next(error);
    }
  }
}

export const settlementController = new SettlementController();

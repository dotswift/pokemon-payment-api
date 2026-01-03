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

  /**
   * GET /api/v1/seller/sales
   * Get the seller's sold items with buyer info
   */
  async getSales(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const sales = await payoutService.getSellerSales(userId);

      res.json({
        success: true,
        data: sales,
      });
    } catch (error) {
      logger.error('Error getting seller sales', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/seller/sales/:settlementId/tracking
   * Add tracking number to a sale
   */
  async addTracking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { settlementId } = req.params;
      const { trackingNumber, carrier } = req.body;

      if (!settlementId) {
        res.status(400).json({
          success: false,
          error: 'settlementId is required',
        });
        return;
      }

      if (!trackingNumber || !carrier) {
        res.status(400).json({
          success: false,
          error: 'trackingNumber and carrier are required',
        });
        return;
      }

      // Validate carrier
      const validCarriers = ['usps', 'fedex', 'ups', 'dhl'];
      if (!validCarriers.includes(carrier.toLowerCase())) {
        res.status(400).json({
          success: false,
          error: `Invalid carrier. Must be one of: ${validCarriers.join(', ')}`,
        });
        return;
      }

      await payoutService.addTracking(userId, settlementId, trackingNumber, carrier);

      res.json({
        success: true,
        message: 'Tracking added successfully',
      });
    } catch (error) {
      logger.error('Error adding tracking', { error });
      next(error);
    }
  }
}

export const sellerController = new SellerController();

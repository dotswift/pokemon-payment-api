import { Response, NextFunction } from 'express';
import { payoutService } from '../services/stripe/payout.service';
import { ship24Service } from '../services/ship24.service';
import { getSupabaseClient } from '../services/supabase';
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

  /**
   * GET /api/v1/settlements/:id/tracking
   * Get live tracking details for a settlement
   */
  async getTrackingDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

      const supabase = getSupabaseClient();
      if (!supabase) {
        res.status(500).json({
          success: false,
          error: 'Database not configured',
        });
        return;
      }

      // Get settlement and verify buyer owns it
      const { data: settlement, error: settlementError } = await supabase
        .from('settlements')
        .select('id, winner_id, tracking_number, tracking_carrier, ship24_tracker_id')
        .eq('id', settlementId)
        .single();

      if (settlementError || !settlement) {
        res.status(404).json({
          success: false,
          error: 'Settlement not found',
        });
        return;
      }

      // Verify buyer owns this settlement
      if (settlement.winner_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Not authorized to view this tracking info',
        });
        return;
      }

      // Check if tracking number exists
      if (!settlement.tracking_number) {
        res.status(404).json({
          success: false,
          error: 'No tracking number for this order',
        });
        return;
      }

      // Check if Ship24 is configured
      if (!ship24Service.isConfigured()) {
        res.json({
          success: true,
          data: {
            trackingNumber: settlement.tracking_number,
            carrier: settlement.tracking_carrier,
            events: [],
            status: 'unknown',
            statusMilestone: 'unknown',
            message: 'Live tracking not available',
          },
        });
        return;
      }

      // Get tracking info from Ship24
      const trackingInfo = await ship24Service.trackPackage(
        settlement.tracking_number,
        settlement.ship24_tracker_id || undefined
      );

      if (!trackingInfo) {
        res.json({
          success: true,
          data: {
            trackingNumber: settlement.tracking_number,
            carrier: settlement.tracking_carrier,
            events: [],
            status: 'pending',
            statusMilestone: 'pending',
            message: 'Tracking info not yet available',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          trackingNumber: settlement.tracking_number,
          carrier: settlement.tracking_carrier,
          status: trackingInfo.status,
          statusMilestone: trackingInfo.statusMilestone,
          isDelivered: trackingInfo.isDelivered,
          deliveredAt: trackingInfo.deliveredAt,
          lastUpdate: trackingInfo.lastUpdate,
          events: trackingInfo.events,
        },
      });
    } catch (error) {
      logger.error('Error getting tracking details', { error });
      next(error);
    }
  }
}

export const settlementController = new SettlementController();

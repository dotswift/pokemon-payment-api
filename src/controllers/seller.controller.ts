import { Response, NextFunction } from 'express';
import { payoutService } from '../services/stripe/payout.service';
import { AuthenticatedRequest } from '../middleware/supabaseAuth';
import { logger } from '../utils/logger';
import { getSupabaseClient } from '../services/supabase';

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

  /**
   * GET /api/v1/seller/listings/:listingId
   * Get listing details including bids and sale info (if sold)
   */
  async getListingDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { listingId } = req.params;

      if (!listingId) {
        res.status(400).json({
          success: false,
          error: 'listingId is required',
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

      // Get listing with card info
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select(`
          id,
          status,
          starting_price,
          current_bid,
          buy_now_price,
          bid_count,
          ends_at,
          created_at,
          user_id,
          pokemon_cards(name, set_name, image_small, image_large)
        `)
        .eq('id', listingId)
        .single();

      if (listingError || !listing) {
        res.status(404).json({
          success: false,
          error: 'Listing not found',
        });
        return;
      }

      // Verify seller owns this listing
      if (listing.user_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Not authorized to view this listing',
        });
        return;
      }

      // Get bid history
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select(`
          id,
          amount,
          created_at,
          user_id,
          profiles(display_name, username)
        `)
        .eq('listing_id', listingId)
        .order('amount', { ascending: false });

      if (bidsError) {
        logger.error('Error fetching bids', { error: bidsError });
      }

      // Get sale info if sold
      let sale = null;
      if (listing.status === 'sold') {
        const { data: settlement, error: settlementError } = await supabase
          .from('settlements')
          .select(`
            id,
            final_amount,
            status,
            charged_at,
            delivery_confirmed_at,
            shipping_address,
            tracking_number,
            tracking_carrier,
            shipped_at,
            delivered_at,
            winner_id
          `)
          .eq('listing_id', listingId)
          .single();

        if (!settlementError && settlement) {
          // Get buyer info
          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', settlement.winner_id)
            .single();

          sale = {
            settlementId: settlement.id,
            amount: settlement.final_amount,
            status: settlement.status,
            chargedAt: settlement.charged_at,
            deliveryConfirmedAt: settlement.delivery_confirmed_at,
            shippingAddress: settlement.shipping_address,
            trackingNumber: settlement.tracking_number,
            trackingCarrier: settlement.tracking_carrier,
            shippedAt: settlement.shipped_at,
            deliveredAt: settlement.delivered_at,
            buyerDisplayName: buyerProfile?.display_name || 'Unknown',
            buyerUsername: buyerProfile?.username || '',
          };
        }
      }

      const card = listing.pokemon_cards as unknown as { name: string; set_name: string; image_small: string; image_large: string } | null;

      res.json({
        success: true,
        data: {
          listing: {
            id: listing.id,
            status: listing.status,
            startingPrice: listing.starting_price,
            currentBid: listing.current_bid,
            buyNowPrice: listing.buy_now_price,
            bidCount: listing.bid_count,
            endsAt: listing.ends_at,
            createdAt: listing.created_at,
            cardName: card?.name || 'Unknown',
            cardSet: card?.set_name || 'Unknown',
            imageUrl: card?.image_small || card?.image_large || '',
          },
          bids: (bids || []).map((b: any) => ({
            id: b.id,
            amount: b.amount,
            createdAt: b.created_at,
            bidderDisplayName: b.profiles?.display_name || 'Anonymous',
            bidderUsername: b.profiles?.username || '',
          })),
          sale,
        },
      });
    } catch (error) {
      logger.error('Error getting listing details', { error });
      next(error);
    }
  }
}

export const sellerController = new SellerController();

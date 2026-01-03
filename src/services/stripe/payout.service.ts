import Stripe from 'stripe';
import { getStripeClient } from './client';
import { getSupabaseClient } from '../supabase';
import { logger } from '../../utils/logger';
import { ship24Service } from '../ship24.service';

// Platform fee percentage (4%)
const PLATFORM_FEE_PERCENT = 4;

export interface FeeCalculation {
  grossAmount: number;
  platformFee: number;
  netAmount: number;
}

export interface SellerPayout {
  id: string;
  settlementId: string;
  sellerId: string;
  stripeTransferId: string | null;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: 'pending' | 'transferred' | 'failed';
  transferredAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface EarningsSummary {
  pendingEarnings: number;
  availableEarnings: number;
  totalTransferred: number;
  pendingPayouts: number;
}

class PayoutService {
  /**
   * Calculate platform fees
   */
  calculateFees(grossAmount: number): FeeCalculation {
    const platformFee = Math.round(grossAmount * PLATFORM_FEE_PERCENT / 100);
    const netAmount = grossAmount - platformFee;
    return { grossAmount, platformFee, netAmount };
  }

  /**
   * Release escrow and transfer funds to seller after delivery confirmed
   */
  async releaseEscrowToSeller(settlementId: string, confirmingUserId: string): Promise<SellerPayout> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Get settlement details
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .select(`
        id,
        listing_id,
        winner_id,
        final_amount,
        stripe_payment_intent_id,
        status,
        delivery_confirmed_at
      `)
      .eq('id', settlementId)
      .single();

    if (settlementError || !settlement) {
      throw new Error('Settlement not found');
    }

    // Verify the confirming user is the buyer
    if (settlement.winner_id !== confirmingUserId) {
      throw new Error('Only the buyer can confirm delivery');
    }

    // Check settlement is charged (payment successful)
    if (settlement.status !== 'charged') {
      throw new Error('Settlement is not in charged status');
    }

    // Check if already confirmed
    if (settlement.delivery_confirmed_at) {
      throw new Error('Delivery already confirmed');
    }

    // Get listing to find seller
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', settlement.listing_id)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    const sellerId = listing.user_id;

    // Get seller's Connect account
    const { data: sellerAccount, error: accountError } = await supabase
      .from('seller_connect_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('user_id', sellerId)
      .single();

    if (accountError || !sellerAccount) {
      throw new Error('Seller has no Connect account');
    }

    if (!sellerAccount.payouts_enabled) {
      throw new Error('Seller account is not enabled for payouts');
    }

    // Calculate fees
    const { grossAmount, platformFee, netAmount } = this.calculateFees(settlement.final_amount);

    // Get the charge ID from the PaymentIntent for source_transaction
    const paymentIntent = await stripe.paymentIntents.retrieve(settlement.stripe_payment_intent_id);
    const chargeId = typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;

    if (!chargeId) {
      throw new Error('No charge found for payment intent');
    }

    // Create seller payout record first (pending status)
    const { data: payout, error: payoutError } = await supabase
      .from('seller_payouts')
      .insert({
        settlement_id: settlementId,
        seller_id: sellerId,
        stripe_charge_id: chargeId,
        gross_amount: grossAmount,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (payoutError) {
      logger.error('Error creating payout record', { error: payoutError });
      throw payoutError;
    }

    try {
      // Create transfer to seller's Connect account
      const transfer = await stripe.transfers.create({
        amount: netAmount,
        currency: 'usd',
        destination: sellerAccount.stripe_account_id,
        source_transaction: chargeId,
        metadata: {
          settlement_id: settlementId,
          seller_id: sellerId,
          platform_fee: platformFee.toString(),
          payout_id: payout.id,
        },
      });

      // Update payout with transfer ID and status
      await supabase
        .from('seller_payouts')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'transferred',
          transferred_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      // Update settlement with delivery confirmation and fee info
      await supabase
        .from('settlements')
        .update({
          delivery_confirmed_at: new Date().toISOString(),
          delivery_confirmed_by: confirmingUserId,
          platform_fee_amount: platformFee,
          seller_payout_amount: netAmount,
          status: 'completed',
        })
        .eq('id', settlementId);

      // Update escrow status
      await supabase
        .from('escrow')
        .update({ status: 'released' })
        .eq('settlement_id', settlementId);

      logger.info('Transferred funds to seller', {
        settlementId,
        sellerId,
        transferId: transfer.id,
        netAmount,
        platformFee,
      });

      return {
        id: payout.id,
        settlementId,
        sellerId,
        stripeTransferId: transfer.id,
        grossAmount,
        platformFee,
        netAmount,
        status: 'transferred',
        transferredAt: new Date().toISOString(),
        errorMessage: null,
        createdAt: payout.created_at,
      };
    } catch (error) {
      // Mark payout as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await supabase
        .from('seller_payouts')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', payout.id);

      logger.error('Transfer to seller failed', { error, settlementId, sellerId });
      throw error;
    }
  }

  /**
   * Get seller's earnings summary
   */
  async getSellerEarnings(sellerId: string): Promise<EarningsSummary> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Get pending (in escrow, not yet confirmed delivery)
    const { data: pendingSettlements } = await supabase
      .from('settlements')
      .select('final_amount, listing_id')
      .eq('status', 'charged')
      .is('delivery_confirmed_at', null);

    // Filter to only this seller's settlements
    let pendingEarnings = 0;
    let pendingCount = 0;
    if (pendingSettlements) {
      for (const s of pendingSettlements) {
        const { data: listing } = await supabase
          .from('listings')
          .select('user_id')
          .eq('id', s.listing_id)
          .single();

        if (listing?.user_id === sellerId) {
          const { netAmount } = this.calculateFees(s.final_amount);
          pendingEarnings += netAmount;
          pendingCount++;
        }
      }
    }

    // Get completed payouts
    const { data: payouts } = await supabase
      .from('seller_payouts')
      .select('net_amount, status')
      .eq('seller_id', sellerId);

    let totalTransferred = 0;
    if (payouts) {
      for (const p of payouts) {
        if (p.status === 'transferred') {
          totalTransferred += p.net_amount;
        }
      }
    }

    return {
      pendingEarnings,
      availableEarnings: 0, // Funds go directly to Connect account
      totalTransferred,
      pendingPayouts: pendingCount,
    };
  }

  /**
   * Get seller's payout history
   */
  async getSellerPayouts(sellerId: string): Promise<SellerPayout[]> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('seller_payouts')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((p) => ({
      id: p.id,
      settlementId: p.settlement_id,
      sellerId: p.seller_id,
      stripeTransferId: p.stripe_transfer_id,
      grossAmount: p.gross_amount,
      platformFee: p.platform_fee,
      netAmount: p.net_amount,
      status: p.status,
      transferredAt: p.transferred_at,
      errorMessage: p.error_message,
      createdAt: p.created_at,
    }));
  }

  /**
   * Get buyer's purchases (won auctions)
   */
  async getBuyerPurchases(buyerId: string): Promise<Array<{
    settlementId: string;
    listingId: string;
    cardName: string;
    cardSet: string;
    imageUrl: string;
    amount: number;
    status: string;
    chargedAt: string | null;
    deliveryConfirmedAt: string | null;
    sellerDisplayName: string;
    sellerUsername: string;
    sellerAvatarUrl: string | null;
    sellerMemberSince: string | null;
    sellerLocation: string | null;
    sellerTotalSales: number;
    paymentMethodLast4: string | null;
    paymentMethodBrand: string | null;
    stripePaymentIntentId: string | null;
    trackingNumber: string | null;
    trackingCarrier: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  }>> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('settlements')
      .select(`
        id,
        listing_id,
        final_amount,
        status,
        charged_at,
        delivery_confirmed_at,
        stripe_payment_intent_id,
        tracking_number,
        tracking_carrier,
        shipped_at,
        delivered_at,
        listings!inner(
          card_id,
          user_id,
          pokemon_cards(name, set_name, image_small)
        )
      `)
      .eq('winner_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get seller info and payment method for each settlement
    const settlementsWithDetails = await Promise.all((data || []).map(async (s: any) => {
      const sellerId = s.listings?.user_id;
      let sellerProfile: {
        display_name?: string;
        username?: string;
        avatar_url?: string;
        created_at?: string;
        shipping_address?: { city?: string; state?: string } | null;
      } | null = null;
      let paymentMethod: { card_brand?: string; card_last4?: string } | null = null;
      let sellerTotalSales = 0;

      // Get seller profile
      if (sellerId) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url, created_at, shipping_address')
            .eq('id', sellerId)
            .maybeSingle();
          sellerProfile = profileData;

          // Get seller's total completed sales count
          const { count } = await supabase
            .from('settlements')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', sellerId)
            .eq('status', 'completed');
          sellerTotalSales = count || 0;
        } catch {
          // Seller profile not found, use defaults
        }
      }

      // Get the winning bid's payment method (may not exist for Buy Now purchases)
      try {
        const { data: bidData } = await supabase
          .from('bids')
          .select('payment_method_id')
          .eq('listing_id', s.listing_id)
          .eq('user_id', buyerId)
          .order('amount', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bidData?.payment_method_id) {
          const { data: pmData } = await supabase
            .from('payment_methods')
            .select('card_brand, card_last4')
            .eq('id', bidData.payment_method_id)
            .maybeSingle();
          paymentMethod = pmData;
        }
      } catch {
        // No bid found (Buy Now purchase), payment method will be null
      }

      // Build location string from shipping address
      let sellerLocation: string | null = null;
      if (sellerProfile?.shipping_address) {
        const { city, state } = sellerProfile.shipping_address;
        if (city && state) {
          sellerLocation = `${city}, ${state}`;
        } else if (city) {
          sellerLocation = city;
        } else if (state) {
          sellerLocation = state;
        }
      }

      return {
        settlementId: s.id,
        listingId: s.listing_id,
        cardName: s.listings?.pokemon_cards?.name || 'Unknown',
        cardSet: s.listings?.pokemon_cards?.set_name || 'Unknown',
        imageUrl: s.listings?.pokemon_cards?.image_small || '',
        amount: s.final_amount,
        status: s.status,
        chargedAt: s.charged_at,
        deliveryConfirmedAt: s.delivery_confirmed_at,
        sellerDisplayName: sellerProfile?.display_name || 'Unknown Seller',
        sellerUsername: sellerProfile?.username || '',
        sellerAvatarUrl: sellerProfile?.avatar_url || null,
        sellerMemberSince: sellerProfile?.created_at || null,
        sellerLocation,
        sellerTotalSales,
        paymentMethodLast4: paymentMethod?.card_last4 || null,
        paymentMethodBrand: paymentMethod?.card_brand || null,
        stripePaymentIntentId: s.stripe_payment_intent_id || null,
        trackingNumber: s.tracking_number || null,
        trackingCarrier: s.tracking_carrier || null,
        shippedAt: s.shipped_at || null,
        deliveredAt: s.delivered_at || null,
      };
    }));

    return settlementsWithDetails;
  }

  /**
   * Update payout status from webhook
   */
  async updatePayoutStatus(
    stripeTransferId: string,
    status: 'transferred' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const updates: Record<string, any> = { status };
    if (status === 'failed' && errorMessage) {
      updates.error_message = errorMessage;
    }
    if (status === 'transferred') {
      updates.transferred_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('seller_payouts')
      .update(updates)
      .eq('stripe_transfer_id', stripeTransferId);

    if (error) {
      logger.error('Error updating payout status', { error, stripeTransferId });
      throw error;
    }

    logger.info('Updated payout status', { stripeTransferId, status });
  }

  /**
   * Get seller's sold items with buyer info and shipping address
   */
  async getSellerSales(sellerId: string): Promise<Array<{
    settlementId: string;
    listingId: string;
    cardName: string;
    cardSet: string;
    imageUrl: string;
    amount: number;
    soldAt: string;
    buyerDisplayName: string;
    buyerUsername: string;
    shippingAddress: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      phone?: string;
    } | null;
    trackingNumber: string | null;
    trackingCarrier: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    deliveryConfirmedAt: string | null;
    status: 'awaiting_shipment' | 'shipped' | 'delivered' | 'completed';
  }>> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Get settlements where this user is the seller
    const { data, error } = await supabase
      .from('settlements')
      .select(`
        id,
        listing_id,
        winner_id,
        final_amount,
        status,
        charged_at,
        shipping_address,
        tracking_number,
        tracking_carrier,
        shipped_at,
        delivered_at,
        delivery_confirmed_at,
        listings!inner(
          card_id,
          pokemon_cards(name, set_name, image_small)
        )
      `)
      .eq('seller_id', sellerId)
      .in('status', ['charged', 'completed'])
      .order('charged_at', { ascending: false });

    if (error) {
      logger.error('Error getting seller sales', { error, sellerId });
      throw error;
    }

    // Get buyer profiles for each sale
    const salesWithBuyerInfo = await Promise.all((data || []).map(async (s: any) => {
      let buyerProfile: { display_name?: string; username?: string } | null = null;

      if (s.winner_id) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', s.winner_id)
            .maybeSingle();
          buyerProfile = profileData;
        } catch {
          // Buyer profile not found
        }
      }

      // Determine status
      let saleStatus: 'awaiting_shipment' | 'shipped' | 'delivered' | 'completed' = 'awaiting_shipment';
      if (s.delivery_confirmed_at) {
        saleStatus = 'completed';
      } else if (s.delivered_at) {
        saleStatus = 'delivered';
      } else if (s.shipped_at) {
        saleStatus = 'shipped';
      }

      return {
        settlementId: s.id,
        listingId: s.listing_id,
        cardName: s.listings?.pokemon_cards?.name || 'Unknown',
        cardSet: s.listings?.pokemon_cards?.set_name || 'Unknown',
        imageUrl: s.listings?.pokemon_cards?.image_small || '',
        amount: s.final_amount,
        soldAt: s.charged_at,
        buyerDisplayName: buyerProfile?.display_name || 'Unknown Buyer',
        buyerUsername: buyerProfile?.username || '',
        shippingAddress: s.shipping_address || null,
        trackingNumber: s.tracking_number || null,
        trackingCarrier: s.tracking_carrier || null,
        shippedAt: s.shipped_at || null,
        deliveredAt: s.delivered_at || null,
        deliveryConfirmedAt: s.delivery_confirmed_at || null,
        status: saleStatus,
      };
    }));

    return salesWithBuyerInfo;
  }

  /**
   * Add tracking number to a sale
   */
  async addTracking(
    sellerId: string,
    settlementId: string,
    trackingNumber: string,
    carrier: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Verify seller owns this settlement
    const { data: settlement, error: fetchError } = await supabase
      .from('settlements')
      .select('id, seller_id, shipped_at')
      .eq('id', settlementId)
      .single();

    if (fetchError || !settlement) {
      throw new Error('Settlement not found');
    }

    if (settlement.seller_id !== sellerId) {
      throw new Error('Not authorized to update this sale');
    }

    if (settlement.shipped_at) {
      throw new Error('Tracking already added for this sale');
    }

    // Create Ship24 tracker if configured
    let ship24TrackerId: string | null = null;
    if (ship24Service.isConfigured()) {
      try {
        const tracker = await ship24Service.createTracker(trackingNumber);
        ship24TrackerId = tracker.trackerId;
        logger.info('Ship24 tracker created', { settlementId, trackerId: ship24TrackerId });
      } catch (error) {
        // Log but don't fail - we still want to save tracking number even if Ship24 fails
        logger.error('Failed to create Ship24 tracker', { error, settlementId, trackingNumber });
      }
    }

    // Update settlement with tracking info
    const { error: updateError } = await supabase
      .from('settlements')
      .update({
        tracking_number: trackingNumber,
        tracking_carrier: carrier.toLowerCase(),
        shipped_at: new Date().toISOString(),
        ship24_tracker_id: ship24TrackerId,
      })
      .eq('id', settlementId);

    if (updateError) {
      logger.error('Error adding tracking', { error: updateError, settlementId });
      throw updateError;
    }

    logger.info('Tracking added to sale', { settlementId, trackingNumber, carrier, ship24TrackerId });
  }

  /**
   * Process automatic escrow releases for delivered packages
   * Called periodically by cron job
   * Releases escrow for settlements where:
   * - delivered_at is set
   * - auto_release_at <= now
   * - delivery_confirmed_at is null
   */
  async processAutoReleases(): Promise<{ processed: number; errors: number }> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      logger.error('Supabase not configured for auto-release');
      return { processed: 0, errors: 0 };
    }

    logger.info('Starting auto-release escrow job');

    // Find settlements ready for auto-release
    const now = new Date().toISOString();
    const { data: settlements, error: fetchError } = await supabase
      .from('settlements')
      .select('id, buyer_id, seller_id, amount')
      .not('delivered_at', 'is', null)
      .lte('auto_release_at', now)
      .is('delivery_confirmed_at', null);

    if (fetchError) {
      logger.error('Error fetching settlements for auto-release', { error: fetchError });
      return { processed: 0, errors: 0 };
    }

    if (!settlements || settlements.length === 0) {
      logger.info('No settlements ready for auto-release');
      return { processed: 0, errors: 0 };
    }

    logger.info(`Found ${settlements.length} settlements ready for auto-release`);

    let processed = 0;
    let errors = 0;

    for (const settlement of settlements) {
      try {
        // Use the existing releaseEscrowToSeller method
        // Pass a "system" user ID to indicate this is an auto-release
        await this.releaseEscrowToSeller(settlement.id, settlement.buyer_id);

        // Mark as auto-confirmed
        const { error: updateError } = await supabase
          .from('settlements')
          .update({
            delivery_confirmed_at: new Date().toISOString(),
          })
          .eq('id', settlement.id);

        if (updateError) {
          logger.error('Error marking settlement as auto-confirmed', {
            settlementId: settlement.id,
            error: updateError,
          });
        }

        logger.info('Auto-released escrow for settlement', { settlementId: settlement.id });
        processed++;
      } catch (error) {
        logger.error('Error auto-releasing escrow', {
          settlementId: settlement.id,
          error,
        });
        errors++;
      }
    }

    logger.info('Auto-release job completed', { processed, errors });
    return { processed, errors };
  }
}

export const payoutService = new PayoutService();

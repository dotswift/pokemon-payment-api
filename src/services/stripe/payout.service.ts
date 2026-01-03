import Stripe from 'stripe';
import { getStripeClient } from './client';
import { getSupabaseClient } from '../supabase';
import { logger } from '../../utils/logger';

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
        listings!inner(
          card_id,
          pokemon_cards(name, set_name, image_small)
        )
      `)
      .eq('winner_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((s: any) => ({
      settlementId: s.id,
      listingId: s.listing_id,
      cardName: s.listings?.pokemon_cards?.name || 'Unknown',
      cardSet: s.listings?.pokemon_cards?.set_name || 'Unknown',
      imageUrl: s.listings?.pokemon_cards?.image_small || '',
      amount: s.final_amount,
      status: s.status,
      chargedAt: s.charged_at,
      deliveryConfirmedAt: s.delivery_confirmed_at,
    }));
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
}

export const payoutService = new PayoutService();

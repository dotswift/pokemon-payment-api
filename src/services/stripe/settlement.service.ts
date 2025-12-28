import Stripe from 'stripe';
import { getStripeClient } from './client';
import { getSupabaseClient } from '../supabase';
import { logger } from '../../utils/logger';

export interface SettlementResult {
  listingId: string;
  status: 'succeeded' | 'failed';
  amount?: number;
  error?: string;
}

export interface SettlementSummary {
  endedAuctions: number;
  settlementsProcessed: number;
  results: SettlementResult[];
}

interface AuctionToSettle {
  listing_id: string;
  winner_id: string;
  seller_id: string;
  final_amount: number;
  stripe_payment_method_id: string;
  card_name: string;
  card_set: string;
}

class SettlementService {
  /**
   * Run the auction settlement process
   * 1. End expired auctions
   * 2. Charge winners for their winning bids
   * 3. Create settlement and escrow records
   */
  async settleAuctions(): Promise<SettlementSummary> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // 1. End expired auctions
    const { data: endedCount } = await supabase.rpc('end_expired_auctions');
    logger.info(`Ended ${endedCount || 0} expired auctions`);

    // 2. Get auctions needing settlement
    const { data: auctions, error: auctionsError } = await supabase.rpc('get_auctions_needing_settlement');

    if (auctionsError) {
      logger.error('Error getting auctions', { error: auctionsError });
      throw auctionsError;
    }

    logger.info(`Found ${auctions?.length || 0} auctions to settle`);

    const results: SettlementResult[] = [];

    for (const auction of (auctions || []) as AuctionToSettle[]) {
      try {
        logger.info(`Processing auction ${auction.listing_id}`);

        // Get Stripe customer ID for winner
        const { data: stripeCustomer } = await supabase
          .from('stripe_customers')
          .select('stripe_customer_id')
          .eq('user_id', auction.winner_id)
          .single();

        if (!stripeCustomer?.stripe_customer_id) {
          logger.error(`No Stripe customer for winner ${auction.winner_id}`);
          results.push({
            listingId: auction.listing_id,
            status: 'failed',
            error: 'No Stripe customer found for winner',
          });
          continue;
        }

        // Create PaymentIntent to charge winner
        const amountCents = Math.round(auction.final_amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          customer: stripeCustomer.stripe_customer_id,
          payment_method: auction.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `Auction win: ${auction.card_name} (${auction.card_set})`,
          metadata: {
            listing_id: auction.listing_id,
            winner_id: auction.winner_id,
            seller_id: auction.seller_id,
          },
        });

        // Create settlement record and get the inserted ID
        const { data: settlement, error: settlementError } = await supabase
          .from('settlements')
          .insert({
            listing_id: auction.listing_id,
            winner_id: auction.winner_id,
            seller_id: auction.seller_id,
            amount: amountCents,
            stripe_payment_intent_id: paymentIntent.id,
            status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
          })
          .select('id')
          .single();

        if (settlementError) {
          logger.error('Settlement insert error', { error: settlementError });
        }

        // Update listing status
        if (paymentIntent.status === 'succeeded' && settlement?.id) {
          await supabase
            .from('listings')
            .update({ status: 'sold' })
            .eq('id', auction.listing_id);

          // Create escrow record with actual settlement ID
          await supabase.from('escrow').insert({
            settlement_id: settlement.id,
            amount: amountCents,
            status: 'holding',
          });
        }

        results.push({
          listingId: auction.listing_id,
          status: 'succeeded',
          amount: amountCents,
        });

        logger.info(`Successfully processed auction ${auction.listing_id}: ${paymentIntent.status}`);

      } catch (err) {
        const error = err as Error;
        logger.error(`Error processing auction ${auction.listing_id}`, { error: error.message });

        // Record failed settlement attempt
        await supabase.from('settlements').insert({
          listing_id: auction.listing_id,
          winner_id: auction.winner_id,
          seller_id: auction.seller_id,
          amount: Math.round(auction.final_amount * 100),
          status: 'failed',
          error_message: error.message,
        });

        results.push({
          listingId: auction.listing_id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return {
      endedAuctions: endedCount || 0,
      settlementsProcessed: results.length,
      results,
    };
  }
}

export const settlementService = new SettlementService();

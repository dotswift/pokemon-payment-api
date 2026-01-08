import Stripe from 'stripe';
import { getStripeClient } from './client';
import { getSupabaseClient } from '../supabase';
import { logger } from '../../utils/logger';
import { profileService } from '../profile.service';

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

export interface BuyNowResult {
  success: boolean;
  error?: string;
  data?: {
    settlementId: string;
    cardName: string;
    cardSet: string;
    amount: number;
    checkoutUrl: string;
    sessionId: string;
  };
}

export interface CheckoutSessionResult {
  success: boolean;
  error?: string;
  data?: {
    checkoutUrl: string;
    sessionId: string;
    settlementId: string;
    cardName: string;
    cardSet: string;
    amount: number;
  };
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
   * 2. Create pending_payment settlements for winners to complete payment
   *
   * Note: Winners will complete payment via checkout session (supports card + crypto)
   */
  async settleAuctions(): Promise<SettlementSummary> {
    const supabase = getSupabaseClient();

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

        const amountCents = Math.round(auction.final_amount * 100);

        // Get winner's shipping address
        const shippingAddress = await profileService.getShippingAddress(auction.winner_id);

        // Create settlement record with pending_payment status
        // Winner will complete payment via checkout session
        const { data: settlement, error: settlementError } = await supabase
          .from('settlements')
          .insert({
            listing_id: auction.listing_id,
            winner_id: auction.winner_id,
            seller_id: auction.seller_id,
            final_amount: amountCents,
            status: 'pending_payment',
            shipping_address: shippingAddress,
          })
          .select('id')
          .single();

        if (settlementError) {
          logger.error('Settlement insert error', { error: settlementError });
          results.push({
            listingId: auction.listing_id,
            status: 'failed',
            error: 'Failed to create settlement record',
          });
          continue;
        }

        // Update listing status to awaiting_payment
        await supabase
          .from('listings')
          .update({ status: 'awaiting_payment' })
          .eq('id', auction.listing_id);

        results.push({
          listingId: auction.listing_id,
          status: 'succeeded',
          amount: amountCents,
        });

        logger.info(`Settlement created for auction ${auction.listing_id}, awaiting winner payment`, {
          settlementId: settlement.id,
          winnerId: auction.winner_id,
        });

      } catch (err) {
        const error = err as Error;
        logger.error(`Error processing auction ${auction.listing_id}`, { error: error.message });

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

  /**
   * Process Buy Now purchase - creates a Checkout Session for payment
   * Supports both card and crypto (USDC) payments
   */
  async processBuyNow(
    buyerId: string,
    listingId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<BuyNowResult> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // 1. Get listing and verify it has buy_now_price and is active
    logger.info('Buy Now: fetching listing', { listingId, buyerId });
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, user_id, buy_now_price, status, card:pokemon_cards(name, set_name, image_small)')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      logger.warn('Buy Now: listing not found', { listingId, error: listingError });
      return { success: false, error: 'Listing not found' };
    }

    logger.info('Buy Now: listing found', { listingId, status: listing.status, buyNowPrice: listing.buy_now_price, sellerId: listing.user_id });

    if (listing.status !== 'active') {
      logger.warn('Buy Now: listing not active', { listingId, status: listing.status });
      return { success: false, error: 'Listing is no longer active' };
    }

    if (!listing.buy_now_price) {
      logger.warn('Buy Now: no buy_now_price', { listingId });
      return { success: false, error: 'Listing does not have a Buy Now price' };
    }

    if (listing.user_id === buyerId) {
      logger.warn('Buy Now: buyer is seller', { listingId, buyerId });
      return { success: false, error: 'Cannot buy your own listing' };
    }

    const sellerId = listing.user_id;
    const amountCents = Math.round(listing.buy_now_price * 100);
    const cardName = (listing.card as { name?: string })?.name || 'Unknown Card';
    const cardSet = (listing.card as { set_name?: string })?.set_name || '';
    const cardImage = (listing.card as { image_small?: string })?.image_small;

    // 2. Get or create Stripe customer for buyer
    let stripeCustomerId: string;
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', buyerId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      // Get buyer email and create customer
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', buyerId)
        .single();

      const customer = await stripe.customers.create({
        email: profile?.email,
        metadata: { supabase_user_id: buyerId },
      });
      stripeCustomerId = customer.id;

      await supabase.from('stripe_customers').insert({
        user_id: buyerId,
        stripe_customer_id: customer.id,
      });
    }

    try {
      // Get buyer's shipping address
      const shippingAddress = await profileService.getShippingAddress(buyerId);

      // 3. Create settlement record with pending_payment status
      const { data: settlement, error: settlementError } = await supabase
        .from('settlements')
        .insert({
          listing_id: listingId,
          winner_id: buyerId,
          seller_id: sellerId,
          final_amount: amountCents,
          status: 'pending_payment',
          shipping_address: shippingAddress,
        })
        .select('id')
        .single();

      if (settlementError || !settlement) {
        logger.error('Settlement insert error', { error: settlementError });
        return { success: false, error: 'Failed to create settlement' };
      }

      // 4. Create Checkout Session with card and crypto payment methods
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card', 'crypto'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: cardName,
                description: cardSet ? `Set: ${cardSet}` : undefined,
                images: cardImage ? [cardImage] : undefined,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
        // Show saved payment methods and allow saving new ones
        saved_payment_method_options: {
          allow_redisplay_filters: ['always', 'limited'],
          payment_method_save: 'enabled',
        },
        metadata: {
          settlement_id: settlement.id,
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          type: 'buy_now',
        },
      });

      // 5. Update settlement with checkout session ID
      await supabase
        .from('settlements')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', settlement.id);

      logger.info(`Buy Now checkout session created for listing ${listingId}`, { sessionId: session.id });

      return {
        success: true,
        data: {
          settlementId: settlement.id,
          cardName,
          cardSet,
          amount: amountCents,
          checkoutUrl: session.url!,
          sessionId: session.id,
        },
      };

    } catch (err) {
      const error = err as Error;
      logger.error(`Buy Now failed for listing ${listingId}`, { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Create checkout session for completing auction payment
   * Called by winner after auction ends
   */
  async createAuctionPaymentCheckout(
    buyerId: string,
    settlementId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSessionResult> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // 1. Get settlement and verify ownership and status
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .select(`
        id,
        winner_id,
        seller_id,
        listing_id,
        final_amount,
        status,
        listing:listings(
          id,
          card:pokemon_cards(name, set_name, image_small)
        )
      `)
      .eq('id', settlementId)
      .single();

    if (settlementError || !settlement) {
      logger.warn('Settlement not found', { settlementId, error: settlementError });
      return { success: false, error: 'Settlement not found' };
    }

    if (settlement.winner_id !== buyerId) {
      logger.warn('User not winner of settlement', { settlementId, buyerId, winnerId: settlement.winner_id });
      return { success: false, error: 'You are not the winner of this auction' };
    }

    if (settlement.status !== 'pending_payment') {
      logger.warn('Settlement not pending payment', { settlementId, status: settlement.status });
      return { success: false, error: `Payment already ${settlement.status}` };
    }

    // Handle nested Supabase join - listing is an object, card is nested
    const listing = settlement.listing as unknown as { id: string; card: { name?: string; set_name?: string; image_small?: string } } | null;
    const cardName = listing?.card?.name || 'Unknown Card';
    const cardSet = listing?.card?.set_name || '';
    const cardImage = listing?.card?.image_small;

    // 2. Get or create Stripe customer for buyer
    let stripeCustomerId: string;
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', buyerId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', buyerId)
        .single();

      const customer = await stripe.customers.create({
        email: profile?.email,
        metadata: { supabase_user_id: buyerId },
      });
      stripeCustomerId = customer.id;

      await supabase.from('stripe_customers').insert({
        user_id: buyerId,
        stripe_customer_id: customer.id,
      });
    }

    try {
      // 3. Create Checkout Session with card and crypto payment methods
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card', 'crypto'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: cardName,
                description: cardSet ? `Set: ${cardSet}` : undefined,
                images: cardImage ? [cardImage] : undefined,
              },
              unit_amount: settlement.final_amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours for auction payments
        // Show saved payment methods and allow saving new ones
        saved_payment_method_options: {
          allow_redisplay_filters: ['always', 'limited'],
          payment_method_save: 'enabled',
        },
        metadata: {
          settlement_id: settlementId,
          listing_id: settlement.listing_id,
          buyer_id: buyerId,
          seller_id: settlement.seller_id,
          type: 'auction',
        },
      });

      // 4. Update settlement with checkout session ID
      await supabase
        .from('settlements')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', settlementId);

      logger.info(`Auction payment checkout session created`, { settlementId, sessionId: session.id });

      return {
        success: true,
        data: {
          checkoutUrl: session.url!,
          sessionId: session.id,
          settlementId,
          cardName,
          cardSet,
          amount: settlement.final_amount,
        },
      };

    } catch (err) {
      const error = err as Error;
      logger.error(`Auction payment checkout failed`, { settlementId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle successful checkout session completion
   * Called from webhook handler
   */
  async handleCheckoutComplete(sessionId: string): Promise<void> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe || !supabase) {
      throw new Error('Services not configured');
    }

    // Get the full session with payment intent
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const settlementId = session.metadata?.settlement_id;
    const listingId = session.metadata?.listing_id;

    if (!settlementId) {
      logger.error('No settlement_id in checkout session metadata', { sessionId });
      return;
    }

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent;

    // Update settlement to charged
    const { error: updateError } = await supabase
      .from('settlements')
      .update({
        status: 'charged',
        charged_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent?.id,
      })
      .eq('id', settlementId);

    if (updateError) {
      logger.error('Failed to update settlement status', { settlementId, error: updateError });
      return;
    }

    // Update listing to sold
    if (listingId) {
      await supabase
        .from('listings')
        .update({ status: 'sold', ends_at: new Date().toISOString() })
        .eq('id', listingId);
    }

    // Get settlement amount and create escrow
    const { data: settlement } = await supabase
      .from('settlements')
      .select('final_amount')
      .eq('id', settlementId)
      .single();

    if (settlement) {
      await supabase.from('escrow').insert({
        settlement_id: settlementId,
        amount: settlement.final_amount,
        status: 'holding',
      });
    }

    logger.info('Checkout completed successfully', { sessionId, settlementId });
  }

  /**
   * Handle expired checkout session
   * Called from webhook handler
   */
  async handleCheckoutExpired(sessionId: string): Promise<void> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Find settlement by checkout session ID
    const { data: settlement } = await supabase
      .from('settlements')
      .select('id, status, listing_id')
      .eq('stripe_checkout_session_id', sessionId)
      .single();

    if (!settlement) {
      logger.warn('No settlement found for expired session', { sessionId });
      return;
    }

    // Only update if still pending payment
    if (settlement.status === 'pending_payment') {
      await supabase
        .from('settlements')
        .update({ status: 'expired' })
        .eq('id', settlement.id);

      // For buy-now, re-activate the listing
      // For auctions, may need different handling (re-list, second chance, etc.)
      logger.info('Checkout session expired', { sessionId, settlementId: settlement.id });
    }
  }
}

export const settlementService = new SettlementService();

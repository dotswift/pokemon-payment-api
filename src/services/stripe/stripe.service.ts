import Stripe from 'stripe';
import { getStripeClient, isStripeEnabled } from './client';
import { getSupabaseClient } from '../supabase';
import { logger } from '../../utils/logger';
import { settlementService } from './settlement.service';

export interface SetupIntentResult {
  clientSecret: string;
  customerId: string;
}

export interface SavedPaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

class StripeService {
  /**
   * Get or create a Stripe customer for a user
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Check if user already has a Stripe customer
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      return existingCustomer.stripe_customer_id;
    }

    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        supabase_user_id: userId,
      },
    });

    // Save to database
    await supabase.from('stripe_customers').insert({
      user_id: userId,
      stripe_customer_id: customer.id,
    });

    logger.info('Created Stripe customer', { userId, customerId: customer.id });

    return customer.id;
  }

  /**
   * Create a SetupIntent for saving a payment method
   */
  async createSetupIntent(userId: string, email: string): Promise<SetupIntentResult> {
    const stripe = getStripeClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const customerId = await this.getOrCreateCustomer(userId, email);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'link'],
      metadata: {
        supabase_user_id: userId,
      },
    });

    logger.info('Created SetupIntent', { userId, setupIntentId: setupIntent.id });

    return {
      clientSecret: setupIntent.client_secret!,
      customerId,
    };
  }

  /**
   * Save a payment method after successful SetupIntent
   */
  async savePaymentMethod(userId: string, paymentMethodId: string): Promise<SavedPaymentMethod> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Get the payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Handle different payment method types
    let cardBrand = 'unknown';
    let cardLast4 = '0000';
    let cardExpMonth = 12;
    let cardExpYear = 2099;

    if (paymentMethod.card) {
      cardBrand = paymentMethod.card.brand;
      cardLast4 = paymentMethod.card.last4;
      cardExpMonth = paymentMethod.card.exp_month;
      cardExpYear = paymentMethod.card.exp_year;
    } else if (paymentMethod.link) {
      cardBrand = 'link';
      cardLast4 = paymentMethod.link.email?.slice(-4) || 'link';
    } else if (paymentMethod.type) {
      cardBrand = paymentMethod.type;
    }

    // Check if this is the user's first payment method
    const { data: existingMethods } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', userId);

    const isFirst = !existingMethods || existingMethods.length === 0;

    // Save payment method to database
    const { data: savedMethod, error: saveError } = await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        stripe_payment_method_id: paymentMethodId,
        card_brand: cardBrand,
        card_last4: cardLast4,
        card_exp_month: cardExpMonth,
        card_exp_year: cardExpYear,
        is_default: isFirst,
        bid_limit: 1000000000, // $10M in cents - effectively unlimited
      })
      .select()
      .single();

    if (saveError) {
      if (saveError.code === '23505') {
        throw new Error('This card is already saved');
      }
      throw saveError;
    }

    logger.info('Saved payment method', { userId, paymentMethodId, brand: cardBrand });

    return {
      id: savedMethod.id,
      stripePaymentMethodId: paymentMethodId,
      brand: cardBrand,
      last4: cardLast4,
      expMonth: cardExpMonth,
      expYear: cardExpYear,
      isDefault: isFirst,
    };
  }

  /**
   * List user's payment methods
   */
  async listPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((pm) => ({
      id: pm.id,
      stripePaymentMethodId: pm.stripe_payment_method_id,
      brand: pm.card_brand,
      last4: pm.card_last4,
      expMonth: pm.card_exp_month,
      expYear: pm.card_exp_year,
      isDefault: pm.is_default,
    }));
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(userId: string, stripePaymentMethodId: string): Promise<void> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Verify the payment method belongs to this user
    const { data: pm, error: fetchError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', stripePaymentMethodId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !pm) {
      throw new Error('Payment method not found');
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(stripePaymentMethodId);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('stripe_payment_method_id', stripePaymentMethodId)
      .eq('user_id', userId);

    if (deleteError) {
      throw deleteError;
    }

    logger.info('Deleted payment method', { userId, stripePaymentMethodId });
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Unset all other defaults
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Set the new default
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    logger.info('Set default payment method', { userId, paymentMethodId });
  }

  /**
   * Get user's bid power (secure - uses authenticated user ID)
   */
  async getBidPower(userId: string): Promise<{ total: number; available: number }> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Call RPCs with the authenticated user's ID (not client-provided)
    const { data: total, error: totalError } = await supabase.rpc('get_user_bid_power', {
      p_user_id: userId,
    });

    if (totalError) {
      logger.error('Error getting bid power', { error: totalError });
      throw totalError;
    }

    const { data: available, error: availableError } = await supabase.rpc('get_available_bid_power', {
      p_user_id: userId,
    });

    if (availableError) {
      logger.error('Error getting available bid power', { error: availableError });
      throw availableError;
    }

    return {
      total: total || 0,
      available: available || 0,
    };
  }

  /**
   * Place a bid (secure - uses authenticated user ID)
   * Replicates the place_bid RPC logic since auth.uid() doesn't work with service role
   */
  async placeBid(
    userId: string,
    listingId: string,
    amount: number,
    paymentMethodId: string
  ): Promise<{ success: boolean; bidId?: string; error?: string }> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // 1. Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, status, ends_at, user_id, current_bid, high_bidder_id, min_bid_increment, starting_price, bid_count')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return { success: false, error: 'Listing not found' };
    }

    // 2. Check listing is active
    if (listing.status !== 'active') {
      return { success: false, error: 'Auction is not active' };
    }

    // 3. Check auction hasn't ended
    if (new Date(listing.ends_at) < new Date()) {
      return { success: false, error: 'Auction has ended' };
    }

    // 4. Check user isn't the seller
    if (listing.user_id === userId) {
      return { success: false, error: 'Cannot bid on your own listing' };
    }

    // 5. Calculate minimum valid bid
    const minIncrement = listing.min_bid_increment || 100;
    const minBid = Math.max(
      listing.starting_price || 0,
      (listing.current_bid || 0) + minIncrement
    );

    if (amount < minBid) {
      return { success: false, error: `Bid too low. Minimum: ${minBid}` };
    }

    // 6. Verify payment method belongs to user
    const { data: pm, error: pmError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', paymentMethodId)
      .eq('user_id', userId)
      .single();

    if (pmError || !pm) {
      return { success: false, error: 'Invalid payment method' };
    }

    // 7. Calculate available bid power
    const { data: totalPower } = await supabase.rpc('get_user_bid_power', { p_user_id: userId });
    const { data: exposure } = await supabase.rpc('get_user_bid_exposure', { p_user_id: userId });

    let currentExposure = exposure || 0;
    // If user is already high bidder, their existing bid doesn't count against them
    if (listing.high_bidder_id === userId) {
      currentExposure -= listing.current_bid || 0;
    }

    const availablePower = (totalPower || 0) - currentExposure;

    if (amount > availablePower) {
      return { success: false, error: `Insufficient bid power. Available: ${availablePower}` };
    }

    // 8. Mark previous winning bid as not winning
    await supabase
      .from('bids')
      .update({ is_winning: false })
      .eq('listing_id', listingId)
      .eq('is_winning', true);

    // 9. Insert new bid
    const { data: newBid, error: bidError } = await supabase
      .from('bids')
      .insert({
        listing_id: listingId,
        user_id: userId,
        amount,
        payment_method_id: paymentMethodId,
        is_winning: true,
      })
      .select('id')
      .single();

    if (bidError || !newBid) {
      logger.error('Error inserting bid', { error: bidError });
      return { success: false, error: 'Failed to place bid' };
    }

    // 10. Update listing
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        current_bid: amount,
        high_bidder_id: userId,
        bid_count: (listing.bid_count || 0) + 1,
      })
      .eq('id', listingId);

    if (updateError) {
      logger.error('Error updating listing', { error: updateError });
      // Bid was placed but listing update failed - log but don't fail
    }

    logger.info('Bid placed successfully', { userId, listingId, amount, bidId: newBid.id });

    return { success: true, bidId: newBid.id };
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    const stripe = getStripeClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Handle incoming Stripe webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    logger.info('Processing Stripe webhook event', { type: event.type, id: event.id });

    switch (event.type) {
      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        logger.info('SetupIntent succeeded', { id: setupIntent.id });
        // Payment method is saved via save-payment-method endpoint
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.info('PaymentIntent succeeded', { id: paymentIntent.id });

        // Update settlement status
        const { error } = await supabase
          .from('settlements')
          .update({
            status: 'charged',
            charged_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (error) {
          logger.error('Error updating settlement', { error });
        }

        // Create escrow entry
        const { data: settlement } = await supabase
          .from('settlements')
          .select('id, final_amount')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (settlement) {
          await supabase.from('escrow').insert({
            settlement_id: settlement.id,
            amount: settlement.final_amount,
            status: 'held',
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.info('PaymentIntent failed', { id: paymentIntent.id });

        // Update settlement status
        await supabase
          .from('settlements')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }

      case 'account.updated': {
        // Seller Connect account status changed
        const account = event.data.object as Stripe.Account;
        logger.info('Connect account updated', {
          accountId: account.id,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        });

        // Update seller_connect_accounts with new status
        const { error } = await supabase
          .from('seller_connect_accounts')
          .update({
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
          })
          .eq('stripe_account_id', account.id);

        if (error) {
          logger.error('Error updating Connect account', { error, accountId: account.id });
        }
        break;
      }

      case 'transfer.created': {
        // Transfer to seller initiated
        const transfer = event.data.object as Stripe.Transfer;
        logger.info('Transfer created', {
          transferId: transfer.id,
          amount: transfer.amount,
          destination: transfer.destination,
        });
        // Status already updated synchronously when creating transfer
        break;
      }

      case 'transfer.reversed': {
        // Transfer to seller was reversed (e.g., due to dispute)
        const transfer = event.data.object as Stripe.Transfer;
        logger.warn('Transfer reversed', {
          transferId: transfer.id,
          destination: transfer.destination,
          reversed: transfer.reversed,
        });

        // Update payout status to failed if fully reversed
        if (transfer.reversed) {
          const { error } = await supabase
            .from('seller_payouts')
            .update({
              status: 'failed',
              error_message: 'Transfer reversed',
            })
            .eq('stripe_transfer_id', transfer.id);

          if (error) {
            logger.error('Error updating payout status', { error, transferId: transfer.id });
          }
        }
        break;
      }

      case 'checkout.session.completed': {
        // Checkout session completed (payment successful)
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info('Checkout session completed', {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
        });

        if (session.payment_status === 'paid') {
          await settlementService.handleCheckoutComplete(session.id);
        }
        break;
      }

      case 'checkout.session.expired': {
        // Checkout session expired without payment
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info('Checkout session expired', {
          sessionId: session.id,
          metadata: session.metadata,
        });

        await settlementService.handleCheckoutExpired(session.id);
        break;
      }

      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
    }
  }
}

export const stripeService = new StripeService();

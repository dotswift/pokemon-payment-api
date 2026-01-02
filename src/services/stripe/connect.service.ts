import Stripe from 'stripe';
import { getStripeClient } from './client';
import { getSupabaseClient } from '../supabase';
import { logger } from '../../utils/logger';

export interface ConnectAccountStatus {
  id: string;
  stripeAccountId: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  createdAt: string;
}

export interface OnboardingLink {
  url: string;
  expiresAt: number;
}

class ConnectService {
  /**
   * Create a Stripe Express Connect account for a seller
   */
  async createExpressAccount(userId: string, email: string): Promise<ConnectAccountStatus> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Check if user already has a Connect account
    const { data: existing } = await supabase
      .from('seller_connect_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Return existing account status
      return {
        id: existing.id,
        stripeAccountId: existing.stripe_account_id,
        detailsSubmitted: existing.details_submitted,
        chargesEnabled: existing.charges_enabled,
        payoutsEnabled: existing.payouts_enabled,
        createdAt: existing.created_at,
      };
    }

    // Create new Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        supabase_user_id: userId,
      },
    });

    // Save to database
    const { data: saved, error } = await supabase
      .from('seller_connect_accounts')
      .insert({
        user_id: userId,
        stripe_account_id: account.id,
        details_submitted: account.details_submitted || false,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error saving Connect account', { error, userId });
      throw error;
    }

    logger.info('Created Express Connect account', { userId, accountId: account.id });

    return {
      id: saved.id,
      stripeAccountId: account.id,
      detailsSubmitted: account.details_submitted || false,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      createdAt: saved.created_at,
    };
  }

  /**
   * Get a seller's Connect account status
   */
  async getAccountStatus(userId: string): Promise<ConnectAccountStatus | null> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Get from database
    const { data: account, error } = await supabase
      .from('seller_connect_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !account) {
      return null;
    }

    // Fetch latest status from Stripe
    try {
      const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);

      // Update database if status changed
      if (
        stripeAccount.details_submitted !== account.details_submitted ||
        stripeAccount.charges_enabled !== account.charges_enabled ||
        stripeAccount.payouts_enabled !== account.payouts_enabled
      ) {
        await supabase
          .from('seller_connect_accounts')
          .update({
            details_submitted: stripeAccount.details_submitted,
            charges_enabled: stripeAccount.charges_enabled,
            payouts_enabled: stripeAccount.payouts_enabled,
          })
          .eq('id', account.id);
      }

      return {
        id: account.id,
        stripeAccountId: account.stripe_account_id,
        detailsSubmitted: stripeAccount.details_submitted || false,
        chargesEnabled: stripeAccount.charges_enabled || false,
        payoutsEnabled: stripeAccount.payouts_enabled || false,
        createdAt: account.created_at,
      };
    } catch (err) {
      logger.error('Error retrieving Stripe account', { error: err, accountId: account.stripe_account_id });
      // Return cached status if Stripe call fails
      return {
        id: account.id,
        stripeAccountId: account.stripe_account_id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        createdAt: account.created_at,
      };
    }
  }

  /**
   * Create an onboarding link for seller verification
   */
  async createOnboardingLink(userId: string, frontendUrl: string): Promise<OnboardingLink> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Get user's Connect account
    const { data: account, error } = await supabase
      .from('seller_connect_accounts')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single();

    if (error || !account) {
      throw new Error('No Connect account found. Create one first.');
    }

    // Create onboarding link
    // Redirect to root with query param (app is single-page, no /seller/onboarding route)
    const accountLink = await stripe.accountLinks.create({
      account: account.stripe_account_id,
      refresh_url: `${frontendUrl}?seller_onboarding=refresh`,
      return_url: `${frontendUrl}?seller_onboarding=complete`,
      type: 'account_onboarding',
    });

    logger.info('Created onboarding link', { userId, accountId: account.stripe_account_id });

    return {
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    };
  }

  /**
   * Create an Express dashboard link for sellers to manage their account
   */
  async createDashboardLink(userId: string): Promise<string> {
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();

    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Get user's Connect account
    const { data: account, error } = await supabase
      .from('seller_connect_accounts')
      .select('stripe_account_id, details_submitted')
      .eq('user_id', userId)
      .single();

    if (error || !account) {
      throw new Error('No Connect account found');
    }

    if (!account.details_submitted) {
      throw new Error('Account onboarding not complete');
    }

    // Create login link
    const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);

    logger.info('Created dashboard link', { userId, accountId: account.stripe_account_id });

    return loginLink.url;
  }

  /**
   * Get Connect account by Stripe account ID (for webhooks)
   */
  async getAccountByStripeId(stripeAccountId: string): Promise<{ userId: string; id: string } | null> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('seller_connect_accounts')
      .select('id, user_id')
      .eq('stripe_account_id', stripeAccountId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
    };
  }

  /**
   * Update Connect account status (called from webhooks)
   */
  async updateAccountStatus(
    stripeAccountId: string,
    status: {
      detailsSubmitted?: boolean;
      chargesEnabled?: boolean;
      payoutsEnabled?: boolean;
    }
  ): Promise<void> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const updates: Record<string, boolean> = {};
    if (status.detailsSubmitted !== undefined) {
      updates.details_submitted = status.detailsSubmitted;
    }
    if (status.chargesEnabled !== undefined) {
      updates.charges_enabled = status.chargesEnabled;
    }
    if (status.payoutsEnabled !== undefined) {
      updates.payouts_enabled = status.payoutsEnabled;
    }

    const { error } = await supabase
      .from('seller_connect_accounts')
      .update(updates)
      .eq('stripe_account_id', stripeAccountId);

    if (error) {
      logger.error('Error updating Connect account status', { error, stripeAccountId });
      throw error;
    }

    logger.info('Updated Connect account status', { stripeAccountId, updates });
  }
}

export const connectService = new ConnectService();

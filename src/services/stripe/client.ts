import Stripe from 'stripe';
import { stripeConfig } from '../../config/stripe';
import { logger } from '../../utils/logger';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!stripeConfig.isEnabled) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeConfig.secretKey);
    logger.info('Stripe client initialized');
  }

  return stripeClient;
}

export function isStripeEnabled(): boolean {
  return stripeConfig.isEnabled;
}

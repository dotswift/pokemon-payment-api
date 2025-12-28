import { config } from './index';

export const stripeConfig = {
  secretKey: config.stripe.secretKey,
  webhookSecret: config.stripe.webhookSecret,
  isEnabled: Boolean(config.stripe.secretKey),
};

// Webhook event types
export type WebhookEventType =
  // Order events
  | 'order.created'
  | 'order.processing'
  | 'order.completed'
  | 'order.failed'
  | 'order.cancelled'
  | 'order.refunded'
  | 'order.expired'
  // KYC events
  | 'kyc.submitted'
  | 'kyc.approved'
  | 'kyc.rejected'
  | 'kyc.pending'
  // Payout events
  | 'payout.created'
  | 'payout.processing'
  | 'payout.completed'
  | 'payout.failed'
  // Prefund events
  | 'prefund.received'
  | 'prefund.confirmed'
  // Collection events
  | 'collection.created'
  | 'collection.completed'
  | 'collection.failed';

// Base webhook payload
export interface WebhookPayload {
  eventType: WebhookEventType;
  timestamp: string;
  data: WebhookEventData;
}

// Event-specific data
export interface WebhookEventData {
  orderId?: string;
  userId?: string;
  email?: string;
  status?: string;
  amount?: number;
  currency?: string;
  cryptoTicker?: string;
  walletAddress?: string;
  txHash?: string;
  failureReason?: string;
  rejectLabels?: string[];
  [key: string]: unknown;
}

// Webhook headers
export interface WebhookHeaders {
  'x-transfi-signature'?: string;
  'x-transfi-timestamp'?: string;
}

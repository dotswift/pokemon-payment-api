import { Address, DeviceDetails, PartnerContext } from './common';

// Create Payin Order
export interface CreatePayinRequest {
  amount: number;
  country: string;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  paymentType: string;
  purposeCode: string;
  redirectUrl: string;
  sourceUrl: string;
  balanceCurrency?: string;
  additionalDetails?: {
    accountNumber?: string;
    bic?: string;
    phone?: string;
    phoneCode?: string;
  };
  deviceDetails?: DeviceDetails;
  headlessMode?: boolean;
  partnerContext?: PartnerContext;
  partnerId?: string;
  paymentCode?: string;
  quoteId?: string;
  withdrawDetails?: {
    additionalDetails?: Record<string, unknown>;
    cryptoTicker?: string;
    currency?: string;
    paymentCode?: string;
    walletAddress?: string;
  };
}

export interface CreatePayinResponse {
  orderId: string;
  partnerContext?: PartnerContext;
  paymentUrl: string;
  redirectUrl: string;
}

// Create Payin with Wallet (Gaming)
export interface CreatePayinWithWalletRequest {
  currency: string;
  email: string;
  paymentType: string;
  purposeCode: string;
  redirectUrl: string;
  sourceUrl: string;
  amount?: number;
  partnerContext?: PartnerContext;
  partnerId?: string;
  paymentCode?: string;
}

export interface CreatePayinWithWalletResponse {
  orderId: string;
  paymentUrl: string;
  redirectUrl: string;
}

// Get Order Details
export interface GetOrderDetailsRequest {
  orderId: string;
}

export interface OrderFees {
  feeMode: string;
  fixedFee: {
    totalFixedCxFees: number;
    totalFixedFees: number;
    totalFixedTfFees: number;
  };
  processingFee: number;
}

export interface GetOrderDetailsResponse {
  data: {
    depositAmount: number;
    depositCurrency: string;
    fees: OrderFees;
    orderId: string;
    partnerId?: string;
    senderName: {
      firstName: string;
      lastName: string;
    };
    status: string;
    type: string;
    withdrawAmount: number;
    withdrawCurrency: string;
    paymentUrl?: string;
    redirectUrl?: string;
    walletAddress?: string;
  };
  status: string;
}

// Order statuses
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired';

export type OrderType =
  | 'payin'
  | 'payout'
  | 'crypto_payin'
  | 'crypto_payout'
  | 'gaming';

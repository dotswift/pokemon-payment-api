import { PartnerContext } from './common';

// Crypto Payin
export interface CryptoPayinRequest {
  amount: number;
  cryptoTicker: string;
  email: string;
  purposeCode: string;
  partnerContext?: PartnerContext;
  country?: string;
  firstName?: string;
  lastName?: string;
}

export interface CryptoPayinResponse {
  orderId: string;
  walletAddress: string;
}

// Crypto Payout
export interface CryptoPayoutRequest {
  amount: number;
  cryptoTicker: string;
  email: string;
  prefundCurrency: string;
  purposeCode: string;
  walletAddress: string;
  partnerContext?: PartnerContext;
  partnerId?: string;
}

export interface CryptoPayoutResponse {
  orderId: string;
}

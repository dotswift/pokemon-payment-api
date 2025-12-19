import { Direction } from './common';

// Live Rates
export interface LiveRatesRequest {
  currency: string;
}

export interface LiveRatesResponse {
  depositRate: number;
  withdrawRate: number;
}

// Onramp - Fiat to Crypto
export interface OnrampQuoteRequest {
  fiatTicker: string;
  amount: number;
  cryptoTicker: string;
  paymentCode: string;
  direction?: Direction;
}

export interface OnrampQuoteData {
  cryptoPrice: number;
  maxLimit: number;
  minLimit: number;
  networkFee: number;
  processingFee: number;
  receiveAmount: number;
  receiveFiatAmount: number;
  sentAmount: number;
  totalFee: number;
}

export interface OnrampQuoteResponse {
  message: {
    success: boolean;
    data: OnrampQuoteData;
  };
}

// Offramp - Crypto to Fiat
export interface OfframpQuoteRequest {
  fiatTicker: string;
  amount: number;
  cryptoTicker: string;
  baseTicker: 'fiat' | 'crypto';
  direction?: Direction;
  paymentCode?: string;
}

export interface OfframpQuoteData {
  cryptoPrice: number;
  networkFee: number;
  processingFee: number;
  processingFeeDetails?: {
    customerFee: number;
    mode: string;
    transfiFee: number;
  };
  receiveAmount: number;
  receiveFiatAmount: number;
  sentAmount: number;
  totalFee: number;
}

export interface OfframpQuoteResponse {
  message: {
    success: boolean;
    data: OfframpQuoteData;
  };
}

// Payin - Fiat to Stablecoin (Collections)
export interface PayinQuoteRequest {
  amount: number;
  currency: string;
  paymentCode?: string;
  direction?: Direction;
  balanceCurrency?: string;
}

export interface PayinQuoteData {
  exchangeRate: number;
  fees: {
    partnerFee: number;
    processingFee: number;
    totalFee: number;
  };
  fiatAmount: number;
  fiatTicker: string;
  quoteId: string;
  withdrawAmount: number;
}

export interface PayinQuoteResponse {
  data: PayinQuoteData;
  status: string;
}

// Payout - Stablecoin to Fiat
export interface PayoutQuoteRequest {
  amount: number;
  currency: string;
  paymentCode?: string;
  direction?: Direction;
  balanceCurrency?: string;
}

export interface PayoutQuoteData {
  depositAmount: number;
  exchangeRate: number;
  fees: {
    partnerFee: number;
    processingFee: number;
    totalFee: number;
  };
  fiatAmount: number;
  fiatTicker: string;
  quoteId: string;
}

export interface PayoutQuoteResponse {
  data: PayoutQuoteData;
  status: string;
}

// Gaming Rates
export interface GamingRatesRequest {
  amount: number;
  currency: string;
  paymentCode: string;
  direction?: Direction;
}

export interface GamingRatesResponse {
  data: {
    exchangeRate: number;
    fees: {
      partnerFee: number;
      processingFee: number;
      totalFee: number;
    };
    fiatAmount: number;
    fiatTicker: string;
    quoteId: string;
    receiveAmount: number;
  };
  status: string;
}

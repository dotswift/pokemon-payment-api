import { PaymentDirection, PaginatedRequest, UserType } from './common';

// List Currencies
export interface ListCurrenciesRequest extends PaginatedRequest {
  direction: PaymentDirection;
}

export interface CurrencyInfo {
  currency: string;
  logoUrl: string;
}

export interface ListCurrenciesResponse {
  data: CurrencyInfo[];
  pages: number;
  total: number;
  status: string;
}

// List Payment Methods
export interface ListPaymentMethodsRequest extends PaginatedRequest {
  currency: string;
  direction: PaymentDirection;
  headlessMode?: boolean;
  userType?: UserType;
}

export interface PaymentMethodAdditionalDetails {
  accountNumber?: {
    min: number;
    max: number;
    pattern: string;
    type: string;
  };
  bic?: {
    min: number;
    max: number;
    pattern: string;
    type: string;
  };
  phone?: {
    min: number;
    max: number;
    pattern: string;
    type: string;
  };
  phoneCode?: {
    enum: string[];
    type: string;
  };
}

export interface PaymentMethodInfo {
  name: string;
  paymentCode: string;
  paymentType: string;
  logoUrl: string;
  minAmount: number;
  maxAmount: number;
  additionalDetails?: PaymentMethodAdditionalDetails;
}

export interface ListPaymentMethodsResponse {
  data: PaymentMethodInfo[];
  pages: number;
  total: number;
  status: string;
}

// List Tokens
export interface ListTokensRequest extends PaginatedRequest {
  direction?: PaymentDirection;
}

export interface TokenInfo {
  cryptoTicker: string;
  logo: string;
  network: string;
  symbol: string;
}

export interface ListTokensResponse {
  data: TokenInfo[];
  pages: number;
  total: number;
  status: string;
}

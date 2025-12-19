import { Address, DeviceDetails, PartnerContext, UserType } from './common';

// Create Contact
export interface CreateContactRequest {
  type: UserType;
  email: string;
  country: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  date?: string; // DOB or incorporation date
  gender?: string;
  phone?: string;
  regNo?: string;
  address?: Address;
}

export interface CreateContactResponse {
  recipientId: string;
}

// Get Contact
export interface GetContactRequest {
  email: string;
}

export interface GetContactResponse {
  recipientId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  type: string;
  country: string;
  phone?: string;
  address?: Address;
}

// Delete Contact
export interface DeleteContactRequest {
  email: string;
}

export interface DeleteContactResponse {
  message: string;
}

// Create Payout
export interface CreatePayoutRequest {
  amount: number;
  email: string;
  currency: string;
  paymentCode: string;
  purposeCode: string;
  additionalDetails?: Record<string, unknown>;
  deviceDetails?: DeviceDetails;
  balanceCurrency?: string;
  depositDetails?: {
    cryptoTicker?: string;
    sendersWalletAddress?: string;
  };
  partnerContext?: PartnerContext;
  partnerId?: string;
  quoteId?: string;
  sourceUrl?: string;
}

export interface CreatePayoutResponse {
  orderId: string;
  partnerContext?: PartnerContext;
}

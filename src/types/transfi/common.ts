// Common types shared across TransFi API

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
}

export interface DeviceDetails {
  ipInfo: {
    ip: string;
  };
  userAgent: string;
}

export interface PartnerContext {
  [key: string]: string;
}

export interface TransFiErrorResponse {
  code: string;
  message: string;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data?: T[];
  pages: number;
  total: number;
  status?: string;
}

export type Direction = 'forward' | 'reverse';
export type PaymentDirection = 'deposit' | 'withdraw';
export type UserType = 'individual' | 'business';
export type Gender = 'male' | 'female';
export type IdDocType = 'passport' | 'id_card' | 'drivers';

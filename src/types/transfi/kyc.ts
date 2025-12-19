import { IdDocType, Gender } from './common';

// Share KYC With Token
export interface ShareKYCWithTokenRequest {
  email: string;
  name: string;
  token: string;
}

export interface ShareKYCWithTokenResponse {
  email: string;
  status: string;
  userId: string;
  userName: string;
}

// Share KYC Without Token (multipart form data)
export interface ShareKYCWithoutTokenRequest {
  email: string;
  country: string;
  idDocUserName: string;
  idDocType: IdDocType;
  idDocFrontSide: Buffer | string; // Base64 or file
  idDocBackSide?: Buffer | string;
  selfie: Buffer | string;
  gender: Gender;
  phoneNo: string;
  idDocIssuerCountry: string;
  street: string;
  city: string;
  dob: string;
  postalCode: string;
  firstName: string;
  lastName: string;
  userId: string;
  nationality: string;
  idDocExpiryDate?: string;
  state?: string;
}

export interface ShareKYCWithoutTokenResponse {
  email: string;
  status: string;
  userId: string;
}

// Share Additional Documents
export interface ShareAdditionalDocsRequest {
  email: string;
  country: string;
  file: Buffer | string;
  docType: string;
}

export interface ShareAdditionalDocsResponse {
  email: string;
  status: string;
}

// Submit KYC
export interface SubmitKYCRequest {
  email: string;
  redirectUrl: string;
  country: string;
  firstName: string;
  lastName: string;
}

export interface SubmitKYCResponse {
  redirectUrl: string;
  userId: string;
}

// Submit Advanced KYC
export interface SubmitAdvancedKYCRequest {
  email: string;
  redirectUrl: string;
}

export interface SubmitAdvancedKYCResponse {
  redirectUrl: string;
}

// KYC Status
export interface KYCStatusRequest {
  email: string;
}

export interface KYCStatusResponse {
  status: string;
  rejectLabels?: string[];
}

// KYC Status values
export type KYCStatus =
  | 'not_started'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'expired';

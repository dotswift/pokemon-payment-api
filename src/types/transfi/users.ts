import { Address, PaginatedRequest, Gender } from './common';

// Create Individual User
export interface CreateIndividualRequest {
  email: string;
  firstName: string;
  lastName: string;
  date: string; // DOB in yyyy-mm-dd format
  country: string;
  gender?: Gender;
  phone?: string;
  address?: Address;
}

export interface CreateIndividualResponse {
  userId: string;
}

// List Individual Users
export interface ListIndividualsRequest extends PaginatedRequest {
  email?: string;
  userId?: string;
}

export interface IndividualUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  country: string;
  status: string;
  address?: Address;
}

export interface ListIndividualsResponse {
  users: IndividualUser[];
  pages: number;
  total: number;
}

// Create Business User
export interface CreateBusinessRequest {
  email: string;
  businessName: string;
  country: string;
  regNo: string;
  date?: string; // Incorporation date
  phone?: string;
  address?: Address;
}

export interface CreateBusinessResponse {
  userId: string;
}

// List Business Users
export interface ListBusinessRequest extends PaginatedRequest {
  email?: string;
  userId?: string;
}

export interface BusinessUser {
  userId: string;
  email: string;
  businessName: string;
  regNo?: string;
  country: string;
  dob?: string;
  phone?: string;
  status: string;
  address?: Address;
}

export interface ListBusinessResponse {
  users: BusinessUser[];
  pages: number;
  total: number;
}

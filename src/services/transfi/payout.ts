import { transfiClient } from './client';
import {
  CreateContactRequest,
  CreateContactResponse,
  GetContactResponse,
  DeleteContactResponse,
  CreatePayoutRequest,
  CreatePayoutResponse,
} from '../../types/transfi';

export class PayoutService {
  /**
   * Create a payout contact (recipient)
   */
  async createContact(data: CreateContactRequest): Promise<CreateContactResponse> {
    return transfiClient.post<CreateContactResponse>('/v2/payout/contact', data);
  }

  /**
   * Get contact by email
   */
  async getContact(email: string): Promise<GetContactResponse> {
    return transfiClient.get<GetContactResponse>(`/v2/payout/contact/${encodeURIComponent(email)}`);
  }

  /**
   * Delete contact by email
   */
  async deleteContact(email: string): Promise<DeleteContactResponse> {
    return transfiClient.delete<DeleteContactResponse>(`/v2/payout/contact/${encodeURIComponent(email)}`);
  }

  /**
   * Create a payout order
   */
  async createPayout(data: CreatePayoutRequest): Promise<CreatePayoutResponse> {
    return transfiClient.post<CreatePayoutResponse>('/v2/payout/orders', data);
  }
}

export const payoutService = new PayoutService();

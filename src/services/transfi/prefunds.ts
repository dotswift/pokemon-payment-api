import { transfiClient } from './client';
import {
  GetPrefundAddressRequest,
  GetPrefundAddressResponse,
  CreateCryptoPrefundRequest,
  CreateCryptoPrefundResponse,
} from '../../types/transfi';

export class PrefundsService {
  /**
   * Get wallet address for prefunding
   */
  async getWalletAddress(data: GetPrefundAddressRequest): Promise<GetPrefundAddressResponse> {
    return transfiClient.post<GetPrefundAddressResponse>('/v2/prefunds/address', data);
  }

  /**
   * Create a crypto prefund order
   */
  async createPrefund(data: CreateCryptoPrefundRequest): Promise<CreateCryptoPrefundResponse> {
    return transfiClient.post<CreateCryptoPrefundResponse>('/v2/prefunds', data);
  }
}

export const prefundsService = new PrefundsService();

import { transfiClient } from './client';
import { GetBalanceRequest, GetBalanceResponse } from '../../types/transfi';

export class BalanceService {
  /**
   * Get balance for all currencies or a specific currency
   */
  async getBalance(params?: GetBalanceRequest): Promise<GetBalanceResponse> {
    return transfiClient.get<GetBalanceResponse>('/v2/balance', {
      params: params?.currency ? { currency: params.currency } : undefined,
    });
  }
}

export const balanceService = new BalanceService();

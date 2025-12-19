import { transfiClient } from './client';
import {
  CryptoPayinRequest,
  CryptoPayinResponse,
  CryptoPayoutRequest,
  CryptoPayoutResponse,
} from '../../types/transfi';

export class CryptoService {
  /**
   * Create a crypto payin order
   */
  async createPayin(data: CryptoPayinRequest): Promise<CryptoPayinResponse> {
    return transfiClient.post<CryptoPayinResponse>('/v2/crypto/payin', data);
  }

  /**
   * Create a crypto payout order
   */
  async createPayout(data: CryptoPayoutRequest): Promise<CryptoPayoutResponse> {
    return transfiClient.post<CryptoPayoutResponse>('/v2/crypto/payout', data);
  }
}

export const cryptoService = new CryptoService();

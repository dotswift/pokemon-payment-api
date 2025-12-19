import { transfiClient } from './client';
import {
  ShareKYCWithTokenRequest,
  ShareKYCWithTokenResponse,
  SubmitKYCRequest,
  SubmitKYCResponse,
  SubmitAdvancedKYCRequest,
  SubmitAdvancedKYCResponse,
  KYCStatusRequest,
  KYCStatusResponse,
} from '../../types/transfi';

export class KYCService {
  /**
   * Share KYC with existing token from another provider
   */
  async shareWithToken(data: ShareKYCWithTokenRequest): Promise<ShareKYCWithTokenResponse> {
    return transfiClient.post<ShareKYCWithTokenResponse>('/v2/kyc/share', data);
  }

  /**
   * Submit standard KYC - returns redirect URL for user to complete
   */
  async submitKYC(data: SubmitKYCRequest): Promise<SubmitKYCResponse> {
    return transfiClient.post<SubmitKYCResponse>('/v2/kyc/submit', data);
  }

  /**
   * Submit advanced KYC - returns redirect URL for user to complete
   */
  async submitAdvancedKYC(data: SubmitAdvancedKYCRequest): Promise<SubmitAdvancedKYCResponse> {
    return transfiClient.post<SubmitAdvancedKYCResponse>('/v2/kyc/advanced', data);
  }

  /**
   * Get KYC status for a user
   */
  async getStatus(params: KYCStatusRequest): Promise<KYCStatusResponse> {
    return transfiClient.get<KYCStatusResponse>('/v2/kyc/status', {
      params: { email: params.email },
    });
  }
}

export const kycService = new KYCService();

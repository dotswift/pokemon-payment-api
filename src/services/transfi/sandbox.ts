import { transfiClient } from './client';
import {
  CreateSandboxPrefundRequest,
  CreateSandboxPrefundResponse,
} from '../../types/transfi';

export class SandboxService {
  /**
   * Create a sandbox prefund (for testing)
   */
  async createPrefund(data: CreateSandboxPrefundRequest): Promise<CreateSandboxPrefundResponse> {
    return transfiClient.post<CreateSandboxPrefundResponse>('/v2/sandbox/prefunds/create-prefund', data);
  }
}

export const sandboxService = new SandboxService();

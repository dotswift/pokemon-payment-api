// Create Sandbox Prefund
export interface CreateSandboxPrefundRequest {
  currency: string;
  amount: number;
  partnerId?: string;
}

export interface CreateSandboxPrefundResponse {
  orderId: string;
}

// Get Balance
export interface GetBalanceRequest {
  currency?: string;
}

export interface BalanceInfo {
  currency: string;
  totalCollectionsAmount: number;
  totalPayoutAmount: number;
  totalPayoutFee: number;
  totalPayoutInTransitBalance: number;
  totalSettledAmount: number;
  totalUnsettledAmount: number;
}

export interface GetBalanceResponse {
  balance: BalanceInfo[];
}

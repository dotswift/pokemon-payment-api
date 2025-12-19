// Get Prefund Wallet Address
export interface GetPrefundAddressRequest {
  cryptoTicker: string;
}

export interface GetPrefundAddressResponse {
  walletAddress: string;
}

// Create Crypto Prefund
export interface CreateCryptoPrefundRequest {
  cryptoTicker: string;
  amount: number;
  sendersWalletAddress: string;
  partnerId?: string;
  balanceCurrency?: string;
}

export interface CreateCryptoPrefundResponse {
  orderId: string;
  walletAddress: string;
}

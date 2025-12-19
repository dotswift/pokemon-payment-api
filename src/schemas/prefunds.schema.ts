import { z } from 'zod';

export const getPrefundAddressSchema = z.object({
  cryptoTicker: z.string().min(1),
});

export const createCryptoPrefundSchema = z.object({
  cryptoTicker: z.string().min(1),
  amount: z.number().positive(),
  sendersWalletAddress: z.string().min(1),
  partnerId: z.string().optional(),
  balanceCurrency: z.string().optional(),
});

export type GetPrefundAddressInput = z.infer<typeof getPrefundAddressSchema>;
export type CreateCryptoPrefundInput = z.infer<typeof createCryptoPrefundSchema>;

import { z } from 'zod';

const partnerContextSchema = z.record(z.string()).optional();

export const cryptoPayinSchema = z.object({
  amount: z.number().positive(),
  cryptoTicker: z.string().min(1),
  email: z.string().email(),
  purposeCode: z.string().min(1),
  partnerContext: partnerContextSchema,
  country: z.string().length(2).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const cryptoPayoutSchema = z.object({
  amount: z.number().positive(),
  cryptoTicker: z.string().min(1),
  email: z.string().email(),
  prefundCurrency: z.string().min(1),
  purposeCode: z.string().min(1),
  walletAddress: z.string().min(1),
  partnerContext: partnerContextSchema,
  partnerId: z.string().optional(),
});

export type CryptoPayinInput = z.infer<typeof cryptoPayinSchema>;
export type CryptoPayoutInput = z.infer<typeof cryptoPayoutSchema>;

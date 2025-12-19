import { z } from 'zod';

const deviceDetailsSchema = z.object({
  ipInfo: z.object({
    ip: z.string(),
  }),
  userAgent: z.string(),
}).optional();

const partnerContextSchema = z.record(z.string()).optional();

export const createPayinSchema = z.object({
  amount: z.number().positive(),
  country: z.string().length(2),
  currency: z.string().min(2).max(5),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  paymentType: z.string().min(1),
  purposeCode: z.string().min(1),
  redirectUrl: z.string().url(),
  sourceUrl: z.string().url(),
  balanceCurrency: z.string().optional(),
  additionalDetails: z.object({
    accountNumber: z.string().optional(),
    bic: z.string().optional(),
    phone: z.string().optional(),
    phoneCode: z.string().optional(),
  }).optional(),
  deviceDetails: deviceDetailsSchema,
  headlessMode: z.boolean().optional(),
  partnerContext: partnerContextSchema,
  partnerId: z.string().optional(),
  paymentCode: z.string().optional(),
  quoteId: z.string().optional(),
  withdrawDetails: z.object({
    additionalDetails: z.record(z.unknown()).optional(),
    cryptoTicker: z.string().optional(),
    currency: z.string().optional(),
    paymentCode: z.string().optional(),
    walletAddress: z.string().optional(),
  }).optional(),
});

export const createPayinWithWalletSchema = z.object({
  currency: z.string().min(2).max(5),
  email: z.string().email(),
  paymentType: z.string().min(1),
  purposeCode: z.string().min(1),
  redirectUrl: z.string().url(),
  sourceUrl: z.string().url(),
  amount: z.number().positive().optional(),
  partnerContext: partnerContextSchema,
  partnerId: z.string().optional(),
  paymentCode: z.string().optional(),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1),
});

export type CreatePayinInput = z.infer<typeof createPayinSchema>;
export type CreatePayinWithWalletInput = z.infer<typeof createPayinWithWalletSchema>;

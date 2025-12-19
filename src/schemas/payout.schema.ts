import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
}).optional();

const deviceDetailsSchema = z.object({
  ipInfo: z.object({
    ip: z.string(),
  }),
  userAgent: z.string(),
}).optional();

const partnerContextSchema = z.record(z.string()).optional();

export const createContactSchema = z.object({
  type: z.enum(['individual', 'business']),
  email: z.string().email(),
  country: z.string().length(2),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  businessName: z.string().optional(),
  date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/).optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  regNo: z.string().optional(),
  address: addressSchema,
});

export const emailParamSchema = z.object({
  email: z.string().email(),
});

export const createPayoutSchema = z.object({
  amount: z.number().positive(),
  email: z.string().email(),
  currency: z.string().min(2).max(5),
  paymentCode: z.string().min(1),
  purposeCode: z.string().min(1),
  additionalDetails: z.record(z.unknown()).optional(),
  deviceDetails: deviceDetailsSchema,
  balanceCurrency: z.string().optional(),
  depositDetails: z.object({
    cryptoTicker: z.string().optional(),
    sendersWalletAddress: z.string().optional(),
  }).optional(),
  partnerContext: partnerContextSchema,
  partnerId: z.string().optional(),
  quoteId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;

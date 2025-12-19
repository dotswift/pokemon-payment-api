import { z } from 'zod';

export const shareKYCWithTokenSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  token: z.string().min(1, 'Token is required'),
});

export const submitKYCSchema = z.object({
  email: z.string().email('Invalid email address'),
  redirectUrl: z.string().url('Invalid redirect URL'),
  country: z.string().length(2, 'Country must be a 2-letter ISO code'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export const submitAdvancedKYCSchema = z.object({
  email: z.string().email('Invalid email address'),
  redirectUrl: z.string().url('Invalid redirect URL'),
});

export const kycStatusQuerySchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ShareKYCWithTokenInput = z.infer<typeof shareKYCWithTokenSchema>;
export type SubmitKYCInput = z.infer<typeof submitKYCSchema>;
export type SubmitAdvancedKYCInput = z.infer<typeof submitAdvancedKYCSchema>;

import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
}).optional();

export const createIndividualSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be in DD-MM-YYYY format'),
  country: z.string().length(2, 'Country must be a 2-letter ISO code'),
  gender: z.enum(['male', 'female']).optional(),
  phone: z.string().optional(),
  address: addressSchema,
});

export const listIndividualsQuerySchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const createBusinessSchema = z.object({
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  country: z.string().length(2, 'Country must be a 2-letter ISO code'),
  regNo: z.string().min(1, 'Registration number is required'),
  date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be in DD-MM-YYYY format').optional(),
  phone: z.string().optional(),
  address: addressSchema,
});

export const listBusinessQuerySchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type CreateIndividualInput = z.infer<typeof createIndividualSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

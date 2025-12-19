import { z } from 'zod';

export const createSandboxPrefundSchema = z.object({
  currency: z.string().min(2).max(5),
  amount: z.number().positive(),
  partnerId: z.string().optional(),
});

export type CreateSandboxPrefundInput = z.infer<typeof createSandboxPrefundSchema>;

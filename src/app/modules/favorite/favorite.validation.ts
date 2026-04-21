import { z } from 'zod';

const createSchema = z.object({
  params: z.object({
    businessId: z.string().min(1, 'Business ID is required'),
  }),
});

export const favoriteValidation = {
createSchema,
};
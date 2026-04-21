import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Service name is required'),
    businessId: z.string().min(1, 'Business ID is required'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be a positive number').optional(),
    duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
    categoryId: z.string().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    duration: z.number().optional(),
    categoryId: z.string().optional(),
  }),
});

export const serviceValidation = {
createSchema,
updateSchema,
};
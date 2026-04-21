import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required'),
    icon: z.string().optional(),
    description: z.string().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    icon: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const categoryValidation = {
createSchema,
updateSchema,
};
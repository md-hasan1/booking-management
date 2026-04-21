import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    businessId: z.string().min(1, 'Business ID is required'),
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    expertise: z.array(z.string()).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    expertise: z.array(z.string()).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

export const specialistValidation = {
createSchema,
updateSchema,
};
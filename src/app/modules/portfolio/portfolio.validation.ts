import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    specialistId: z.string().min(1, 'Specialist ID is required'),
    title: z.string().min(1, 'Portfolio title is required'),
    description: z.string().optional(),
    projectUrl: z.string().url().optional(),
    completionDate: z.string().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    projectUrl: z.string().url().optional(),
    completionDate: z.string().optional(),
  }),
});

export const portfolioValidation = {
createSchema,
updateSchema,
};
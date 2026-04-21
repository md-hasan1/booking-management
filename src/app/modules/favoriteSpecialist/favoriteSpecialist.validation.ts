import { z } from 'zod';

const createSchema = z.object({
  params: z.object({
    specialistId: z.string().min(1, 'Specialist ID is required'),
  }),
});

export const favoriteSpecialistValidation = {
createSchema,
};
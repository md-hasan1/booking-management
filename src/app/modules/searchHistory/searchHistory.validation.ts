import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    searchQuery: z.string().min(1, 'Search query is required'),
    filters: z.object({
      categoryId: z.string().optional(),
      specialistId: z.string().optional(),
      dateRange: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
});

export const searchHistoryValidation = {
createSchema,
};
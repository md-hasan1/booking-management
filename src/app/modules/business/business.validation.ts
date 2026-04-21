import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Business name is required'),
    categoryId: z.string().min(1, 'Category ID is required'),
    subCategoryId: z.string().min(1, 'SubCategory ID is required'),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    address: z.string().optional(),
    openingHours: z.string().optional(),
    closingHours: z.string().optional(),
    workingTime: z.array(z.object({
      day: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      isOpen: z.boolean().optional(),
    })).min(1, 'At least one working time entry is required'),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    address: z.string().optional(),
    openingHours: z.string().optional(),
    closingHours: z.string().optional(),
  }),
});

export const businessValidation = {
createSchema,
updateSchema,
};
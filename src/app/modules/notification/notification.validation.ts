import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    body: z.string().min(1, 'Body is required'),
    userId: z.string().min(1, 'User ID is required'),
    deviceToken: z.string().optional(),
    data: z.object({
      serviceName: z.string().optional(),
      specialist: z.string().optional(),
      timeSlot: z.string().optional(),
      selectedDate: z.string().optional(),
      servicePrice: z.string().optional(),
      status: z.string().optional(),
    }).optional(),
  }),
});

const createGroupSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    body: z.string().min(1, 'Body is required'),
    users: z.array(z.string()).min(1, 'At least one user ID is required'),
    data: z.object({
      serviceName: z.string().optional(),
      specialist: z.string().optional(),
      timeSlot: z.string().optional(),
      selectedDate: z.string().optional(),
      servicePrice: z.string().optional(),
      status: z.string().optional(),
    }).optional(),
  }),
});

export const notificationValidation = {
  createSchema,
  createGroupSchema,
};
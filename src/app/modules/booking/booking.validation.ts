import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    serviceId: z.string().min(1, 'Service ID is required'),
    specialistId: z.string().min(1, 'Specialist ID is required'),
    startTime: z.string().refine((date) => new Date(date) > new Date(), 'Start time must be in the future'),
    endTime: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    serviceId: z.string().optional(),
    specialistId: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const statusChangeSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Booking ID is required'),
  }),
  body: z.object({
    bookingStatus: z.string().min(1, 'Booking status is required'),
  }),
});

export const bookingValidation = {
createSchema,
updateSchema,
statusChangeSchema,
};
import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    specialistId: z.string().min(1, 'Specialist ID is required'),
    rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
    comment: z.string().min(1, 'Comment is required'),
  }),
});

export const reviewValidation = {
createSchema,
};
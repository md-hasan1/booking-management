import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    subscriptionOfferId: z.string().min(1, 'Subscription Offer ID is required'),
    paymentMethodId: z.string().optional(),
  }),
});

export const userSubscriptionValidation = {
createSchema,
};
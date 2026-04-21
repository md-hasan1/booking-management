import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { reviewController } from './review.controller';
import { reviewValidation } from './review.validation';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.post(
'/',
auth(UserRole.USER),
validateRequest(reviewValidation.createSchema),
reviewController.createReview,
);

router.get('/business/:businessId', auth(), reviewController.getReviewList);

router.get('/specialist/:specialistId', auth(), reviewController.getReviewListForSpecialist);

router.get('/:id', auth(), reviewController.getReviewById);

export const reviewRoutes = router;
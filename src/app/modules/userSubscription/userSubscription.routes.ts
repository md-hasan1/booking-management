import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { userSubscriptionController } from './userSubscription.controller';
import { userSubscriptionValidation } from './userSubscription.validation';

const router = express.Router();

router.post(
'/',
auth(),
validateRequest(userSubscriptionValidation.createSchema),
userSubscriptionController.createUserSubscription,
);

router.get('/', auth(), userSubscriptionController.getUserSubscriptionList);

router.get('/admin', auth(), userSubscriptionController.getUserSubscriptionListByAdmin);

router.get('/:id', auth(), userSubscriptionController.getUserSubscriptionById);


export const userSubscriptionRoutes = router;
// Notification.routes: Module file for the Notification.routes functionality.
import express from 'express';
import { NotificationController } from './notification.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { notificationValidation } from './notification.validation';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.post('/send', validateRequest(notificationValidation.createSchema), NotificationController.sendNotificationToUser);


router.post(
    '/send-group',
    auth(UserRole.ADMIN),
    validateRequest(notificationValidation.createGroupSchema),
    NotificationController.sendNotificationToUserGroup,
)


// Get all notifications
router.get('/',auth(), NotificationController.getAllNotificationsController);

// Get notifications by user ID
router.get('/get',auth(), NotificationController.getNotificationByUserIdController);

// Mark notifications as read by user ID
router.patch('/read',auth(), NotificationController.readNotificationByUserIdController);
export const NotificationRoutes = router;
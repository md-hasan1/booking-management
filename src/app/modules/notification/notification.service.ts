// Notification.service: Module file for the Notification.service functionality.

import admin from '../../../shared/firebase';
import prisma from '../../../shared/prisma';
import { DateTime } from 'luxon';
import { timezoneHelper } from '../../../helpars/timezoneHelper';

export const sendNotification = async (
  title: string,
  body: string,
  userId: string,
  deviceToken?: string,
  notificationData?: {
    serviceName?: string;
    specialist?: string;
    timeSlot?: string;
    selectedDate?: string;
    servicePrice?: string;
    status?: string;
    [key: string]: any;
  },
) => {
  let message;
  
  // If no deviceToken provided, fetch it from the database
  let tokenToUse = deviceToken;
  if (!tokenToUse) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    tokenToUse = user?.fcmToken || undefined;
  }
  
  // Create message if we have a token
  if (tokenToUse) {
    message = {
      notification: { title, body },
      token: tokenToUse,
    };
    console.log('FCM message:', message);
  }

  try {
    // Send FCM notification if message exists
    if (message) {
      const response = await admin.messaging().send(message);
      console.log('FCM notification sent successfully:', response);
    } else {
      console.warn(`No FCM token available for user ${userId}`);
    }

    // Always create database record with data field
    const dataToStore = notificationData ? JSON.parse(JSON.stringify(notificationData)) : null;
    await prisma.notification.create({
      data: {
        title,
        body,
        userId,
        ...(dataToStore && { data: dataToStore }),
      },
    });
    console.log('Notification stored in database successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};
const getAllNotifications = async () => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' }});
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

const getNotificationByUserId = async (userId: string) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications by user ID:', error);
    throw error;
  }
};

const readNotificationByUserId = async (userId: string) => {
  try {
    const notifications = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return notifications;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

const sendNotificationToGroupIntoDb = async (notificationData: { 
  title: string,
  body: string,
  users: string[],
  data?: {
    serviceName?: string;
    specialist?: string;
    timeSlot?: string;
    selectedDate?: string;
    servicePrice?: string;
    status?: string;
    [key: string]: any;
  }
}) => {
  const { title, body, users, data } = notificationData;
  const dataToStore = data ? JSON.parse(JSON.stringify(data)) : null;

  const notifications = users.map(async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (user?.fcmToken) {
      const message = {
        notification: { title, body },
        token: user.fcmToken,
      };

      try {
        await admin.messaging().send(message);
      } catch (error) {
        // Log the error but do not throw, so other notifications proceed
        console.error(`FCM error for user ${userId}:`, error);
      }
    }

    return prisma.notification.create({
      data: {
        title,
        body,
        userId,
        ...(dataToStore && { data: dataToStore }),
      },
    });
  });

  await Promise.all(notifications);
  return { message: "Notifications sent successfully" };
};

export const notificationService = {
  sendNotification,
  getAllNotifications,
  getNotificationByUserId,
  readNotificationByUserId,
  sendNotificationToGroupIntoDb,
};

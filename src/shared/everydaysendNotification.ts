import admin from "./firebase";
import prisma from "./prisma";
import { DateTime } from "luxon";
import { timezoneHelper } from "../helpars/timezoneHelper";

// ✅ DAILY MORNING NOTIFICATION at 8:00 AM
// Based on: bookingDate (which day) and timeSlot.startTime (appointment timing)
export const sendNotificationDailyMorning = async () => {
  const zone = "Africa/Johannesburg";
  const now = DateTime.now().setZone(zone);
  
  // ✅ Send ONLY at 8:00 AM local time
  if (now.hour !== 8 || now.minute !== 0) return;

  // ✅ Get today's date range based on bookingDate field
  const startOfToday = now.startOf("day").toJSDate();
  const endOfToday = now.endOf("day").toJSDate();

  // Fetch all businesses and filter their TODAY's bookings
  const businesses = await prisma.business.findMany({
    where: {
      isDeleted: false,
    },
    
    include: {
      user: true,
      bookings: {
        where: {
        
          bookingDate: { gte: startOfToday, lte: endOfToday },
          isDeleted: false,
          bookingStatus: 'PENDING',
        },
        include: {
          service: true,
          specialist: {
            select: { fullName: true },
          },
          timeSlot: {
            where: { isDeleted: false },
            orderBy: { startTime: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  for (const business of businesses) {
    if (business.bookings.length === 0) continue;

    const booking = business.bookings[0]; // First booking of today
    const slot = booking.timeSlot[0];

    if (!slot) continue;

    // ✅ Check if notification already sent today
    const alreadySent = await prisma.notification.findFirst({
      where: {
        userId: business.userId,
        title: "Today's First Booking",
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    if (alreadySent) continue;

    // ✅ Extract appointment time from timeSlot.startTime
    const appointmentTime = DateTime.fromJSDate(slot.startTime)
      .setZone(timezoneHelper.BUSINESS_TIMEZONE)
      .toFormat("HH:mm");

    const title = "Today's First Booking";
    const body = `Your first booking is at ${appointmentTime} for ${booking.service.name}.`;

    // ✅ Create notification record in database
    const notifData = {
      serviceName: booking.service.name,
      specialist: booking.specialist?.fullName || 'Not assigned',
      timeSlot: appointmentTime,
      selectedDate: DateTime.fromJSDate(booking.bookingDate).setZone(timezoneHelper.BUSINESS_TIMEZONE).toFormat('dd/MM/yyyy'),
      servicePrice: booking.service.price?.toString() || '0',
      status: booking.bookingStatus,
    };
    await prisma.notification.create({
      data: {
        userId: business.userId,
        title,
        body,
        data: JSON.parse(JSON.stringify(notifData)),
      },
    });

    // ✅ Send FCM push notification
    if (business.user.fcmToken) {
      try {
        await admin.messaging().send({
          token: business.user.fcmToken,
          notification: { title, body },
        });
        console.log(
          `✓ Daily morning notification sent to user ${business.userId}: appointment at ${appointmentTime}`
        );
      } catch (error) {
        console.error(
          `✗ Failed to send daily notification to user ${business.userId}:`,
          error
        );
      }
    }
  }
};

// ✅ APPOINTMENT REMINDERS: 24-hour and 2-hour before
// Based on: bookingDate (which day) THEN timeSlot.startTime (appointment time) vs current time
export const sendReminderNotifications = async () => {
  try {
    const zone = 'Africa/Johannesburg';
    const now = DateTime.now().setZone(zone);
    
    // ✅ STEP 1: Filter by bookingDate - get today and future bookings only
    const startOfToday = now.startOf("day").toJSDate();
    
    // ✅ Fetch all PENDING bookings where bookingDate is TODAY or in FUTURE
    const bookings = await prisma.booking.findMany({
      where: {
        isDeleted: false,
        bookingStatus: 'PENDING',
        // ✅ First filter: bookingDate must be today or in the future
        bookingDate: { gte: startOfToday },
      },
      include: {
        user: true,
        service: true,
        specialist: {
          select: { fullName: true },
        },
        // ✅ STEP 2: Get timeSlot with startTime to calculate reminder timing
        timeSlot: {
          where: { isDeleted: false },
          orderBy: { startTime: 'asc' },
          take: 1,
        },
      },
    });

    // Process each booking to check for reminder triggers
    for (const booking of bookings) {
      if (booking.timeSlot.length === 0) continue;

      // ✅ STEP 2: Get the appointment time from timeSlot.startTime
      const appointmentDateTime = DateTime.fromJSDate(
        booking.timeSlot[0].startTime
      ).setZone(zone);

      // ✅ Format appointment time once (Africa/Johannesburg timezone)
      const appointmentTimeFormatted = appointmentDateTime.toFormat('HH:mm');

      // ✅ Calculate how many minutes until the appointment
      const minutesUntilAppointment = appointmentDateTime
        .diff(now, 'minutes')
        .minutes;

      // ✅ 24-HOUR REMINDER
      // Trigger when appointment is 1435-1445 minutes away (24 hours ±5 minutes)
      if (minutesUntilAppointment >= 1435 && minutesUntilAppointment <= 1445) {
        // Check if reminder already sent in past 10 minutes
        const reminderSent = await prisma.notification.findFirst({
          where: {
            userId: booking.userId,
            title: 'Appointment Reminder - 24 Hours',
            createdAt: {
              gte: now.minus({ minutes: 10 }).toJSDate(),
            },
          },
        });

        if (!reminderSent) {
          const title = 'Appointment Reminder - 24 Hours';
          const body = `Your appointment for ${booking.service.name} is coming up in 24 hours at ${appointmentTimeFormatted}.`;

          // ✅ Create notification record
          const remindData = {
            serviceName: booking.service.name,
            specialist: booking.specialist?.fullName || 'Not assigned',
            timeSlot: appointmentTimeFormatted,
            selectedDate: DateTime.fromJSDate(booking.bookingDate).setZone(zone).toFormat('dd/MM/yyyy'),
            servicePrice: booking.service.price?.toString() || '0',
            status: booking.bookingStatus,
          };
          await prisma.notification.create({
            data: {
              userId: booking.userId,
              title,
              body,
              data: JSON.parse(JSON.stringify(remindData)),
            },
          });

          // ✅ Send FCM push notification
          if (booking.user.fcmToken) {
            try {
              await admin.messaging().send({
                token: booking.user.fcmToken,
                notification: { title, body },
              });
              console.log(
                `✓ 24h reminder sent to user ${booking.userId} for appointment at ${appointmentTimeFormatted}`
              );
            } catch (error) {
              console.error(
                `✗ Failed to send 24h reminder to user ${booking.userId}:`,
                error
              );
            }
          }
        }
      }

      // ✅ 23.5-HOUR REMINDER
      // Trigger when appointment is 1405-1415 minutes away (23.5 hours ±5 minutes)
      // if (minutesUntilAppointment >= 1405 && minutesUntilAppointment <= 1415) {
      //   // Check if reminder already sent in past 10 minutes
      //   const reminderSent = await prisma.notification.findFirst({
      //     where: {
      //       userId: booking.userId,
      //       title: 'Appointment Reminder - 23.5 Hours',
      //       createdAt: {
      //         gte: now.minus({ minutes: 10 }).toJSDate(),
      //       },
      //     },
      //   });

      //   if (!reminderSent) {
      //     const appointmentTime = appointmentDateTime.toFormat('hh:mm A');
      //     const title = 'Appointment Reminder - 23.5 Hours';
      //     const body = `Your appointment for ${booking.service.name} is coming up in 23.5 hours at ${appointmentTime}.`;

      //     // ✅ Create notification record
      //     await prisma.notification.create({
      //       data: {
      //         userId: booking.userId,
      //         title,
      //         body,
      //       },
      //     });

      //     // ✅ Send FCM push notification
      //     if (booking.user.fcmToken) {
      //       try {
      //         await admin.messaging().send({
      //           token: booking.user.fcmToken,
      //           notification: { title, body },
      //         });
      //         console.log(
      //           `✓ 23.5h reminder sent to user ${booking.userId} for appointment at ${appointmentTime}`
      //         );
      //       } catch (error) {
      //         console.error(
      //           `✗ Failed to send 23.5h reminder to user ${booking.userId}:`,
      //           error
      //         );
      //       }
      //     }
      //   }
      // }

      // ✅ 2-HOUR REMINDER
      // Trigger when appointment is 115-125 minutes away (2 hours ±5 minutes)
      if (minutesUntilAppointment >= 115 && minutesUntilAppointment <= 125) {
        // Check if reminder already sent in past 10 minutes
        const reminderSent = await prisma.notification.findFirst({
          where: {
            userId: booking.userId,
            title: 'Appointment Reminder - 2 Hours',
            createdAt: {
              gte: now.minus({ minutes: 10 }).toJSDate(),
            },
          },
        });

        if (!reminderSent) {
          const title = 'Appointment Reminder - 2 Hours';
          const body = `Your appointment for ${booking.service.name} starts in 2 hours at ${appointmentTimeFormatted}.`;

          // ✅ Create notification record
          const twoHourData = {
            serviceName: booking.service.name,
            specialist: booking.specialist?.fullName || 'Not assigned',
            timeSlot: appointmentTimeFormatted,
            selectedDate: DateTime.fromJSDate(booking.bookingDate).setZone(zone).toFormat('dd/MM/yyyy'),
            servicePrice: booking.service.price?.toString() || '0',
            status: booking.bookingStatus,
          };
          await prisma.notification.create({
            data: {
              userId: booking.userId,
              title,
              body,
              data: JSON.parse(JSON.stringify(twoHourData)),
            },
          });

          // ✅ Send FCM push notification
          if (booking.user.fcmToken) {
            try {
              await admin.messaging().send({
                token: booking.user.fcmToken,
                notification: { title, body },
              });
              console.log(
                `✓ 2h reminder sent to user ${booking.userId} for appointment at ${appointmentTimeFormatted}`
              );
            } catch (error) {
              console.error(
                `✗ Failed to send 2h reminder to user ${booking.userId}:`,
                error
              );
            }
          }
        }
      }
    }

    console.log(
      `✓ Reminder check completed at ${now.toFormat('yyyy-MM-dd HH:mm:ss')} (${zone})`
    );
  } catch (error) {
    console.error('✗ Error in sendReminderNotifications:', error);
  }
};
// export const sendNotificationDailyMorning = async () => {
//   const zone = "Africa/Johannesburg";
//   const now = DateTime.now().setZone(zone);
  
//   // ✅ Send ONLY at 8:00 AM local time
//   if (now.hour !== 8 || now.minute !== 0) return;

//   // ✅ Get today's date range based on bookingDate field
//   const startOfToday = now.startOf("day").toJSDate();
//   const endOfToday = now.endOf("day").toJSDate();

//   // Fetch all businesses and filter their TODAY's bookings
//   const businesses = await prisma.business.findMany({
//     where: {
//       isDeleted: false,
//     },
//     include: {
//       user: true,
//       bookings: {
//         where: {
//           // ✅ Filter by bookingDate: only today's bookings
//           bookingDate: { gte: startOfToday, lte: endOfToday },
//           isDeleted: false,
//           bookingStatus: 'PENDING',
//         },
//         include: {
//           service: true,
//           // ✅ Get timeSlot with startTime to show appointment timing
//           timeSlot: {
//             where: { isDeleted: false },
//             orderBy: { startTime: "asc" },
//             take: 1,
//           },
//         },
//       },
//     },
//   });

//   for (const business of businesses) {
//     if (business.bookings.length === 0) continue;

//     const booking = business.bookings[0]; // First booking of today
//     const slot = booking.timeSlot[0];

//     if (!slot) continue;

//     // ✅ Check if notification already sent today
//     const alreadySent = await prisma.notification.findFirst({
//       where: {
//         userId: business.userId,
//         title: "Today's First Booking",
//         createdAt: {
//           gte: startOfToday,
//         },
//       },
//     });

//     if (alreadySent) continue;

//     // ✅ Extract appointment time from timeSlot.startTime
//     const appointmentTime = DateTime.fromJSDate(slot.startTime)
//       .setZone(zone)
//       .toFormat("hh:mm A");

//     const title = "Today's First Booking";
//     const body = `Your first booking is at ${appointmentTime} for ${booking.service.name}.`;

//     // ✅ Create notification record in database
//     await prisma.notification.create({
//       data: {
//         userId: business.userId,
//         title,
//         body,
//       },
//     });

//     // ✅ Send FCM push notification
//     if (business.user.fcmToken) {
//       try {
//         await admin.messaging().send({
//           token: business.user.fcmToken,
//           notification: { title, body },
//         });
//         console.log(
//           `✓ Daily morning notification sent to user ${business.userId}: appointment at ${appointmentTime}`
//         );
//       } catch (error) {
//         console.error(
//           `✗ Failed to send daily notification to user ${business.userId}:`,
//           error
//         );
//       }
//     }
//   }
// };

// // ✅ APPOINTMENT REMINDERS: 24-hour and 2-hour before
// // Based on: bookingDate (which day) THEN timeSlot.startTime (appointment time) vs current time
// export const sendReminderNotifications = async () => {
//   try {
//     const zone = 'Africa/Johannesburg';
//     const now = DateTime.now().setZone(zone);
    
//     // ✅ STEP 1: Filter by bookingDate - get today and future bookings only
//     const startOfToday = now.startOf("day").toJSDate();
    
//     // ✅ Fetch all PENDING bookings where bookingDate is TODAY or in FUTURE
//     const bookings = await prisma.booking.findMany({
//       where: {
//         isDeleted: false,
//         bookingStatus: 'PENDING',
//         // ✅ First filter: bookingDate must be today or in the future
//         bookingDate: { gte: startOfToday },
//       },
//       include: {
//         user: true,
//         service: true,
//         // ✅ STEP 2: Get timeSlot with startTime to calculate reminder timing
//         timeSlot: {
//           where: { isDeleted: false },
//           orderBy: { startTime: 'asc' },
//           take: 1,
//         },
//       },
//     });

//     // Process each booking to check for reminder triggers
//     for (const booking of bookings) {
//       if (booking.timeSlot.length === 0) continue;

//       // ✅ STEP 2: Get the appointment time from timeSlot.startTime
//       const appointmentDateTime = DateTime.fromJSDate(
//         booking.timeSlot[0].startTime
//       ).setZone(zone);

//       // ✅ Calculate how many minutes until the appointment
//       const minutesUntilAppointment = appointmentDateTime
//         .diff(now, 'minutes')
//         .minutes;

//       // ✅ 24-HOUR REMINDER
//       // Trigger when appointment is 1435-1445 minutes away (24 hours ±5 minutes)
//       if (minutesUntilAppointment >= 1435 && minutesUntilAppointment <= 1445) {
//         // Check if reminder already sent in past 10 minutes
//         const reminderSent = await prisma.notification.findFirst({
//           where: {
//             userId: booking.userId,
//             title: 'Appointment Reminder - 24 Hours',
//             createdAt: {
//               gte: now.minus({ minutes: 10 }).toJSDate(),
//             },
//           },
//         });

//         if (!reminderSent) {
//           const appointmentTime = appointmentDateTime.toFormat('hh:mm A');
//           const title = 'Appointment Reminder - 24 Hours';
//           const body = `Your appointment for ${booking.service.name} is coming up in 24 hours at ${appointmentTime}.`;

//           // ✅ Create notification record
//           await prisma.notification.create({
//             data: {
//               userId: booking.userId,
//               title,
//               body,
//             },
//           });

//           // ✅ Send FCM push notification
//           if (booking.user.fcmToken) {
//             try {
//               await admin.messaging().send({
//                 token: booking.user.fcmToken,
//                 notification: { title, body },
//               });
//               console.log(
//                 `✓ 24h reminder sent to user ${booking.userId} for appointment at ${appointmentTime}`
//               );
//             } catch (error) {
//               console.error(
//                 `✗ Failed to send 24h reminder to user ${booking.userId}:`,
//                 error
//               );
//             }
//           }
//         }
//       }

//       // ✅ 2-HOUR REMINDER
//       // Trigger when appointment is 115-125 minutes away (2 hours ±5 minutes)
//       if (minutesUntilAppointment >= 115 && minutesUntilAppointment <= 125) {
//         // Check if reminder already sent in past 10 minutes
//         const reminderSent = await prisma.notification.findFirst({
//           where: {
//             userId: booking.userId,
//             title: 'Appointment Reminder - 2 Hours',
//             createdAt: {
//               gte: now.minus({ minutes: 10 }).toJSDate(),
//             },
//           },
//         });

//         if (!reminderSent) {
//           const appointmentTime = appointmentDateTime.toFormat('hh:mm A');
//           const title = 'Appointment Reminder - 2 Hours';
//           const body = `Your appointment for ${booking.service.name} starts in 2 hours at ${appointmentTime}.`;

//           // ✅ Create notification record
//           await prisma.notification.create({
//             data: {
//               userId: booking.userId,
//               title,
//               body,
//             },
//           });

//           // ✅ Send FCM push notification
//           if (booking.user.fcmToken) {
//             try {
//               await admin.messaging().send({
//                 token: booking.user.fcmToken,
//                 notification: { title, body },
//               });
//               console.log(
//                 `✓ 2h reminder sent to user ${booking.userId} for appointment at ${appointmentTime}`
//               );
//             } catch (error) {
//               console.error(
//                 `✗ Failed to send 2h reminder to user ${booking.userId}:`,
//                 error
//               );
//             }
//           }
//         }
//       }
//     }

//     console.log(
//       `✓ Reminder check completed at ${now.toFormat('yyyy-MM-dd HH:mm:ss')} (${zone})`
//     );
//   } catch (error) {
//     console.error('✗ Error in sendReminderNotifications:', error);
//   }
// };

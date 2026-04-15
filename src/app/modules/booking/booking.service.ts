import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { timezoneHelper } from "../../../helpars/timezoneHelper";
import { DateTime } from "luxon";
import cron from "node-cron";
import { sendNotification } from "../notification/notification.service";

const getTimeSlotsFromDb = async (
  serviceId: string,
  // specialistId?: string,
  startTime?: Date,
  endTime?: Date
) => {
  const result = await prisma.timeSlot.findMany({
    where: {
      serviceId,
      isDeleted: false,
      // ...(specialistId && {
      //   booking: {
      //     specialistId,
      //   },
      // }),
      ...(startTime &&
        endTime && {
          startTime: {
            gte: startTime,
          },
          endTime: {
            lte: endTime,
          },
        }),
    },
  });
  return result;
};

const createIntoDb = async (userId: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const bookingDate = new Date(data.bookingDate);
    const timeSlots = data.timeSlot;
    
    console.log("\n===============================================");
    console.log("📝 CREATING BOOKING - STEP BY STEP TIMEZONE LOG");
    console.log("===============================================");
    console.log("⏰ Booking Date:", bookingDate.toISOString());
    
    timeSlots.forEach((slot: any, idx: number) => {
      console.log(`\n🔹 TimeSlot ${idx}:`);
      console.log(`   1️⃣  Frontend sent: ${slot.startTime}`);
      
      // Frontend sends time 6 hours behind, so add 6 hours to correct it
      const correctedTime = new Date(new Date(slot.startTime).getTime() + 2 * 60 * 60 * 1000);
      console.log(`   2️⃣  After +6 hour correction: ${correctedTime.toISOString()}`);
      
      // Now interpret as local time (Africa/Johannesburg) and convert to UTC
      const localTimeStr = correctedTime.toISOString().replace('Z', '');
      const localDt = DateTime.fromISO(localTimeStr, { zone: timezoneHelper.BUSINESS_TIMEZONE });
      const utcDate = localDt.toUTC();
      
      console.log(`   3️⃣  Interpreting as local (Africa/Johannesburg): ${localDt.toISO()}`);
      console.log(`   4️⃣  Converting to actual UTC: ${utcDate.toISO()}`);
      console.log(`   5️⃣  Storing in DB as: ${utcDate.toJSDate().toISOString()}`);
    });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    const existingBusiness = await prisma.business.findUnique({
      where: { id: data.businessId },
    });
    if (!existingBusiness) {
      throw new ApiError(httpStatus.NOT_FOUND, "Business not found");
    }
    const isExistingBusinessUser = await prisma.user.findUnique({
      where: { id: existingBusiness.userId },
    });
  
    const existingService = await prisma.service.findUnique({
      where: { id: data.serviceId },
    });
    if (!existingService) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
    }
    const existingSpecialist = await prisma.specialist.findUnique({
      where: { id: data.specialistId },
    });
    if (!existingSpecialist) {
      throw new ApiError(httpStatus.NOT_FOUND, "Specialist not found");
    }

    // Conflict check (for each slot)
    for (const slot of timeSlots) {
      // Frontend sends local time (Africa/Johannesburg) directly AS UTC (with Z)
      // Example: User selects 10:45 AM local → frontend sends "2026-04-14T10:45:00.000Z"
      // We treat the numeric values as local time and convert to actual UTC
      
      // Parse frontend time, remove Z,  treat as local time in Africa/Johannesburg
      const localTimeStr = (slot.startTime as string).replace('Z', '');
      const localDt = DateTime.fromISO(localTimeStr).setZone(timezoneHelper.BUSINESS_TIMEZONE);
      const startTime = localDt.toUTC().toJSDate();
      
      const endLocalTimeStr = (slot.endTime as string).replace('Z', '');
      const endLocalDt = DateTime.fromISO(endLocalTimeStr).setZone(timezoneHelper.BUSINESS_TIMEZONE);
      const endTime = endLocalDt.toUTC().toJSDate();

      if (startTime >= endTime) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Start time must be before end time"
        );
      }

      const conflicts = await getTimeSlotsFromDb(
        existingService.id,
        startTime,
        endTime
      );
      if (conflicts.length > 0) {
        throw new ApiError(httpStatus.CONFLICT, `Time slot is already booked for this specialist`);
      }
    }
    // Create booking with time slots
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        businessId: existingBusiness.id,
        serviceId: existingService.id,
        specialistId: existingSpecialist.id,
        bookingDate,
        totalPrice: data.totalPrice,
        bookingStatus: data.status || "PENDING",
        timeSlot: {
          create: timeSlots.map((slot: any) => {
            // Frontend sends time 6 hours behind, so add 6 hours to correct it
            const correctedStartTime = new Date(new Date(slot.startTime).getTime() + 2 * 60 * 60 * 1000);
            const correctedEndTime = new Date(new Date(slot.endTime).getTime() + 2 * 60 * 60 * 1000);
            
            // Now interpret as local time (Africa/Johannesburg) and convert to UTC
            const localStartStr = correctedStartTime.toISOString().replace('Z', '');
            const localStartDt = DateTime.fromISO(localStartStr, { zone: timezoneHelper.BUSINESS_TIMEZONE });
            const utcStart = localStartDt.toUTC().toJSDate();
            
            const localEndStr = correctedEndTime.toISOString().replace('Z', '');
            const localEndDt = DateTime.fromISO(localEndStr, { zone: timezoneHelper.BUSINESS_TIMEZONE });
            const utcEnd = localEndDt.toUTC().toJSDate();
            
            return {
              serviceId: existingService.id,
              startTime: utcStart,
              endTime: utcEnd,
            };
          }),
        },
      },
      include: {
        timeSlot: {
          where: { isDeleted: false },
          select: {
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Format timeSlots for API response
    const formattedBooking = {
      ...booking,
      timeSlot: booking.timeSlot.map((slot) => ({
        ...slot,
        startTimeFormatted: DateTime.fromJSDate(slot.startTime)
          .setZone(timezoneHelper.BUSINESS_TIMEZONE)
          .toFormat("HH:mm"),
        endTimeFormatted: DateTime.fromJSDate(slot.endTime)
          .setZone(timezoneHelper.BUSINESS_TIMEZONE)
          .toFormat("HH:mm"),
      })),
    };

    console.log("\n✅ BOOKING CREATED - STORED IN DATABASE");
    booking.timeSlot.forEach((slot: any, idx: number) => {
      console.log(`\n🔹 TimeSlot ${idx}:`);
      console.log(`   Raw UTC in DB: ${slot.startTime.toISOString()}`);
      const formatted = DateTime.fromJSDate(slot.startTime)
        .setZone(timezoneHelper.BUSINESS_TIMEZONE)
        .toFormat("HH:mm");
      console.log(`   Displayed (Africa/Johannesburg): ${formatted}`);
    });
    console.log("===============================================\n");

    // Send notifications after successful booking creation
    try {
      const timeSlotStr = timeSlots[0] 
        ? DateTime.fromJSDate(new Date(timeSlots[0].startTime))
            .setZone(timezoneHelper.BUSINESS_TIMEZONE)
            .toFormat("HH:mm")
        : 'N/A';
      await sendNotification(
        "Booking Created",
        `Your booking for ${existingService.name} has been successfully created.`,
        user.id,
        user.fcmToken || undefined,
        {
          serviceName: existingService.name,
          specialist: existingSpecialist.fullName || 'Not assigned',
          timeSlot: timeSlotStr,
          selectedDate: new Date(bookingDate).toLocaleDateString('en-US'),
          servicePrice: existingService.price.toString(),
          status: data.status || 'PENDING',
        }
      );
    } catch (err) {
      console.error("Failed to send notification to user:", err);
    }

    if (isExistingBusinessUser) {
      try {
        const timeSlotStr = timeSlots[0] 
          ? DateTime.fromJSDate(new Date(timeSlots[0].startTime))
              .setZone(timezoneHelper.BUSINESS_TIMEZONE)
              .toFormat("HH:mm")
          : 'N/A';
        await sendNotification(
          "New booking created",
          `You have a new booking request for ${existingService.name}.`,
          isExistingBusinessUser.id,
          isExistingBusinessUser.fcmToken || undefined,
          {
            serviceName: existingService.name,
            specialist: existingSpecialist.fullName || 'Not assigned',
            timeSlot: timeSlotStr,
            selectedDate: new Date(bookingDate).toLocaleDateString('en-US'),
            servicePrice: existingService.price.toString(),
            status: data.status || 'PENDING',
          }
        );
      } catch (err) {
        console.error("Failed to send notification to business owner:", err);
      }
    }

    return formattedBooking;
  });

  return transaction;
};

const getListFromDb = async (options: IPaginationOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const result = await prisma.booking.findMany({
    where: {
      isDeleted: false,
    },
    skip,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          fullName: true,
          profileImage: true,
        },
      },
      business: {
        select: {
          name: true,
          address: true,
        },
      },
      service: {
        select: {
          name: true,
          price: true,
          interval: true,
        },
      },
      timeSlot: {
        where: { isDeleted: false },
        select: {
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  const total = await prisma.booking.count({ where: { isDeleted: false } });
  
  // Format times to local timezone for display
  console.log("\n===============================================");
  console.log("📊 ALL BOOKINGS LIST - TIMEZONE LOG");
  console.log("===============================================");
  
  const formattedResult = result.map((booking) => {
    console.log(`\n📌 Booking ID: ${booking.id}`);
    return {
      ...booking,
      timeSlot: booking.timeSlot.map((slot, idx) => {
        const formatted = DateTime.fromJSDate(slot.startTime)
          .setZone(timezoneHelper.BUSINESS_TIMEZONE)
          .toFormat("HH:mm");
        console.log(`   TimeSlot ${idx}: ${slot.startTime.toISOString()} → ${formatted}`);
        
        return {
          ...slot,
          startTimeFormatted: formatted,
          endTimeFormatted: DateTime.fromJSDate(slot.endTime)
            .setZone(timezoneHelper.BUSINESS_TIMEZONE)
            .toFormat("HH:mm"),
        };
      }),
    };
  });
  
  console.log("===============================================\n");
  
  return {
    meta: {
      page,
      limit,
      total,
    },
    result: formattedResult,
  };
};

export const bookingSearchableFields = ["bookingStatus"];

const getListForUserDB = async (
  userId: string,
  options: IPaginationOptions,
  params: { searchTerm?: string }
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm } = params;
  const andConditions: any[] = [];

  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (searchTerm) {
    andConditions.push({
      OR: bookingSearchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      })),
    });
  }

  if (user.role === "PROFESSIONAL") {
    const business = await prisma.business.findFirst({
      where: { userId, isDeleted: false },
    });
    if (!business) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Business not found for this user"
      );
    }
    andConditions.push({ businessId: business.id });
  } else if (user.role === "USER") {
    // For regular users, we don't need to filter by business
    andConditions.push({ userId });
  }

  // Always filter by isDeleted: false
  const whereConditions =
    andConditions.length > 0
      ? { AND: [...andConditions, { isDeleted: false }] }
      : { isDeleted: false };

  const result = await prisma.booking.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          fullName: true,
          profileImage: true,
        },
      },
      business: {
        select: {
          name: true,
          image: true,
          address: true,
          overallRating: true,
          openingHours: true,
          closingHours: true,
          userId: true,
        },
      },
      service: {
        select: {
          name: true,
          price: true,
          interval: true,
        },
      },
      specialist: {
        select: {
          fullName: true,
          profileImage: true,
          specialization: true,
        },
      },
      timeSlot: {
        where: { isDeleted: false },
        select: {
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  const total = await prisma.booking.count({ where: whereConditions });

  // Format times to local timezone for display
  console.log("\n===============================================");
  console.log("📋 USER BOOKINGS LIST - TIMEZONE LOG");
  console.log("===============================================");
  
  const formattedResult = result.map((booking) => {
    console.log(`\n📌 Booking ID: ${booking.id}`);
    console.log(`\n booking status ${booking.bookingStatus}` );
    return {
      ...booking,
      timeSlot: booking.timeSlot.map((slot, idx) => {
        const formatted = DateTime.fromJSDate(slot.startTime)
          .setZone(timezoneHelper.BUSINESS_TIMEZONE)
          .toFormat("HH:mm");
        console.log(`   TimeSlot ${idx}: ${slot.startTime.toISOString()} → ${formatted}`);
        
        return {
          ...slot,
          startTime: new Date(slot.startTime.getTime() +2 * 60 * 60 * 1000),
          endTime: new Date(slot.endTime.getTime() + 2 * 60 * 60 * 1000),
          startTimeFormatted: formatted,
          endTimeFormatted: DateTime.fromJSDate(slot.endTime)
            .setZone(timezoneHelper.BUSINESS_TIMEZONE)
            .toFormat("HH:mm"),
        };
      }),
    };
  });
  
  console.log("===============================================\n");

  return {
    meta: {
      page,
      limit,
      total,
    },
    result: formattedResult,
  };
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          fullName: true,
          profileImage: true,
        },
      },
      business: {
        select: {
          name: true,
          image: true,
          address: true,
          overallRating: true,
          openingHours: true,
          closingHours: true,
        },
      },
      service: {
        select: {
          name: true,
          price: true,
          interval: true,
        },
      },
      specialist: {
        select: {
          fullName: true,
          profileImage: true,
          specialization: true,
        },
      },
      timeSlot: {
        where: { isDeleted: false },
        select: {
          startTime: true,
          endTime: true,
        },
      },
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  // Format times to local timezone for display
  console.log("\n===============================================");
  console.log("📖 RETRIEVING BOOKING BY ID - TIMEZONE LOG");
  console.log("===============================================");
  console.log(`Booking ID: ${id}`);
  console.log(`Booking Date: ${result.bookingDate.toISOString()}`);
  
  const formattedSlots = result.timeSlot.map((slot, idx) => {
    console.log(`\n🔹 TimeSlot ${idx}:`);
    console.log(`   1️⃣  Raw from DB: ${slot.startTime.toISOString()}`);
    
    const dtUtc = DateTime.fromJSDate(slot.startTime);
    console.log(`   2️⃣  As UTC DateTime: ${dtUtc.toISO()}`);
    
    const dtLocal = dtUtc.setZone(timezoneHelper.BUSINESS_TIMEZONE);
    console.log(`   3️⃣  After setZone(Africa/Johannesburg): ${dtLocal.toISO()}`);
    
    const formatted = dtLocal.toFormat("HH:mm");
    console.log(`   4️⃣  Formatted HH:mm: ${formatted}`);
    
    return {
      ...slot,
      startTime: new Date(slot.startTime.getTime() + 2 * 60 * 60 * 1000),
      endTime: new Date(slot.endTime.getTime() + 2 * 60 * 60 * 1000),
      startTimeFormatted: formatted,
      endTimeFormatted: DateTime.fromJSDate(slot.endTime)
        .setZone(timezoneHelper.BUSINESS_TIMEZONE)
        .toFormat("HH:mm"),
    };
  });
  
  console.log("===============================================\n");
  
  return {
    ...result,
    timeSlot: formattedSlots,
  };
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
    }

    const deleteTimeSlots = await prisma.timeSlot.updateMany({
      where: { bookingId: existingBooking.id, isDeleted: false },
      data: { isDeleted: true, updatedAt: new Date() },
    });
    if (!deleteTimeSlots) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to delete existing time slots"
      );
    }
    const existingService = await prisma.service.findUnique({
      where: { id: existingBooking.serviceId },
    });
    if (!existingService) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
    }
    const timeSlots = data.timeSlot;
    // Conflict check (for each slot)
    for (const slot of timeSlots) {
      // Frontend sends time 6 hours behind, so add 6 hours to correct it
      const correctedStartTime = new Date(new Date(slot.startTime).getTime() + 6 * 60 * 60 * 1000);
      const correctedEndTime = new Date(new Date(slot.endTime).getTime() + 6 * 60 * 60 * 1000);
      
      // Now interpret as local time (Africa/Johannesburg) and convert to UTC
      const localStartStr = correctedStartTime.toISOString().replace('Z', '');
      const localStartDt = DateTime.fromISO(localStartStr, { zone: timezoneHelper.BUSINESS_TIMEZONE });
      const startTime = localStartDt.toUTC().toJSDate();
      
      const localEndStr = correctedEndTime.toISOString().replace('Z', '');
      const localEndDt = DateTime.fromISO(localEndStr, { zone: timezoneHelper.BUSINESS_TIMEZONE });
      const endTime = localEndDt.toUTC().toJSDate();

      if (startTime >= endTime) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Start time must be before end time"
        );
      }

      const conflicts = await getTimeSlotsFromDb(
        existingService.id,
        // existingBooking.specialistId,
        startTime,
        endTime
      );
      if (conflicts.length > 0) {
        throw new ApiError(httpStatus.CONFLICT, `Time slot is already booked for this specialist`);
      }
    }
    // Update booking with new data
    const updatedBooking = await prisma.booking.update({
      where: { id, isDeleted: false },
      data: {
        bookingStatus: data.bookingStatus || existingBooking.bookingStatus,
        bookingDate: data.bookingDate || existingBooking.bookingDate,
        totalPrice: data.totalPrice || existingBooking.totalPrice,
        timeSlot: {
          create: data.timeSlot.map((slot: any) => {
            // Frontend sends time 6 hours behind, so add 6 hours to correct it
            const correctedStartTime = new Date(new Date(slot.startTime).getTime() + 6 * 60 * 60 * 1000);
            const correctedEndTime = new Date(new Date(slot.endTime).getTime() + 6 * 60 * 60 * 1000);
            
            // Now interpret as local time (Africa/Johannesburg) and convert to UTC
            const localStartStr = correctedStartTime.toISOString().replace('Z', '');
            const localStartDt = DateTime.fromISO(localStartStr, { zone: timezoneHelper.BUSINESS_TIMEZONE });
            const utcStart = localStartDt.toUTC().toJSDate();
            
            const localEndStr = correctedEndTime.toISOString().replace('Z', '');
            const localEndDt = DateTime.fromISO(localEndStr, { zone: timezoneHelper.BUSINESS_TIMEZONE });
            const utcEnd = localEndDt.toUTC().toJSDate();
            
            return {
              serviceId: existingService.id,
              startTime: utcStart,
              endTime: utcEnd,
            };
          }),
        },
      },
      include: {
        timeSlot: {
          where: { isDeleted: false },
          select: {
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Format times for response
    const formattedBooking = {
      ...updatedBooking,
      timeSlot: updatedBooking.timeSlot.map((slot) => ({
        ...slot,
        startTimeFormatted: DateTime.fromJSDate(slot.startTime)
          .setZone(timezoneHelper.BUSINESS_TIMEZONE)
          .toFormat("HH:mm"),
        endTimeFormatted: DateTime.fromJSDate(slot.endTime)
          .setZone(timezoneHelper.BUSINESS_TIMEZONE)
          .toFormat("HH:mm"),
      })),
    };

    return { message: "Booking updated successfully", updatedBooking: formattedBooking };
  });

  return transaction;
};

const bookingStatusChangeDb = async (id: string, data: any) => {
  const existingBooking = await prisma.booking.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existingBooking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const newStatus = data.status || existingBooking.bookingStatus;

  // Fetch booking details for notification
  const bookingDetails = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: { select: { name: true, price: true } },
      specialist: { select: { fullName: true } },
      timeSlot: { select: { startTime: true }, take: 1 },
    },
  });

  await prisma.booking.update({
    where: { id, isDeleted: false },
    data: {
      bookingStatus: newStatus,
      updatedAt: new Date(),
    },
  });
 const service = await prisma.service.findUnique({
      where: { id: existingBooking.serviceId },
      select: { name: true, price: true },
    });
  
  const timeSlotStr = bookingDetails?.timeSlot[0]?.startTime 
    ? DateTime.fromJSDate(bookingDetails.timeSlot[0].startTime)
        .setZone(timezoneHelper.BUSINESS_TIMEZONE)
        .toFormat("HH:mm")
    : 'N/A';
  
  // Notify booking user and business owner about status change
  try {
    const bookingUser = await prisma.user.findUnique({
      where: { id: existingBooking.userId },
    });

    if (bookingUser) {
      await sendNotification(
        "Booking status updated",
        `Your booking for ${service?.name ?? "the service"} is now ${newStatus}.`,
        bookingUser.id,
        bookingUser.fcmToken || undefined,
        {
          serviceName: service?.name || 'Unknown',
          specialist: bookingDetails?.specialist?.fullName || 'Not assigned',
          timeSlot: timeSlotStr,
          selectedDate: new Date(existingBooking.bookingDate).toLocaleDateString('en-US'),
          servicePrice: service?.price?.toString() || '0',
          status: newStatus,
        }
      );
    }
  } catch (err) {
    console.error("Failed to send notification to booking user:", err);
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: existingBooking.businessId },
    });
    console.log(newStatus)
    if (business?.userId) {
      const owner = await prisma.user.findUnique({ where: { id: business.userId } });
      if (owner) {
        await sendNotification(
          "Booking status changed",
          `A booking for ${service?.name ?? "a service"} has been updated to ${newStatus=="COMPLETE_REQUEST"?"Rescheduled":newStatus}.`,
          owner.id,
          owner.fcmToken || undefined,
          {
            serviceName: service?.name || 'Unknown',
            specialist: bookingDetails?.specialist?.fullName || 'Not assigned',
            timeSlot: timeSlotStr,
            selectedDate: new Date(existingBooking.bookingDate).toLocaleDateString('en-US'),
            servicePrice: service?.price?.toString() || '0',
            status: newStatus,
          }
        );
      }
    }
  } catch (err) {
    console.error("Failed to send notification to business owner:", err);
  }

  return { message: "Booking status updated successfully" };
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.booking.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
        timeSlot: {
          updateMany: { where: { bookingId: id }, data: { isDeleted: true } },
        },
      },
    });
    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });
  return transaction;
};

//make node-cron daily when booking is created. the status will update when bookingDate is over
// Runs every day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Running scheduled task to update booking statuses...");
  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      bookingDate: {
        lt: now,
      },
      bookingStatus: "PENDING",
    },
  });

  for (const booking of bookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { bookingStatus: "COMPLETED" },
    });
  }
});

export const bookingService = {
  createIntoDb,
  getListFromDb,
  getListForUserDB,
  getByIdFromDb,
  updateIntoDb,
  bookingStatusChangeDb,
  deleteItemFromDb,
  getTimeSlotsFromDb,
};

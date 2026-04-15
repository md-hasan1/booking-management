import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { IUser, IUserFilterRequest } from "./user.interface";
import * as bcrypt from "bcrypt";
import crypto from 'crypto';
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { Prisma, User, UserRole } from "@prisma/client";
import { userSearchAbleFields } from "./user.costant";
import config from "../../../config";
import httpStatus, { NOT_FOUND } from "http-status";
import { Request } from "express";
import { fileUploader } from "../../../helpars/fileUploader";
import { Secret } from "jsonwebtoken";
import { jwtHelpers } from "../../../helpars/jwtHelpers";
import { generateOtpEmail } from "../../../shared/emaiHTMLtext";
import emailSender from "../../../shared/emailSender";

// Create a new user in the database.
const createUserIntoDb = async (payload: User) => {
 const existingUser = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
  })

  const otp = Number(crypto.randomInt(1000, 9999));
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  if (existingUser) {
    if (existingUser.status === 'BLOCKED') {
      throw new ApiError(400, `User with email ${payload.email} is blocked.`);
    }

    if (existingUser.status === 'ACTIVE') {
      throw new ApiError(400, `User with email ${payload.email} is already active.`);
    }

    if (existingUser.status === 'INACTIVE') {
      const updatedData: Record<string, any> = {
        status: 'INACTIVE',
        expirationOtp: otpExpires,
        otp,
      };

      if (payload.password) {
        const hashedPassword = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));
        updatedData.password = hashedPassword;
      }

      if (payload.fcmToken) {
        updatedData.fcmToken = payload.fcmToken;
      }

      if (payload.role){
        updatedData.role = payload.role;
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: updatedData,
      });
      const html = generateOtpEmail(otp);
      await emailSender(payload.email, html, 'OTP Verification');

      console.log("otp", otp);
      return { message: 'An OTP has been sent to your email. Please verify your account.' };
    }
  }

  if (!payload.password) {
    throw new ApiError(400, 'Password is required');
  }

  const hashedPassword = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));

  const newUser = await prisma.user.create({
    data:{
      fullName: payload.fullName,
      email: payload.email,
      password: hashedPassword,
      role: payload.role,
      status: 'INACTIVE',
      fcmToken: payload.fcmToken,
      otp,
      expirationOtp: otpExpires,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      role: true,
      otp: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!newUser) {
    throw new ApiError(500, 'Failed to create user');
  }

  const html = generateOtpEmail(otp);
  await emailSender(payload.email, html, 'OTP Verification');

  console.log("otp", otp);
  return { message: 'An OTP has been sent to your email. Please verify your account.' };
};

// reterive all users from the database also searcing anf filetering
const getUsersFromDb = async (
  params: IUserFilterRequest,
  options: IPaginationOptions
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andCondions: Prisma.UserWhereInput[] = [{NOT: {role: UserRole.ADMIN}}];

  if (params.searchTerm) {
    andCondions.push({
      OR: userSearchAbleFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    const validFilters = Object.keys(filterData)
      .filter((key) => {
        // Validate role against UserRole enum
        if (key === 'role') {
          const validRoles = Object.values(UserRole);
          return validRoles.includes((filterData as any)[key]);
        }
        return true;
      })
      .map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      }));
    
    if (validFilters.length > 0) {
      andCondions.push({
        AND: validFilters,
      });
    }
  }
  const whereConditons: Prisma.UserWhereInput = { 
    AND: [
      ...andCondions,
      { isDeleted: false }
    ]
  };
  console.dir(whereConditons, { depth: Infinity });

  const result = await prisma.user.findMany({
    where: whereConditons,
    skip,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const total = await prisma.user.count({
    where: whereConditons,
  });


  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

//get a user
const getUserFromDb = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

// update profile by user won profile uisng token or email and id
const updateProfile = async (req: Request) => {
  console.log(req.file, req.body.data);
  const file = req.file;
  const stringData = req.body.data;
  let image;
  let parseData;
  const existingUser = await prisma.user.findFirst({
    where: {
      id: req.user.id,
    },
  });
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }
  if (file) {
    image = (await fileUploader.uploadToDigitalOcean(file)).Location;
  }
  if (stringData) {
    parseData = JSON.parse(stringData);
  }
  const result = await prisma.user.update({
    where: {
      id: existingUser.id, // Ensure `existingUser.id` is valid and exists
    },
    data: {
      fullName: parseData.fullName || existingUser.fullName,
      profileImage: image || existingUser.profileImage,
      phoneNumber: parseData.phoneNumber || existingUser.phoneNumber,
      isAllowed: parseData.isAllowed !== undefined ? parseData.isAllowed : existingUser.isAllowed, // Keep the existing value of isAllowed
      updatedAt: new Date(), // Assuming your model has an `updatedAt` field
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      phoneNumber: true,
      isAllowed: true,
    },
  });

  return result;
};

// update user data into database by id fir admin
const updateUserIntoDb = async (payload: IUser, id: string) => {
  const userInfo = await prisma.user.findUniqueOrThrow({
    where: {
      id: id,
    },
  });
  if (!userInfo)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found with id: " + id);

  const result = await prisma.user.update({
    where: {
      id: userInfo.id,
    },
    data: payload,
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!result)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update user profile"
    );

  return result;
};

const deleteUser = async (id: string) => {
  const userInfo = await prisma.user.findUnique({
    where: {
      id: id,
      isDeleted: false,
    },
  });
  if (!userInfo)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found with id: " + id);

  const result = await prisma.user.update({
    where: {
      id: userInfo.id,
    },
    data: {
      isDeleted: true,
      updatedAt: new Date(),
    },
  });

  if (!result)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete user profile"
    );

  return result;
}

// Hard delete user and all related data permanently from the database
const hardDeleteUser = async (id: string) => {
  const userInfo = await prisma.user.findUnique({
    where: {
      id: id,
    },
    include: {
      businesses: {
        select: { id: true }
      }
    }
  });

  if (!userInfo)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found with id: " + id);

  const businessIds = userInfo.businesses.map(b => b.id);

  // Use transaction to ensure all deletions succeed or none
  const result = await prisma.$transaction(async (tx) => {
    // Delete user's search history
    await tx.searchHistory.deleteMany({
      where: { userId: id }
    });

    // Delete user's notifications
    await tx.notification.deleteMany({
      where: { userId: id }
    });

    // Delete user's favorites
    await tx.favorite.deleteMany({
      where: { userId: id }
    });

    // Delete user's favorite specialists
    await tx.favoriteSpecialist.deleteMany({
      where: { userId: id }
    });

    // Delete user's reviews
    await tx.review.deleteMany({
      where: { userId: id }
    });

    // Delete user's payouts
    await tx.payout.deleteMany({
      where: { professionalId: id }
    });

    // Delete user's subscriptions
    await tx.userSubscription.deleteMany({
      where: { userId: id }
    });

    // Delete subscription offers created by user (admin)
    await tx.subscriptionOffer.deleteMany({
      where: { createdBy: id }
    });

    // Handle bookings - delete related payments, refunds, timeslots first
    const userBookings = await tx.booking.findMany({
      where: { userId: id },
      select: { id: true }
    });
    const bookingIds = userBookings.map(b => b.id);

    if (bookingIds.length > 0) {
      await tx.refund.deleteMany({
        where: { bookingId: { in: bookingIds } }
      });
      await tx.payment.deleteMany({
        where: { bookingId: { in: bookingIds } }
      });
      await tx.payout.deleteMany({
        where: { bookingId: { in: bookingIds } }
      });
      await tx.timeSlot.deleteMany({
        where: { bookingId: { in: bookingIds } }
      });
      await tx.booking.deleteMany({
        where: { userId: id }
      });
    }

    // Handle user's businesses and their related data
    if (businessIds.length > 0) {
      // Delete business favorites
      await tx.favorite.deleteMany({
        where: { businessId: { in: businessIds } }
      });

      // Delete business reviews
      await tx.review.deleteMany({
        where: { businessId: { in: businessIds } }
      });

      // Get specialists for these businesses
      const specialists = await tx.specialist.findMany({
        where: { businessId: { in: businessIds } },
        select: { id: true }
      });
      const specialistIds = specialists.map(s => s.id);

      if (specialistIds.length > 0) {
        // Delete specialist favorites
        await tx.favoriteSpecialist.deleteMany({
          where: { specialistId: { in: specialistIds } }
        });

        // Delete specialist reviews
        await tx.review.deleteMany({
          where: { specialistId: { in: specialistIds } }
        });

        // Delete specialist portfolios
        await tx.portfolio.deleteMany({
          where: { specialistId: { in: specialistIds } }
        });
      }

      // Get services for these businesses
      const services = await tx.service.findMany({
        where: { businessId: { in: businessIds } },
        select: { id: true }
      });
      const serviceIds = services.map(s => s.id);

      // Delete business bookings and related data
      const businessBookings = await tx.booking.findMany({
        where: { businessId: { in: businessIds } },
        select: { id: true }
      });
      const businessBookingIds = businessBookings.map(b => b.id);

      if (businessBookingIds.length > 0) {
        await tx.refund.deleteMany({
          where: { bookingId: { in: businessBookingIds } }
        });
        await tx.payment.deleteMany({
          where: { bookingId: { in: businessBookingIds } }
        });
        await tx.payout.deleteMany({
          where: { bookingId: { in: businessBookingIds } }
        });
        await tx.timeSlot.deleteMany({
          where: { bookingId: { in: businessBookingIds } }
        });
        await tx.booking.deleteMany({
          where: { businessId: { in: businessIds } }
        });
      }

      // Delete timeslots for services
      if (serviceIds.length > 0) {
        await tx.timeSlot.deleteMany({
          where: { serviceId: { in: serviceIds } }
        });
      }

      // Delete specialists
      await tx.specialist.deleteMany({
        where: { businessId: { in: businessIds } }
      });

      // Delete services
      await tx.service.deleteMany({
        where: { businessId: { in: businessIds } }
      });

      // Delete portfolios
      await tx.portfolio.deleteMany({
        where: { businessId: { in: businessIds } }
      });

      // Delete opening hours
      await tx.openningsMap.deleteMany({
        where: { businessId: { in: businessIds } }
      });

      // Delete businesses
      await tx.business.deleteMany({
        where: { userId: id }
      });
    }

    // Finally delete the user
    const deletedUser = await tx.user.delete({
      where: { id: id }
    });

    return deletedUser;
  });

  return { message: "User and all related data permanently deleted", userId: result.id };
}

// delete users is 15days after isDeleted is true using cron job
const deleteUserCronJob = async () => {
}


export const userService = {
  createUserIntoDb,
  getUsersFromDb,
  getUserFromDb,
  updateProfile,
  updateUserIntoDb,
  deleteUser,
  hardDeleteUser
};

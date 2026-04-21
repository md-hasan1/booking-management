import { z } from "zod";

const CreateUserValidationSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").min(1, "Email is required"),
    name: z.string().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .nonempty("Password is required"),
  }),
});

const UserLoginValidationSchema = z.object({
  body: z.object({
    email: z.string().email().nonempty("Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .nonempty("Password is required"),
  }),
});

const userUpdateSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    promoCode: z.string().optional(),
    profession: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const UserValidation = {
  CreateUserValidationSchema,
  UserLoginValidationSchema,
  userUpdateSchema,
};

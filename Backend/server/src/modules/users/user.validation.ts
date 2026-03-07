import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"])
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  pinCode: z.string().regex(/^\d{6}$/),
  role: z.enum(["user", "admin"]).optional(),
  isActive: z.boolean().optional()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().max(255).optional(),
    pinCode: z.string().regex(/^\d{6}$/).optional(),
    role: z.enum(["user", "admin"]).optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

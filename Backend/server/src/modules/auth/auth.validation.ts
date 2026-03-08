import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128)
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128)
});

export type LoginInput = z.infer<typeof loginSchema>;

export const twoFactorLoginSchema = z.object({
  token: z.string().min(1),
  code: z.string().regex(/^\d{6}$/)
});

export type TwoFactorLoginInput = z.infer<typeof twoFactorLoginSchema>;

export const twoFactorCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/)
});

export type TwoFactorCodeInput = z.infer<typeof twoFactorCodeSchema>;

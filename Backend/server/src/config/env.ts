import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
  REFRESH_TOKEN_HMAC_KEY: z.string().min(32),
  FRONTEND_URL: z.string().min(1),
  BCRYPT_ROUNDS: z.coerce.number().int().min(12).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
  SUPER_ADMIN_PIN_CODE: z.string().regex(/^\d{6}$/).optional(),
  SUPER_ADMIN_NAME: z.string().trim().min(1).max(100).optional(),
  SUPER_ADMIN_LAST_NAME: z.string().trim().min(1).max(100).optional(),
  ADMIN_RESET_PASSWORD: z.string().min(8).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().min(1).optional(),
  GOOGLE_ALLOWED_ORIGIN: z.string().min(1).optional()
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

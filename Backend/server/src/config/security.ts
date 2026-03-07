import type { CorsOptions } from "cors";

import type { Env } from "./env";

export function buildCorsOptions(env: Env): CorsOptions {
  const allowedOrigins = env.FRONTEND_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    credentials: true,
    optionsSuccessStatus: 204,
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    }
  };
}

import type { CorsOptions } from "cors";

import type { Env } from "./env";

function normalizeOrigin(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate).origin;
  } catch {
    return candidate.replace(/\/+$/, "");
  }
}

export function buildCorsOptions(env: Env): CorsOptions {
  const allowedOrigins = env.FRONTEND_URL.split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  return {
    credentials: true,
    optionsSuccessStatus: 204,
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedRequestOrigin = normalizeOrigin(origin);

      if (normalizedRequestOrigin && allowedOrigins.includes(normalizedRequestOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    }
  };
}

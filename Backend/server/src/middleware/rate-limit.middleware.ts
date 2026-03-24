import rateLimit from "express-rate-limit";
import type { Request } from "express";

import { env } from "../config/env";

function isAdminTraffic(req: Request): boolean {
  const { method, path } = req;

  if (path.startsWith("/api/v1/users")) return true;
  if (path === "/api/v1/uploads/images") return true;

  if (path === "/api/v1/content/admin") return true;
  if (method === "PATCH" && path === "/api/v1/content") return true;

  if (path === "/api/v1/products/admin") return true;
  if (method === "POST" && path === "/api/v1/products") return true;
  if (/^\/api\/v1\/products\/[^/]+$/.test(path) && (method === "PATCH" || method === "DELETE")) return true;
  if (/^\/api\/v1\/products\/[^/]+\/deactivate$/.test(path) && method === "PATCH") return true;

  if (path === "/api/v1/orders/admin") return true;
  if (/^\/api\/v1\/orders\/[^/]+\/status$/.test(path) && method === "PATCH") return true;

  if (
    path === "/api/v1/auth/2fa/status" ||
    path === "/api/v1/auth/2fa/setup" ||
    path === "/api/v1/auth/2fa/enable" ||
    path === "/api/v1/auth/2fa/disable"
  ) {
    return true;
  }

  return false;
}

function isReadOnlyTraffic(req: Request): boolean {
  return req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
}

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  skip: (req) =>
    isReadOnlyTraffic(req) ||
    req.path === "/health" ||
    req.path.startsWith("/api/v1/auth") ||
    isAdminTraffic(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later."
    }
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many login attempts, please try again later."
    }
  }
});

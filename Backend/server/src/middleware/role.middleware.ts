import type { RequestHandler } from "express";

import { HttpError } from "../utils/http-error";

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    return next(new HttpError(401, "AUTH_REQUIRED", "Authentication required"));
  }

  if (req.user.role !== "admin") {
    return next(new HttpError(403, "FORBIDDEN", "Admin access required"));
  }

  return next();
};

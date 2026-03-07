import type { ErrorRequestHandler } from "express";

import { env } from "../config/env";
import { logger } from "../utils/logger";

type ErrorWithStatus = Error & { status?: number; code?: string; details?: unknown };

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const err = error as ErrorWithStatus;
  const statusCode = typeof err.status === "number" ? err.status : 500;
  const code = typeof err.code === "string"
    ? err.code
    : statusCode === 404
      ? "NOT_FOUND"
      : "INTERNAL_SERVER_ERROR";
  const message = statusCode >= 500 ? "Internal Server Error" : err.message;

  logger.error("Request error", err);

  const payload: {
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
  } = { error: { code, message } };

  if (statusCode < 500 && err.details !== undefined) {
    payload.error.details = err.details;
  }

  if (env.NODE_ENV !== "production" && statusCode >= 500) {
    payload.error.details = err.message;
  }

  res.status(statusCode).json(payload);
};

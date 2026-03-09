import type { RequestHandler } from "express";

import { UserModel } from "../modules/users";
import { HttpError } from "../utils/http-error";
import { verifyAccessToken } from "../utils/jwt";

const ACTIVITY_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new HttpError(401, "AUTH_REQUIRED", "Authorization header required");
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "INVALID_TOKEN", "Invalid authorization header");
    }

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      throw new HttpError(401, "INVALID_TOKEN", "Invalid or expired token", error);
    }

    if (!payload.sub) {
      throw new HttpError(401, "INVALID_TOKEN", "Token subject missing");
    }

    const user = await UserModel.findById(payload.sub).lean();

    if (!user) {
      throw new HttpError(401, "USER_NOT_FOUND", "User not found");
    }

    if (user.isActive === false) {
      throw new HttpError(403, "USER_DISABLED", "User account disabled");
    }

    const tokenVersion = user.tokenVersion ?? 0;

    if (tokenVersion !== payload.tokenVersion) {
      throw new HttpError(401, "TOKEN_REVOKED", "Token has been revoked");
    }

    if (user.lastPasswordChangeAt && payload.iat) {
      const passwordChangeTime = Math.floor(user.lastPasswordChangeAt.getTime() / 1000);

      if (passwordChangeTime > payload.iat) {
        throw new HttpError(401, "TOKEN_REVOKED", "Token has been revoked");
      }
    }

    const now = Date.now();
    if (!user.lastActiveAt || now - user.lastActiveAt.getTime() > ACTIVITY_UPDATE_INTERVAL_MS) {
      await UserModel.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date(now) } });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      pinCode: user.pinCode,
      role: user.role,
      tokenVersion
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

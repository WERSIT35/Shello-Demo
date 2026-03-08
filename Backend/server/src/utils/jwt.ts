import { createHmac, randomBytes } from "crypto";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

export type AccessTokenPayload = {
  sub: string;
  role: "user" | "admin";
  tokenVersion: number;
  iat?: number;
  exp?: number;
};

export type TwoFactorTokenPayload = {
  sub: string;
  purpose: "two-factor";
  tokenVersion: number;
  iat?: number;
  exp?: number;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 14;
const TWO_FACTOR_TOKEN_TTL_SECONDS = 5 * 60;

export function createAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload === "string") {
    throw new Error("Invalid token payload");
  }

  return payload as AccessTokenPayload;
}

export function getAccessTokenTtlSeconds(): number {
  return ACCESS_TOKEN_TTL_SECONDS;
}

export function createTwoFactorToken(payload: Pick<TwoFactorTokenPayload, "sub" | "tokenVersion">): string {
  return jwt.sign(
    {
      sub: payload.sub,
      purpose: "two-factor",
      tokenVersion: payload.tokenVersion
    },
    env.JWT_SECRET,
    { expiresIn: TWO_FACTOR_TOKEN_TTL_SECONDS }
  );
}

export function verifyTwoFactorToken(token: string): TwoFactorTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload === "string") {
    throw new Error("Invalid token payload");
  }

  const parsed = payload as TwoFactorTokenPayload;

  if (parsed.purpose !== "two-factor") {
    throw new Error("Invalid token purpose");
  }

  return parsed;
}

export function createRefreshToken(): {
  token: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
} {
  const token = randomBytes(64).toString("hex");
  const tokenHash = hashRefreshToken(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  return { token, tokenHash, createdAt, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return createHmac("sha256", env.REFRESH_TOKEN_HMAC_KEY).update(token).digest("hex");
}

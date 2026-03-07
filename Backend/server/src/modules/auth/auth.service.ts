import { randomBytes, randomInt } from "crypto";

import { UserModel } from "../users";
import type { UserDocument } from "../users";
import { comparePassword, hashPassword } from "../../utils/hash";
import {
  createAccessToken,
  createRefreshToken,
  getAccessTokenTtlSeconds,
  hashRefreshToken
} from "../../utils/jwt";
import { HttpError } from "../../utils/http-error";
import type { LoginInput, RegisterInput } from "./auth.validation";
import type { GoogleProfile } from "./google.oauth";

type PublicUser = {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  pinCode: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
};

type LoginContext = {
  ip?: string | null;
  userAgent?: string | null;
};

const MAX_REFRESH_TOKENS = 3;

type LoginResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: PublicUser;
};

type RefreshResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: PublicUser;
};

async function generateUniquePinCode(): Promise<string> {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const pinCode = randomInt(0, 1000000).toString().padStart(6, "0");
    const exists = await UserModel.exists({ pinCode });

    if (!exists) {
      return pinCode;
    }
  }

  throw new HttpError(500, "PIN_GENERATION_FAILED", "Unable to generate a unique pin code");
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const normalizedEmail = input.email.toLowerCase();
  const existing = await UserModel.findOne({ email: normalizedEmail }).lean();

  if (existing) {
    throw new HttpError(409, "EMAIL_IN_USE", "Email already in use");
  }

  const hashedPassword = await hashPassword(input.password);
  const pinCode = await generateUniquePinCode();
  const user = (await UserModel.create({
    name: input.name.trim(),
    lastName: input.lastName.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    pinCode,
    role: "user"
  })) as UserDocument;

  return {
    _id: user._id.toString(),
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    pinCode: user.pinCode,
    role: user.role as "user" | "admin",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function buildNamesFromGoogle(profile: GoogleProfile): { name: string; lastName: string } {
  const fallbackName = profile.name?.trim() || "Shello";
  const fallbackLast = profile.name?.trim().split(" ").slice(1).join(" ") || "User";

  return {
    name: profile.given_name?.trim() || fallbackName,
    lastName: profile.family_name?.trim() || fallbackLast
  };
}

function createRandomPassword(): string {
  return randomBytes(16).toString("hex");
}

export async function loginUser(input: LoginInput, context: LoginContext): Promise<LoginResult> {
  const normalizedEmail = input.email.toLowerCase();
  const user = (await UserModel.findOne({ email: normalizedEmail }).select("+password")) as
    | (UserDocument & { password: string })
    | null;

  if (!user || !user.password) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (user.isActive === false) {
    throw new HttpError(403, "USER_DISABLED", "User account disabled");
  }

  const isValid = await comparePassword(input.password, user.password);

  if (!isValid) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const accessToken = createAccessToken({
    sub: user._id.toString(),
    role: user.role as "user" | "admin",
    tokenVersion: user.tokenVersion ?? 0
  });
  const refreshToken = createRefreshToken();

  user.refreshTokens.push({
    tokenHash: refreshToken.tokenHash,
    createdAt: refreshToken.createdAt,
    expiresAt: refreshToken.expiresAt,
    revoked: false,
    replacedByHash: null,
    ip: context.ip ?? null,
    userAgent: context.userAgent ?? null,
    lastUsedAt: null
  });

  pruneRefreshTokens(user);

  await user.save();

  return {
    accessToken,
    expiresIn: getAccessTokenTtlSeconds(),
    refreshToken: refreshToken.token,
    refreshTokenExpiresAt: refreshToken.expiresAt,
    user: {
      _id: user._id.toString(),
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      pinCode: user.pinCode,
      role: user.role as "user" | "admin",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  };
}

export async function loginWithGoogle(
  profile: GoogleProfile,
  context: LoginContext
): Promise<LoginResult> {
  const normalizedEmail = profile.email.toLowerCase();
  const existingUser = (await UserModel.findOne({
    $or: [{ googleId: profile.sub }, { email: normalizedEmail }]
  }).select("+password")) as (UserDocument & { password: string }) | null;

  let user = existingUser as UserDocument | null;

  if (!user) {
    const names = buildNamesFromGoogle(profile);
    const randomPassword = createRandomPassword();
    const hashedPassword = await hashPassword(randomPassword);
    const pinCode = await generateUniquePinCode();

    user = (await UserModel.create({
      name: names.name,
      lastName: names.lastName,
      email: normalizedEmail,
      password: hashedPassword,
      pinCode,
      role: "user",
      googleId: profile.sub
    })) as UserDocument;
  }

  if (user.isActive === false) {
    throw new HttpError(403, "USER_DISABLED", "User account disabled");
  }

  if (!user.googleId) {
    user.googleId = profile.sub;
  }

  const accessToken = createAccessToken({
    sub: user._id.toString(),
    role: user.role as "user" | "admin",
    tokenVersion: user.tokenVersion ?? 0
  });

  const refreshToken = createRefreshToken();

  user.refreshTokens.push({
    tokenHash: refreshToken.tokenHash,
    createdAt: refreshToken.createdAt,
    expiresAt: refreshToken.expiresAt,
    revoked: false,
    replacedByHash: null,
    ip: context.ip ?? null,
    userAgent: context.userAgent ?? null,
    lastUsedAt: null
  });

  pruneRefreshTokens(user);
  await user.save();

  return {
    accessToken,
    expiresIn: getAccessTokenTtlSeconds(),
    refreshToken: refreshToken.token,
    refreshTokenExpiresAt: refreshToken.expiresAt,
    user: {
      _id: user._id.toString(),
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      pinCode: user.pinCode,
      role: user.role as "user" | "admin",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  context: LoginContext
): Promise<RefreshResult> {
  const tokenHash = hashRefreshToken(refreshToken);

  const user = (await UserModel.findOne({ "refreshTokens.tokenHash": tokenHash })) as
    | UserDocument
    | null;

  if (!user) {
    throw new HttpError(401, "REFRESH_INVALID", "Refresh token is invalid");
  }

  const tokenRecord = user.refreshTokens.find((token) => token.tokenHash === tokenHash);

  if (!tokenRecord) {
    throw new HttpError(401, "REFRESH_INVALID", "Refresh token is invalid");
  }

  if (tokenRecord.revoked) {
    throw new HttpError(401, "REFRESH_REVOKED", "Refresh token has been revoked");
  }

  if (tokenRecord.expiresAt.getTime() <= Date.now()) {
    tokenRecord.revoked = true;
    await user.save();
    throw new HttpError(401, "REFRESH_EXPIRED", "Refresh token has expired");
  }

  const nextRefreshToken = createRefreshToken();
  tokenRecord.revoked = true;
  tokenRecord.replacedByHash = nextRefreshToken.tokenHash;
  tokenRecord.lastUsedAt = new Date();

  user.refreshTokens.push({
    tokenHash: nextRefreshToken.tokenHash,
    createdAt: nextRefreshToken.createdAt,
    expiresAt: nextRefreshToken.expiresAt,
    revoked: false,
    replacedByHash: null,
    ip: context.ip ?? null,
    userAgent: context.userAgent ?? null,
    lastUsedAt: null
  });

  pruneRefreshTokens(user);
  await user.save();

  const accessToken = createAccessToken({
    sub: user._id.toString(),
    role: user.role as "user" | "admin",
    tokenVersion: user.tokenVersion ?? 0
  });

  return {
    accessToken,
    expiresIn: getAccessTokenTtlSeconds(),
    refreshToken: nextRefreshToken.token,
    refreshTokenExpiresAt: nextRefreshToken.expiresAt,
    user: {
      _id: user._id.toString(),
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      pinCode: user.pinCode,
      role: user.role as "user" | "admin",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  };
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  const user = (await UserModel.findOne({ "refreshTokens.tokenHash": tokenHash })) as
    | UserDocument
    | null;

  if (!user) {
    return;
  }

  const tokenRecord = user.refreshTokens.find((token) => token.tokenHash === tokenHash);

  if (!tokenRecord) {
    return;
  }

  tokenRecord.revoked = true;
  tokenRecord.lastUsedAt = new Date();
  await user.save();
}

function pruneRefreshTokens(user: UserDocument): void {
  const now = Date.now();
  const activeTokens = user.refreshTokens
    .filter((token) => !token.revoked && token.expiresAt.getTime() > now)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const keep = new Set(
    activeTokens.slice(0, MAX_REFRESH_TOKENS).map((token) => token.tokenHash)
  );

  for (let index = user.refreshTokens.length - 1; index >= 0; index -= 1) {
    const token = user.refreshTokens[index];
    if (!keep.has(token.tokenHash)) {
      user.refreshTokens.splice(index, 1);
    }
  }
}

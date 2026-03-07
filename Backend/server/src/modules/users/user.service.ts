import { Types } from "mongoose";

import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import { hashPassword } from "../../utils/hash";
import type { CreateUserInput, UpdateUserInput } from "./user.validation";
import { UserModel } from "./user.model";

export type PublicAdminUser = {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  pinCode: string;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: Date;
};

function isSuperAdminEmail(email: string): boolean {
  if (!env.SUPER_ADMIN_EMAIL) {
    return false;
  }

  return email.toLowerCase() === env.SUPER_ADMIN_EMAIL.toLowerCase();
}

export async function listUsers(): Promise<PublicAdminUser[]> {
  const users = await UserModel.find().sort({ createdAt: -1 }).lean();

  return users.map((user) => ({
    _id: user._id.toString(),
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    pinCode: user.pinCode,
    role: user.role as "user" | "admin",
    isActive: user.isActive !== false,
    createdAt: user.createdAt
  }));
}

export async function createUser(input: CreateUserInput): Promise<PublicAdminUser> {
  const normalizedEmail = input.email.toLowerCase();
  const emailExists = await UserModel.exists({ email: normalizedEmail });

  if (emailExists) {
    throw new HttpError(409, "EMAIL_IN_USE", "Email already in use");
  }

  const pinExists = await UserModel.exists({ pinCode: input.pinCode });

  if (pinExists) {
    throw new HttpError(409, "PIN_IN_USE", "Pin code already in use");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await UserModel.create({
    name: input.name.trim(),
    lastName: input.lastName.trim(),
    email: normalizedEmail,
    password: passwordHash,
    pinCode: input.pinCode,
    role: input.role ?? "user",
    isActive: input.isActive ?? true
  });

  return {
    _id: user._id.toString(),
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    pinCode: user.pinCode,
    role: user.role as "user" | "admin",
    isActive: user.isActive !== false,
    createdAt: user.createdAt
  };
}

export async function updateUserRole(
  id: string,
  role: "user" | "admin"
): Promise<PublicAdminUser> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  const user = await UserModel.findById(id);

  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  user.role = role;
  await user.save();

  return {
    _id: user._id.toString(),
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    pinCode: user.pinCode,
    role: user.role as "user" | "admin",
    isActive: user.isActive !== false,
    createdAt: user.createdAt
  };
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<PublicAdminUser> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  const user = await UserModel.findById(id);

  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  if (input.email) {
    const normalizedEmail = input.email.toLowerCase();
    const emailExists = await UserModel.exists({
      email: normalizedEmail,
      _id: { $ne: user._id }
    });

    if (emailExists) {
      throw new HttpError(409, "EMAIL_IN_USE", "Email already in use");
    }

    user.email = normalizedEmail;
  }

  if (input.pinCode) {
    const pinExists = await UserModel.exists({
      pinCode: input.pinCode,
      _id: { $ne: user._id }
    });

    if (pinExists) {
      throw new HttpError(409, "PIN_IN_USE", "Pin code already in use");
    }

    user.pinCode = input.pinCode;
  }

  if (input.name) {
    user.name = input.name.trim();
  }

  if (input.lastName) {
    user.lastName = input.lastName.trim();
  }

  if (input.role) {
    user.role = input.role;
  }

  if (input.isActive !== undefined) {
    if (input.isActive === false && isSuperAdminEmail(user.email)) {
      throw new HttpError(403, "SUPER_ADMIN_PROTECTED", "Cannot disable super admin");
    }

    user.isActive = input.isActive;
  }

  await user.save();

  return {
    _id: user._id.toString(),
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    pinCode: user.pinCode,
    role: user.role as "user" | "admin",
    isActive: user.isActive !== false,
    createdAt: user.createdAt
  };
}

export async function resetUserPassword(id: string): Promise<PublicAdminUser> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  if (!env.ADMIN_RESET_PASSWORD) {
    throw new HttpError(
      500,
      "RESET_PASSWORD_NOT_CONFIGURED",
      "Admin reset password not configured"
    );
  }

  const user = await UserModel.findById(id);

  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  user.password = await hashPassword(env.ADMIN_RESET_PASSWORD);
  user.lastPasswordChangeAt = new Date();
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  user.refreshTokens.splice(0, user.refreshTokens.length);
  await user.save();

  return {
    _id: user._id.toString(),
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    pinCode: user.pinCode,
    role: user.role as "user" | "admin",
    isActive: user.isActive !== false,
    createdAt: user.createdAt
  };
}

export async function deleteUser(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  const user = await UserModel.findById(id);

  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  if (isSuperAdminEmail(user.email)) {
    throw new HttpError(403, "SUPER_ADMIN_PROTECTED", "Cannot delete super admin");
  }

  await UserModel.deleteOne({ _id: user._id });
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { authenticator } from "otplib";
import qrcode from "qrcode";

import { env } from "../config/env";
import { HttpError } from "./http-error";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const APP_NAME = "Shello Demo";

function getEncryptionKey(): Buffer {
  if (!env.TWO_FACTOR_ENCRYPTION_KEY) {
    throw new HttpError(500, "TWO_FACTOR_KEY_MISSING", "Two-factor encryption key not configured");
  }

  return createHash("sha256").update(env.TWO_FACTOR_ENCRYPTION_KEY).digest();
}

export function encryptTwoFactorSecret(secret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptTwoFactorSecret(payload: string): string {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new HttpError(500, "TWO_FACTOR_SECRET_INVALID", "Two-factor secret is invalid");
  }

  const iv = Buffer.from(ivValue, "base64");
  const tag = Buffer.from(tagValue, "base64");
  const encrypted = Buffer.from(encryptedValue, "base64");
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function generateTwoFactorSecret(): string {
  return authenticator.generateSecret();
}

export function buildTwoFactorOtpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, APP_NAME, secret);
}

export async function buildQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return qrcode.toDataURL(otpauthUrl);
}

export function isValidTwoFactorCode(code: string, secret: string): boolean {
  authenticator.options = { window: 1 };
  return authenticator.check(code, secret);
}

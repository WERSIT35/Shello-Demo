import { randomBytes } from "crypto";

import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
};

type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowedOrigin: string;
  allowedOrigins: string[];
};

export function generateOAuthState(): string {
  return randomBytes(16).toString("hex");
}

export function getGoogleConfig(): GoogleConfig {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI;
  const configuredOrigins = `${env.GOOGLE_ALLOWED_ORIGIN ?? ""},${env.FRONTEND_URL}`
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return value.replace(/\/+$/, "");
      }
    });
  const allowedOrigins = Array.from(new Set(configuredOrigins));
  const allowedOrigin = allowedOrigins[0];

  if (!clientId || !clientSecret || !redirectUri || !allowedOrigin) {
    throw new HttpError(500, "GOOGLE_CONFIG_MISSING", "Google OAuth is not configured");
  }

  return { clientId, clientSecret, redirectUri, allowedOrigin, allowedOrigins };
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new HttpError(401, "GOOGLE_AUTH_FAILED", "Unable to authenticate with Google");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new HttpError(401, "GOOGLE_PROFILE_FAILED", "Unable to fetch Google profile");
  }

  return (await response.json()) as GoogleProfile;
}

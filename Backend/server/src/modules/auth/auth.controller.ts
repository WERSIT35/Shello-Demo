import { randomBytes } from "crypto";
import type { RequestHandler } from "express";
import type { CookieOptions, Response } from "express";

import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import {
  loginUser,
  loginWithGoogle,
  logoutUser,
  refreshAccessToken,
  registerUser,
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorLogin
} from "./auth.service";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleProfile,
  generateOAuthState,
  getGoogleConfig
} from "./google.oauth";

const GOOGLE_AUTH_STORAGE_KEY = "shello_google_auth";
const GOOGLE_OAUTH_RETURN_TO_COOKIE = "google_oauth_return_to";

function getRefreshCookieOptions(expires?: Date): CookieOptions {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    // Cross-site frontend (Vercel) -> backend (Render) requires SameSite=None in production.
    sameSite: isProduction ? "none" : "lax",
    path: "/api/v1/auth/refresh",
    ...(expires ? { expires } : {})
  };
}

function getGoogleOAuthCookieOptions(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    ...(typeof maxAgeMs === "number" ? { maxAge: maxAgeMs } : {})
  };
}

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

function resolveSafeReturnTo(rawValue: unknown, allowedOrigins: string[]): string | null {
  if (typeof rawValue !== "string") {
    return null;
  }

  const candidate = rawValue.trim();
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    if (!allowedOrigins.includes(parsed.origin)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function buildGoogleBridgeHtml(payload: Record<string, unknown>, allowedOrigins: string[], returnTo: string | null, nonce: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    <script nonce="${nonce}">
      (function() {
        var payload = ${JSON.stringify(payload)};
        var returnTo = ${JSON.stringify(returnTo)};
        try {
          var store = { type: payload.type, data: payload.data, createdAt: Date.now() };
          if (payload.error) {
            store = { type: payload.type, error: payload.error, createdAt: Date.now() };
          }
          window.localStorage.setItem("${GOOGLE_AUTH_STORAGE_KEY}", JSON.stringify(store));
        } catch (err) {
        }

        var delivered = false;
        if (window.opener && !window.opener.closed) {
          try {
            var allowedOrigins = ${JSON.stringify(allowedOrigins)};
            for (var i = 0; i < allowedOrigins.length; i++) {
              window.opener.postMessage(payload, allowedOrigins[i]);
            }
            delivered = true;
          } catch (err) {
          }
        }

        if (!delivered) {
          try {
            if (returnTo) {
              var target = new URL(returnTo);
              target.hash = "google-auth=" + encodeURIComponent(JSON.stringify(payload));
              window.location.replace(target.toString());
              return;
            }
          } catch (err) {
          }
        }

        window.close();
      })();
    </script>
  </body></html>`;
}

function sendGoogleBridge(res: Response, payload: Record<string, unknown>, allowedOrigins: string[], returnTo: string | null): void {
  const nonce = randomBytes(16).toString("base64");
  const csp = `script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'none'`;
  const html = buildGoogleBridgeHtml(payload, allowedOrigins, returnTo, nonce);

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Content-Security-Policy", csp);
  res.status(200).send(html);
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    return res.status(201).json({ user });
  } catch (error) {
    return next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = await loginUser(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent")
    });

    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions(result.refreshTokenExpiresAt));

    return res.status(200).json({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user
    });
  } catch (error) {
    return next(error);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new HttpError(401, "REFRESH_REQUIRED", "Refresh token required");
    }

    const result = await refreshAccessToken(refreshToken, {
      ip: req.ip,
      userAgent: req.get("user-agent")
    });

    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions(result.refreshTokenExpiresAt));

    return res.status(200).json({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user
    });
  } catch (error) {
    if (error instanceof HttpError) {
      // Do not clear cookie on REFRESH_REVOKED: concurrent refresh requests can rotate
      // tokens out-of-order (e.g. multiple tabs/locales), and clearing here can log users out.
      const clearCodes = ["REFRESH_INVALID", "REFRESH_EXPIRED", "REFRESH_REQUIRED", "SESSION_EXPIRED"];
      if (clearCodes.includes(error.code)) {
        res.clearCookie("refreshToken", getRefreshCookieOptions());
      }
    }

    return next(error);
  }
};

export const twoFactorStatus: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "AUTH_REQUIRED", "Authentication required");
    }

    const status = await getTwoFactorStatus(req.user.id);
    return res.status(200).json(status);
  } catch (error) {
    return next(error);
  }
};

export const twoFactorSetup: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "AUTH_REQUIRED", "Authentication required");
    }

    const setup = await setupTwoFactor(req.user.id);
    return res.status(200).json(setup);
  } catch (error) {
    return next(error);
  }
};

export const twoFactorEnable: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "AUTH_REQUIRED", "Authentication required");
    }

    const result = await enableTwoFactor(req.user.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const twoFactorDisable: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "AUTH_REQUIRED", "Authentication required");
    }

    const result = await disableTwoFactor(req.user.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const twoFactorLogin: RequestHandler = async (req, res, next) => {
  try {
    const result = await verifyTwoFactorLogin(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent")
    });

    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions(result.refreshTokenExpiresAt));

    return res.status(200).json({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user
    });
  } catch (error) {
    return next(error);
  }
};

export const googleStart: RequestHandler = async (req, res, next) => {
  try {
    const { allowedOrigins } = getGoogleConfig();
    const state = generateOAuthState();
    const authUrl = buildGoogleAuthUrl(state);

    const fallbackOrigin = normalizeOrigin(allowedOrigins[0] ?? "");
    const fallbackReturnTo = fallbackOrigin ? `${fallbackOrigin}/login` : null;
    const returnTo = resolveSafeReturnTo(req.query.returnTo, allowedOrigins) ?? fallbackReturnTo;

    res.cookie("google_oauth_state", state, getGoogleOAuthCookieOptions(10 * 60 * 1000));

    if (returnTo) {
      res.cookie(GOOGLE_OAUTH_RETURN_TO_COOKIE, returnTo, getGoogleOAuthCookieOptions(10 * 60 * 1000));
    } else {
      res.clearCookie(GOOGLE_OAUTH_RETURN_TO_COOKIE, getGoogleOAuthCookieOptions());
    }

    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    return res.redirect(authUrl);
  } catch (error) {
    return next(error);
  }
};

export const googleCallback: RequestHandler = async (req, res, next) => {
  try {
    const state = req.query.state?.toString();
    const code = req.query.code?.toString();
    const storedState = req.cookies?.google_oauth_state as string | undefined;
    const { allowedOrigins } = getGoogleConfig();
    const returnTo = resolveSafeReturnTo(req.cookies?.[GOOGLE_OAUTH_RETURN_TO_COOKIE], allowedOrigins);

    if (!state || !code || !storedState || storedState !== state) {
      throw new HttpError(401, "GOOGLE_STATE_INVALID", "Invalid OAuth state");
    }

    res.clearCookie("google_oauth_state", getGoogleOAuthCookieOptions());
    res.clearCookie(GOOGLE_OAUTH_RETURN_TO_COOKIE, getGoogleOAuthCookieOptions());

    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    let result;

    try {
      result = await loginWithGoogle(profile, {
        ip: req.ip,
        userAgent: req.get("user-agent")
      });
    } catch (error) {
      if (error instanceof HttpError && error.code === "TWO_FACTOR_REQUIRED") {
        const details = error.details as { twoFactorToken?: string; user?: unknown } | undefined;
        const twoFactorToken = details?.twoFactorToken;
        const user = details?.user;

        if (!twoFactorToken || !user) {
          throw error;
        }

        const payload = {
          type: "google-auth",
          data: {
            twoFactorRequired: true,
            twoFactorToken,
            user
          }
        };

        sendGoogleBridge(res, payload, allowedOrigins, returnTo);
        return;
      }

      throw error;
    }

    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions(result.refreshTokenExpiresAt));

    const payloadData: Record<string, unknown> = {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user
    };

    const payload = {
      type: "google-auth",
      data: payloadData
    };

    sendGoogleBridge(res, payload, allowedOrigins, returnTo);
    return;
  } catch (error) {
    try {
      const { allowedOrigins } = getGoogleConfig();
      const returnTo = resolveSafeReturnTo(req.cookies?.[GOOGLE_OAUTH_RETURN_TO_COOKIE], allowedOrigins);
      res.clearCookie("google_oauth_state", getGoogleOAuthCookieOptions());
      res.clearCookie(GOOGLE_OAUTH_RETURN_TO_COOKIE, getGoogleOAuthCookieOptions());
      const payload = {
        type: "google-auth",
        error: "Unable to sign in with Google."
      };

      sendGoogleBridge(res, payload, allowedOrigins, returnTo);
      return;
    } catch (innerError) {
      return next(error ?? innerError);
    }
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    res.clearCookie("refreshToken", getRefreshCookieOptions());

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const me: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: "AUTH_REQUIRED",
        message: "Authentication required"
      }
    });
  }

  return res.status(200).json({
    user: req.user
  });
};

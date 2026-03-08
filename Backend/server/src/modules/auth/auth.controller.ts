import { randomBytes } from "crypto";
import type { RequestHandler } from "express";

import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import { loginUser, loginWithGoogle, logoutUser, refreshAccessToken, registerUser } from "./auth.service";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleProfile,
  generateOAuthState,
  getGoogleConfig
} from "./google.oauth";

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

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/api/v1/auth/refresh",
      expires: result.refreshTokenExpiresAt
    });

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

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/api/v1/auth/refresh",
      expires: result.refreshTokenExpiresAt
    });

    return res.status(200).json({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user
    });
  } catch (error) {
    if (error instanceof HttpError) {
      const clearCodes = ["REFRESH_INVALID", "REFRESH_REVOKED", "REFRESH_EXPIRED", "REFRESH_REQUIRED"];
      if (clearCodes.includes(error.code)) {
        res.clearCookie("refreshToken", {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
          path: "/api/v1/auth/refresh"
        });
      }
    }

    return next(error);
  }
};

export const googleStart: RequestHandler = async (_req, res, next) => {
  try {
    const state = generateOAuthState();
    const authUrl = buildGoogleAuthUrl(state);

    res.cookie("google_oauth_state", state, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000
    });

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

    if (!state || !code || !storedState || storedState !== state) {
      throw new HttpError(401, "GOOGLE_STATE_INVALID", "Invalid OAuth state");
    }

    res.clearCookie("google_oauth_state");

    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const result = await loginWithGoogle(profile, {
      ip: req.ip,
      userAgent: req.get("user-agent")
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/api/v1/auth/refresh",
      expires: result.refreshTokenExpiresAt
    });

    const { allowedOrigin } = getGoogleConfig();
    const payloadData: Record<string, unknown> = {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user
    };

    const payload = {
      type: "google-auth",
      data: payloadData
    };

    const nonce = randomBytes(16).toString("base64");
    const csp = `script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'none'`;
    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
      <script nonce="${nonce}">
        (function() {
          var payload = ${JSON.stringify(payload)};
          try {
            var store = { type: payload.type, data: payload.data, createdAt: Date.now() };
            window.localStorage.setItem("shello_google_auth", JSON.stringify(store));
          } catch (err) {
          }
          if (window.opener) {
            window.opener.postMessage(payload, ${JSON.stringify(allowedOrigin)});
          }
          window.close();
        })();
      </script>
    </body></html>`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Content-Security-Policy", csp);
    return res.status(200).send(html);
  } catch (error) {
    try {
      const { allowedOrigin } = getGoogleConfig();
      const payload = {
        type: "google-auth",
        error: "Unable to sign in with Google."
      };

      const nonce = randomBytes(16).toString("base64");
      const csp = `script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'none'`;
      const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
        <script nonce="${nonce}">
          (function() {
            var payload = ${JSON.stringify(payload)};
            try {
              window.localStorage.removeItem("shello_google_auth");
            } catch (err) {
            }
            if (window.opener) {
              window.opener.postMessage(payload, ${JSON.stringify(allowedOrigin)});
            }
            window.close();
          })();
        </script>
      </body></html>`;

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      res.setHeader("Content-Security-Policy", csp);
      return res.status(200).send(html);
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

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/api/v1/auth/refresh"
    });

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

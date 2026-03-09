# Authentication Strategy — Shello

This document describes the authentication strategy for the Shello app (Node.js + Express + MongoDB). It is intended to be stored as a Markdown file (e.g., AUTHENTICATION.md) in your repository.

---

# Table of contents

- Summary
- Goals
- Threat model / assumptions
- Chosen approach (overview)
- Token formats
- Data model changes (user doc)
- Endpoints
- Detailed flows
  - Registration
  - Login
  - Accessing protected APIs
  - Refresh (rotating refresh tokens)
  - Logout
  - Change password / revoke all sessions
  - Password reset
- Middleware & role-based access
- Token storage on clients (web & mobile)
- Token revocation strategies
- Security controls & hardening
- Rate limiting & brute-force protection
- Logging & monitoring
- Implementation notes, examples & recommended libraries
- Next steps / checklist

---

# Summary

- Use JWT access tokens (short-lived, e.g., 15 minutes) for stateless API authentication.
- Use opaque, server-stored refresh tokens (rotating, long-lived, e.g., 14 days) for renewing access tokens.
- Hash passwords using bcrypt with a strong cost factor.
- Store refresh tokens hashed (HMAC-SHA256 or bcrypt) with metadata in the DB so tokens can be revoked and reuse can be detected.
- Enforce role-based authorization for admin endpoints.
- Require HTTPS, strong secrets, rate-limiting, logging, and monitoring.

---

# Goals

- Secure authentication for users and admins.
- Ability to revoke tokens (single-session or global).
- Minimize risk from stolen tokens (rotation + reuse detection).
- Scalable: stateless access tokens and per-session refresh token records.

---

# Threat model / assumptions

- Clients may operate on untrusted networks.
- Server and DB are trusted.
- TLS is available and enforced.
- Refresh tokens may be exposed; the system should be able to revoke/contain misuse.

---

# Chosen approach (overview)

- Access token: JWT (signed, short-lived).
- Refresh token: opaque random string (long-lived) stored hashed server-side.
- Rotation on refresh: when a refresh token is used, the server issues a new refresh token and invalidates the previous one.
- Reuse detection: if a revoked token is used, treat as compromise and revoke all sessions.

---

# Token formats

- Access token (JWT)
  - Algorithm: HS256 (symmetric) for small setups; RS256 (asymmetric) for larger / key-rotation needs.
  - Claims:
    - sub: userId
    - iat: issued at
    - exp: expiry (e.g., +15m)
    - role: user role (user | admin)
    - tokenVersion (optional): integer for mass invalidation
    - jti (optional): JWT ID
- Refresh token (opaque)
  - Secure random string (e.g., 64+ bytes, url-safe).
  - Stored server-side as HMAC-SHA256(token) or bcrypt(token).
  - Metadata stored: createdAt, expiresAt, ip, userAgent, lastUsedAt, revoked flag, replacedByHash.

Recommended lifetimes:
- Access token: 10–30 minutes (recommend 15m).
- Refresh token: 7–30 days (recommend 14 days).

---

# Data model changes (user doc)

Add fields to user documents (example):
- password: string (bcrypt hash)
- pinCode: string (unique 6-digit, generated at registration)
- role: "user" | "admin"
- tokenVersion: Number (default 0) — optional
- lastPasswordChangeAt: Date — optional
- refreshTokens: [
  {
    tokenHash: string,        // HMAC_SHA256 or bcrypt of refresh token
    createdAt: Date,
    expiresAt: Date,
    revoked: Boolean,
    replacedByHash: string | null,
    ip: string | null,
    userAgent: string | null,
    lastUsedAt: Date | null
  }
]

Notes:
- Use tokenVersion or lastPasswordChangeAt to invalidate all active JWTs when needed.
- Storing refresh token metadata allows per-session revocation and auditing.

---

# Endpoints

- POST /auth/register
  - Body: { name, lastName, email, password }
  - Creates user (role defaults to user). Do not return tokens unless intentionally logging in on register.
- POST /auth/login
  - Body: { email, password }
  - Returns: { accessToken, refreshToken, expiresIn }
- POST /auth/refresh
  - Body: { refreshToken } OR read refresh token from HttpOnly cookie
  - Returns: { accessToken, refreshToken }
- POST /auth/logout
  - Body: { refreshToken } OR cookie-based
  - Revokes the provided refresh token (single-session logout)
- POST /auth/logout-all
  - Auth required. Revokes all refresh tokens and increments tokenVersion.
- POST /auth/change-password
  - Auth required. Body: { oldPassword, newPassword } — hashes new password, increments tokenVersion, clears refresh tokens.
- POST /auth/forgot-password
  - Body: { email } — sends password-reset one-time token via email.
- POST /auth/reset-password
  - Body: { token, newPassword } — verify token, set new password, revoke sessions.

---

# Detailed flows

Registration
1. Validate input (email format, password strength).
2. Hash password with bcrypt (cost >= 12).
3. Generate unique 6-digit pin code.
4. Create user document with role: "user".
5. Respond success (optionally auto-login).

Login
1. Validate input.
2. Find user by email.
3. Compare password using bcrypt.compare.
4. If valid:
   - Create access token (JWT) with short expiry.
   - Generate refresh token: crypto.randomBytes(64).toString('hex').
   - Compute tokenHash = HMAC_SHA256(refreshToken) (recommended) or bcrypt.
   - Store tokenHash and metadata in user.refreshTokens.
   - Return accessToken and refreshToken to client (send refresh token in secure HttpOnly cookie or response body).
5. If invalid:
   - Increment failed-login counters and apply rate limiting.

Accessing protected APIs
- Client sends Authorization: Bearer <accessToken>.
- Server verifies JWT signature and expiry.
- Optionally fetch user from DB and check tokenVersion or lastPasswordChangeAt against JWT claims.
- If valid, allow request and provide req.user.

Refresh (rotating refresh tokens)
1. Client sends refreshToken to /auth/refresh (body or cookie).
2. Server computes tokenHash and finds matching token record.
3. Cases:
   - Not found: reject — possible token theft or reuse.
   - Found and revoked: treat as reuse (compromise) — revoke all refresh tokens for user and require re-login.
   - Found and valid:
     - Issue new access token.
     - Generate new refresh token (R_new).
     - Compute new tokenHash, store record with expiresAt.
     - Mark old token record as revoked and set replacedByHash = new tokenHash.
     - Return new accessToken and R_new.

Logout
- Client sends refreshToken to /auth/logout.
- Server finds token record (via tokenHash) and marks revoked: true.
- Optionally remove token record.

Change password / revoke all sessions
- Verify current password.
- Hash & save new password.
- Increment tokenVersion or set lastPasswordChangeAt.
- Remove or mark all refresh tokens revoked.

Password reset
- Create short-lived one-time token (signed or random), store hashed with expiresAt.
- Email link to user with token.
- On reset: verify token, set new password, revoke sessions.

---

# Middleware & role-based access

1. Authentication middleware (authenticate)
   - Read Authorization header: Bearer <JWT>.
   - Verify JWT signature and expiry.
   - Extract sub (userId) and tokenVersion claim.
   - Fetch user from DB:
     - Ensure user exists and active.
     - Optionally compare tokenVersion or lastPasswordChangeAt to JWT claim/iat; reject if mismatched.
   - Attach user to req.user.

2. Authorization middleware (requireRole(role))
   - Ensure req.user.role satisfies required role (e.g., admin).

Notes:
- For sensitive operations (creating products, changing order status), always fetch role/permissions from DB rather than trusting token claims alone.

---

# Token storage on clients

Web SPA:
- Best: keep access token in memory only; keep refresh token in secure, HttpOnly cookie (SameSite=Lax or Strict).
- If using cookies for refresh tokens, protect against CSRF (SameSite mitigates; consider CSRF token on state-changing endpoints).
- Avoid localStorage for long-lived tokens (XSS risk).

Mobile:
- Store refresh token in secure storage (Keychain / Keystore).
- Store access token in memory and refresh when needed.

Desktop/native:
- Secure platform storage.

---

# Token revocation strategies

- Per-session revocation: keep refresh tokens in DB and mark revoked.
- Global revocation / logout-all: increment tokenVersion (or set lastPasswordChangeAt).
- Short-lived access tokens minimize exposure.
- Reuse detection: if a revoked refresh token is used, revoke all sessions for that user.

Implementation choice for tokenHashing:
- Use HMAC_SHA256(token) with a server-side HMAC key for deterministic lookup (fast).
- Or use bcrypt to hash tokens — more expensive and requires comparing each token record for a user; not ideal for lookups.

---

# Security controls & hardening

- Enforce HTTPS everywhere.
- Use strong secrets stored in environment variables or secret manager.
- Rotate secrets and keys periodically.
- Use secure random for refresh tokens: crypto.randomBytes(64).
- Protect endpoints with CORS allowing only trusted origins.
- Set security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Content-Security-Policy.
- Validate and sanitize all inputs.
- Use rate-limiting (e.g., express-rate-limit or Redis-based) for auth endpoints.

---

# Rate limiting & brute-force protection

- Limit attempts on:
  - POST /auth/login (per IP and per email)
  - POST /auth/refresh (per IP and per refresh token)
  - Password reset endpoints
- Implement temporary lockouts after N failed attempts.
- Use Redis for counters (fast, shared across instances).

---

# Logging & monitoring

- Log:
  - Successful and failed login attempts (email, ip, userAgent)
  - Token refresh events and revocations
  - Password changes and resets
- Alert on suspicious activity (multiple failed logins, reuse detection).
- Retain logs in an audit trail (stored separately from DB).

---

# Implementation notes & examples

- Generate refresh tokens:
  - const token = crypto.randomBytes(64).toString('hex');
  - const tokenHash = hmacSha256(token, process.env.REFRESH_TOKEN_HMAC_KEY);
- Hash passwords with bcrypt:
  - bcrypt.hash(password, 12)
- JWT signing:
  - Use jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' })
- Refresh token storage schema (example):
  {
    tokenHash,
    createdAt,
    expiresAt,
    revoked: false,
    replacedByHash: null,
    ip,
    userAgent,
    lastUsedAt: null
  }
- On refresh, set lastUsedAt and track replacedByHash to detect reuse of rotated tokens.
- Use tokenVersion or lastPasswordChangeAt to invalidate issued JWTs after password change or global logout.

---

# Recommended libraries

- bcrypt or bcryptjs (password hashing)
- jsonwebtoken (JWT sign/verify)
- express-rate-limit and Redis-backed limiter (rate limiting)
- crypto (node built-in) for secure random bytes and HMAC
- helmet (security headers)
- winston / pino (logging)

---

# Next steps / checklist

- [ ] Add fields to user schema: refreshTokens[], tokenVersion, lastPasswordChangeAt
- [ ] Implement password hashing middleware (bcrypt) on user model
- [ ] Implement auth controllers: register, login, refresh, logout, logout-all, change-password, forgot/reset
- [ ] Implement authenticate and requireRole middleware
- [ ] Implement refresh token rotation and reuse detection logic
- [ ] Add rate limiting (login and refresh endpoints)
- [ ] Store secrets (JWT secret, HMAC key) in env or secret manager
- [ ] Add logging for auth events
- [ ] Add tests for auth flows, rotation, and reuse detection
- [ ] Document client storage recommendations and implement accordingly

---

This file is designed to be used as your project’s canonical authentication strategy. If you want, I can now:

- Generate an Express + Mongoose auth module (controllers, routes, middleware) that implements this strategy.
- Provide sample DB migration to add refreshTokens and tokenVersion to user documents.
- Provide example client code for web SPA (how to store tokens and call refresh).

Which would you like next?
JWT Strategy — Shello
======================

Purpose
-------
Define the JSON Web Token (JWT) authentication strategy for Shello, covering access tokens and refresh tokens, their lifetimes, storage, rotation, revocation, verification, and implementation notes. This file is the canonical reference for engineers implementing authentication and session management.

Summary
-------
- Access Token: JWT (short-lived, stateless). Used to authorize API requests. Lifetime: ≤ 15 minutes (recommended 15m).
- Refresh Token: Opaque long-lived token (server-stored, rotating). Used to obtain new access tokens. Lifetime: 7–30 days (recommended 14 days).
- Refresh tokens MUST be rotated on each use. Reuse of a rotated/ revoked refresh token MUST trigger revocation of all sessions for that user.
- Store refresh tokens hashed server-side (HMAC-SHA256 or bcrypt) with session metadata for per-session revocation and auditing.
- Use HTTPS everywhere. Cookies storing refresh tokens MUST be HttpOnly, Secure, SameSite=Strict (if cookie-based).

Goals
-----
- Minimize risk from token theft by limiting exposure (short-lived access tokens).
- Allow server-side revocation and detection of refresh-token reuse.
- Keep access checks fast and scalable (stateless JWT verification), while enabling forced logout and session revocation when needed.

Token formats
-------------
1. Access Token (JWT)
   - Signing: HS256 (HMAC with strong secret) or RS256 (asymmetric) when using key rotation / separate signing infrastructure.
   - Recommended claims:
     - sub: userId
     - iat: issued at (epoch)
     - exp: expiry (e.g., now + 15m)
     - role: user role (user | admin) — optional, but verify server-side when needed
     - tokenVersion (optional): integer stored in user doc to invalidate all tokens when incremented
     - jti (optional): unique JWT ID for tracing
   - Lifetime: Recommend 15 minutes (must be ≤ 15 minutes per security standard).

2. Refresh Token (opaque)
   - Format presented to client: secure random string, e.g., crypto.randomBytes(64).toString('hex')
   - Server storage: store tokenHash = HMAC_SHA256(refreshToken, REFRESH_TOKEN_HMAC_KEY) (preferred deterministic lookup) or bcrypt(refreshToken).
   - Stored metadata:
     - tokenHash
     - userId
     - createdAt
     - expiresAt
     - revoked (boolean)
     - replacedByHash (nullable)
     - ip, userAgent (optional)
     - lastUsedAt (optional)
   - Lifetime: Recommend 14 days (adjust per product needs).

Where tokens live (client & server)
-----------------------------------
- Client:
  - Access token: store in memory only (volatile). Attach as Authorization: Bearer <accessToken> on API requests.
  - Refresh token: store in HttpOnly, Secure, SameSite=Strict cookie OR secure platform storage (mobile: Keychain/Keystore). Do NOT store refresh tokens in localStorage.
- Server:
  - Access token is stateless; server verifies signature and expiry.
  - Refresh tokens are persisted (hashed) in user document or a separate sessions collection for per-session control.

Refresh token cookie (recommended cookie-based flow)
- Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Expires=<date>
- Backend must set Access-Control-Allow-Credentials: true and the frontend must call the refresh endpoint with credentials included.
- When rotating refresh tokens, set new cookie with new token and appropriate flags.

Refresh token rotation & reuse detection
----------------------------------------
Flow (recommended):
1. Client sends refresh token R_old to POST /auth/refresh (cookie or body).
2. Server computes tokenHash = HMAC(R_old) and looks up the session record.
3. If no matching record found:
   - Possible token theft or reuse. Response: reject and consider revoking all refresh tokens for the user if a userId is known from associated request context. Log this as a security event.
4. If matching record found and revoked = true:
   - Token reuse detected — revoke all user sessions and require re-authentication (force logout). Log incident and alert if necessary.
5. If matching record found and valid:
   - Issue new access token (JWT).
   - Generate a new refresh token R_new.
   - Compute newTokenHash = HMAC(R_new).
   - Insert new session record with newTokenHash and metadata.
   - Mark existing record as revoked = true and set replacedByHash = newTokenHash.
   - Return new access token to client and set new refresh cookie (if cookie-based).
6. On logout:
   - Client calls POST /auth/logout (with cookie or token); server marks the session record revoked and clears the refresh cookie.

Why rotate?
- Rotation prevents stolen refresh tokens from being used indefinitely. If an attacker replays an old refresh token after rotation, server can detect reuse because the old token record is revoked and replacedByHash is set.

Token revocation strategies
---------------------------
- Per-session revocation:
  - Keep refresh tokens in DB (user.refreshTokens array or sessions collection). Mark specific tokenHash as revoked to revoke a single session.
- Global revocation (logout-all):
  - Increment user.tokenVersion or set lastPasswordChangeAt. Include tokenVersion claim in JWT to allow stateless invalidation.
  - On authenticate middleware, compare tokenVersion in JWT vs DB and reject if mismatch.
- Blacklist approach (not preferred long-term):
  - Store revoked JWT jti in Redis with TTL until token expiry to forcibly invalidate tokens. This adds state and complexity; prefer tokenVersion when invalidating globally.

Token verification & middleware
-------------------------------
Authenticate middleware should:
1. Read Authorization: Bearer <accessToken>.
2. If no token: return 401.
3. Verify JWT signature and exp (use jsonwebtoken or jose).
4. Optionally validate jti against revocation store (if used).
5. Fetch user from DB by sub claim:
   - Ensure user exists and is active.
   - Compare JWT tokenVersion claim to user's tokenVersion in DB (if used).
   - Optionally compare iat to lastPasswordChangeAt; reject if iat < lastPasswordChangeAt.
6. Attach user to req.user.

Refresh endpoint behavior
-------------------------
- Endpoint: POST /auth/refresh
- Accepts: refresh token via HttpOnly cookie (recommended) or in request body.
- Response: { accessToken } and new refresh token (if using body) or sets a new refresh cookie.
- Security:
  - Require credentials for cookie-based flow (CORS: credentials true).
  - Apply rate limiting and IP/account throttling to protect the refresh endpoint from abuse.
  - Log refresh events and detect anomalies (many refresh attempts from different IPs).

Login & token issuance
----------------------
- On successful login:
  - Create access token (JWT) with exp ~15m.
  - Create refresh token (secure random).
  - Compute tokenHash and store session record.
  - Return access token and set refresh cookie (or return refresh token in body for non-cookie flow).
- Ensure server recalculates any claims (e.g., role) from DB when issuing tokens.

Security controls & best practices
----------------------------------
- Secrets:
  - Use a high-entropy JWT_SECRET (≥ 32 chars) for HS256, or manage public/private keys for RS256.
  - Use a separate REFRESH_TOKEN_HMAC_KEY to HMAC refresh tokens before storing.
  - Store secrets in environment variables or secret manager.
- Transport:
  - Require HTTPS for all auth traffic. Do not send tokens over unsecured channels.
- Cookie flags:
  - HttpOnly, Secure, SameSite=Strict (or Lax depending on cross-site needs).
- Rate limiting:
  - Apply strict rate limits to /auth/login, /auth/refresh, and /auth/forgot-password.
- Monitoring:
  - Log: login success/failure, refresh events, refresh-token reuse, logout events, and suspicious patterns.
- Token lifetime tuning:
  - Balance security and UX. Shorter access token lifetimes reduce theft window but increase refresh frequency.
- Detect refresh reuse:
  - If HMAC lookup returns a record with revoked=true and replacedByHash set, consider this reuse; revoke all sessions.

Storage design options
----------------------
1. Store refresh tokens in user document (user.refreshTokens array)
   - Pros: Simple, co-located with user doc.
   - Cons: Array size can grow; needs pruning. Concurrency updates could cause conflicts.
2. Separate sessions collection
   - Pros: Scales better, easier to index and query, avoids big user doc updates.
   - Cons: Additional collection to manage.
Recommendation: use a sessions collection with an index on tokenHash and userId for fast lookups and efficient pruning.

Example session document (sessions collection)
{
  _id: ObjectId,
  userId: ObjectId,
  tokenHash: "<HMAC_SHA256(hex)>",
  createdAt: ISODate,
  expiresAt: ISODate,
  revoked: false,
  replacedByHash: null,
  ip: "1.2.3.4",
  userAgent: "Mozilla/5.0 ...",
  lastUsedAt: ISODate
}

Migration & cleanup
-------------------
- Periodically prune expired and revoked sessions from DB.
- Provide a migration to move any existing plaintext or unhashed refresh tokens to hashed storage if needed.
- Implement background job to remove sessions older than retention policy.

Cookie vs body tradeoffs
------------------------
- Cookie-based (recommended for web SPA):
  - Pros: HttpOnly cookies mitigate XSS risks for refresh tokens.
  - Cons: Requires CSRF considerations. Use SameSite, CSRF tokens, or double-submit pattern.
- Body-based (token in request body / Authorization header):
  - Pros: Simpler CSRF model (no cookies), explicit handling by client.
  - Cons: Client must securely store refresh token (avoid localStorage); mobile apps must use secure storage.

Rotation & concurrency edge cases
--------------------------------
- Race condition:
  - If two parallel refresh requests occur with same refresh token, one will succeed and the other should be treated as reuse.
  - Detection: the second request will find the token record revoked and trigger reuse detection logic.
- To reduce false positives:
  - Use single-use sequencing and ensure atomic DB updates (update token record and insert new record in a transaction where supported).
  - Use sessions collection and transactions (replica set) if possible.

Implementation checklist (must-haves)
------------------------------------
- [ ] Access tokens signed and expire ≤ 15 minutes.
- [ ] Refresh tokens are opaque, random, and stored hashed.
- [ ] Refresh token rotation implemented with replacedBy tracking.
- [ ] Refresh-token reuse detection implemented and triggers global revocation.
- [ ] Refresh tokens stored in HttpOnly, Secure, SameSite cookies for web clients (or secure platform storage for mobile).
- [ ] Server-side tokenVersion or lastPasswordChangeAt checks to invalidate issued JWTs after password changes or logout-all.
- [ ] Rate limiting for /auth/login and /auth/refresh.
- [ ] All secrets stored securely (env or secret manager) and not in repo.
- [ ] Logging for auth events and suspicious activity.
- [ ] Periodic pruning of expired/revoked sessions.

Example flows (concise)
-----------------------
1. Login
   - POST /auth/login { email, password }
   - Server: verify password → create JWT (15m) + refresh token (R)
   - Server stores tokenHash(H(R)) and metadata; set cookie (HttpOnly) or return R in body
   - Client stores JWT in memory

2. Use API
   - Client sends Authorization: Bearer <JWT> on requests

3. Refresh
   - Client calls POST /auth/refresh with cookie (credentials included)
   - Server validates R_old via tokenHash lookup:
     - If valid -> issue new JWT and R_new, store H(R_new), revoke H(R_old) with replacedByHash = H(R_new), set cookie with R_new
     - If not valid -> detect reuse/compromise and revoke all sessions for user

4. Logout
   - Client calls POST /auth/logout (credentials included)
   - Server revokes the session (tokenHash) and clears cookie

Testing & verification
----------------------
- Unit & integration tests:
  - Token issuance, JWT verification, tokenVersion invalidation
  - Refresh rotation: use refresh token twice -> second attempt fails and triggers revocation
  - Revocation: revoked refresh token cannot be used
- Penetration tests:
  - Attempt replay attacks, session fixation, CSRF, and XSS scenarios
- Monitoring:
  - Alert on multiple revoked token usages, rapid refresh attempts, or abnormal geographic patterns.

Appendix: Recommended defaults
------------------------------
- Access token expiry: 15 minutes
- Refresh token expiry: 14 days
- JWT secret length: ≥ 32 chars
- REFRESH_TOKEN_HMAC_KEY: ≥ 32 chars
- Refresh token random length: 64 bytes (crypto.randomBytes(64).toString('hex'))
- bcrypt rounds (for passwords): ≥ 12

Document maintenance
--------------------
- Review this document quarterly and after any auth-related incident or architecture change.
- Track changes in changelog and require Security Owner sign-off for major shifts (e.g., moving to JWT refresh tokens instead of opaque tokens).

End of document
---
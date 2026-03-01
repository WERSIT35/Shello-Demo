Security Standards — Shello
===========================

Purpose
-------
Establish mandatory security controls that must be implemented and verified before Shello is deployed to production. These standards map directly to the pre-launch checklist and define required controls, acceptable values, and verification steps.

Scope
-----
Applies to all Shello components: backend services (API, auth), frontend (web/mobile), database (MongoDB), infrastructure (Docker/Kubernetes, VPS), and CI/CD processes.

Owner & Enforcement
-------------------
- Security Owner: [assign a person or team]
- Compliance: All items marked MUST are mandatory. Non-blocking recommendations are labeled SHOULD.
- Verification: Dev/Ops must provide evidence (logs, screenshots, config snippets) for each MUST item prior to production deployment.

Sections
--------

1. Authentication & Authorization
---------------------------------
1.1 Access & Refresh Tokens
- Standard:
  - Access tokens MUST be JWTs with expiration ≤ 15 minutes.
  - Refresh tokens MUST be rotated on each use; reuse MUST trigger full session revocation.
  - JWT secrets MUST be at least 32 characters of high-entropy random data (or use asymmetric keys RS256 with proper key management).
- Implementation notes:
  - Sign access tokens with HS256 (symmetric) or RS256 (asymmetric) per key management capabilities.
  - Store refresh tokens as opaque values; persist only hashed token identifiers (HMAC-SHA256 or bcrypt) and associated metadata.
- Verification:
  - Unit/integration tests for token rotation behavior.
  - Manual test: consume refresh token twice → second attempt must fail and cause session-wide revocation.

1.2 Passwords
- Standard:
  - All passwords MUST be hashed using bcrypt with minimum 12 salt rounds.
- Implementation notes:
  - Use bcrypt/bcryptjs; cost factor should be tuned for production hardware (>= 12).
  - Store only the hash; never log plaintext passwords.
- Verification:
  - Code review for password hashing pre-save hook.
  - Check DB for no plaintext passwords.

1.3 Session & Role Controls
- Standard:
  - Role-based access control (RBAC) MUST be enforced server-side.
  - Admin-only routes MUST check role via middleware and re-verify user status in DB.
- Implementation notes:
  - Do not trust role claims alone in JWT for sensitive admin operations; re-check DB where necessary.
- Verification:
  - Automated tests that call admin routes as non-admin user → must return 403.
  - Audit of middleware presence on admin routes.

2. API Protection
-----------------
2.1 Headers & Frameworks
- Standard:
  - App MUST enable helmet (or equivalent) to set secure HTTP headers.
- Verification:
  - Inspect HTTP responses for security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Content-Security-Policy).

2.2 Rate Limiting & Size Limits
- Standard:
  - Global and endpoint-specific rate limiting MUST be in place.
  - Login endpoints MUST have stricter rate limits and per-account throttling.
  - Request body size limits MUST be configured.
- Verification:
  - Test rate limit enforcement (exceed allowed requests → 429).
  - Configuration proof (middleware, nginx, API gateway).

2.3 Input Validation & Error Handling
- Standard:
  - All inbound request payloads MUST be validated (Zod/class-validator/JSON Schema).
  - Server MUST not return stack traces or debug info to clients in production.
- Verification:
  - Static review of validation code and central error handler.
  - Test malformed payload returns 400 with no stack trace.

2.4 CORS
- Standard:
  - CORS policy MUST NOT use wildcard origins in production; only approved origins are allowed.
- Verification:
  - Check CORS configuration; attempt cross-origin request from unauthorized origin → must be blocked.

3. Order & Business Logic Integrity
-----------------------------------
3.1 Pricing & Stock
- Standard:
  - Backend MUST recalculate product prices, totals, taxes, and discounts for every order.
  - Backend MUST verify and atomically decrement product stock before confirming orders.
  - Client-provided price data MUST be ignored for order finalization.
- Implementation notes:
  - Use DB transactions (MongoDB replica set) or atomic updates to decrement stock.
- Verification:
  - Tests that attempt to create order with modified frontend price → server computes correct total.
  - Tests for concurrent ordering to ensure stock never becomes negative.

3.2 Order Authorization
- Standard:
  - Only admin roles MAY update order status fields (paid, shipped, delivered, cancelled) via protected endpoints.
- Verification:
  - Non-admin attempts to change status → 403.

4. Database Security
--------------------
4.1 Network & Access
- Standard:
  - MongoDB MUST NOT be publicly exposed (bind to internal network / private Docker network).
  - Authentication MUST be enabled for MongoDB.
  - DB credentials MUST be strong and unique per environment.
- Verification:
  - Network rules or docker-compose/k8s manifests showing internal-only binding.
  - Show mongo configuration includes auth and created admin user.

4.2 Backups & Availability
- Standard:
  - Daily backups MUST be scheduled and stored off-instance (S3 or separate storage).
  - Restore procedures MUST be documented and periodically tested.
- Verification:
  - Backup job configs + recent successful backup logs.
  - Restore test report.

5. Secrets Management
---------------------
- Standard:
  - Secrets MUST NOT be committed to VCS.
  - .env and secret files MUST be excluded via .gitignore.
  - Production secrets MUST be stored in secret manager or infrastructure-native secrets (K8s Secrets, Vault, cloud secret store).
- Verification:
  - Repo scan for committed secrets.
  - Proof of secrets stored in chosen secret manager and not in repo.

6. Frontend Security
--------------------
6.1 Build & Source
- Standard:
  - Production builds MUST be minified and built with production flags.
  - Source maps MUST NOT be published to production.
  - Console logs and debug endpoints MUST be removed from production builds.
- Verification:
  - Production bundle contents and build scripts review.
  - Confirm absence of source maps in deployed assets.

6.2 Auth Handling & Cookies
- Standard:
  - Access JWTs SHOULD be short-lived and stored in memory; refresh tokens MUST be stored in HttpOnly, Secure, SameSite=Strict cookies (or platform secure storage for mobile).
  - No JWTs in localStorage/sessionStorage.
- Verification:
  - Inspect browser cookies (httpOnly) and app storage for tokens.

6.3 Browser Protections
- Standard:
  - CSP, X-Frame-Options, and Strict-Transport-Security MUST be configured.
- Verification:
  - Response header checks and CSP policy review.

7. Infrastructure & Network
---------------------------
7.1 TLS & CDN
- Standard:
  - TLS (HTTPS) MUST be enforced; HTTP must redirect to HTTPS.
  - Valid SSL/TLS cert MUST be present.
  - Cloudflare or equivalent WAF/CDN SHOULD be enabled for DDoS protection.
- Verification:
  - TLS tests (ssllabs) and validate cert expiration.
  - WAF configuration proof.

7.2 Firewall & Ports
- Standard:
  - Only required ports (80/443) MAY be open to the public.
  - DB and management ports MUST be restricted to internal networks.
- Verification:
  - Firewall rules or cloud security group configs.

7.3 Docker
- Standard:
  - Containers MUST run as non-root users when possible.
  - MongoDB container MUST not expose port 27017 to the public internet.
  - Images SHOULD be minimal and scanned for vulnerabilities.
- Verification:
  - Dockerfile and runtime configs review.
  - Container runtime user check and image scanning reports.

8. Monitoring, Logging & Auditing
---------------------------------
- Standard:
  - Authentication events (login success/failure, token refresh, token reuse, logout), admin actions, and suspicious events MUST be logged.
  - Uptime monitoring & alerting MUST be configured.
  - Logs MUST be protected and retained per company policy.
- Verification:
  - Sample logs, alerting configuration, and retention policy.

9. Rate Limiting & Brute-force Protection
-----------------------------------------
- Standard:
  - Login endpoints MUST implement per-IP and per-account rate limiting.
  - Implement temporary lockout or progressive delays after repeated failures.
- Verification:
  - Tests for lockout behavior and rate limiter logs.

10. Final Go-Live Verification
------------------------------
Before production go-live, the following MUST be executed and evidence provided:

- Brute-force protection tests (report).
- Order price manipulation attempt test (server rejects tampered totals).
- Unauthorized admin route access test (403 for unauthorized).
- Expired token behavior (expired access token must be rejected; refresh flow behavior validated).
- Cookie security check (httpOnly and Secure).
- HTTPS certificate validity check.

Appendices
----------
A. Recommended defaults
- Access token expiry: 15 minutes
- Refresh token expiry: 14 days
- JWT secret length: ≥ 32 chars
- bcrypt rounds: ≥ 12

B. Tools & libraries
- bcrypt / bcryptjs
- jsonwebtoken
- helmet
- express-rate-limit (or redis-backed variant)
- zod / class-validator
- crypto (Node.js)
- audit/logging: pino/winston and centralized log store
- backup: mongodump to S3 or managed backup service

C. Incident response notes (high level)
- On refresh-token reuse:
  - Immediately revoke all refresh tokens for user.
  - Invalidate existing sessions (tokenVersion or lastPasswordChangeAt).
  - Notify user to change password.
  - Create security incident ticket and retain forensic logs.

Document maintenance
--------------------
- This file MUST be reviewed at least quarterly and after any security incident or major architecture change.
- Ownership transitions MUST be recorded and a new Security Owner assigned.

How to use this file
--------------------
Overview
--------
Goal: have a clean separation between the frontend (Angular SPA) and backend (Node/Express + Mongoose) so teams can work independently, deployments are decoupled, security boundaries are enforced, and deployments are reproducible.

High-level decisions (recommended)
- Frontend: Single Page App built with Angular; served from CDN or static-hosting (Netlify, Vercel, S3+CloudFront) or from a production web server (NGINX) behind CDN.
- Backend: RESTful JSON API (or HTTP+JSON) with versioning; deployed as separate service(s) (containers) behind API gateway / reverse-proxy (NGINX, Traefik) and TLS.
- Authentication: Server issues refresh token as HttpOnly Secure SameSite cookie; access token may be stored in memory on client.
- CORS: Restrictive; backend allows only approved frontend origins.

Repository & Project Structure
------------------------------
Option A — Monorepo (recommended for small teams)
- repo-root/
  - package.json (tools, workspace)
  - docker-compose.yml (local dev)
  - /frontend/ (Angular app)
    - package.json
    - angular.json
    - src/
    - Dockerfile (optional)
  - /backend/ (Express + Mongoose)
    - package.json
    - src/
    - Dockerfile
  - /infra/ (deployment manifests, nginx configs)
  - /docs/

Option B — Separate repos
- shello-frontend (Angular)
- shello-backend (Node/Express)
- infra repo (k8s manifests, nginx, CI)

Where to put each piece
- Frontend code: /frontend
- Frontend build output: dist/ served by CDN/hosting or by NGINX in infra
- Backend code: /backend
- Backend Dockerfile, compose, k8s manifests: /infra or /backend/deploy
- Shared types / API contracts (optional): /shared (or npm package) for models and DTOs

API contract & Versioning
-------------------------
- Base endpoint pattern: /api/v1/...
- Keep contracts explicit: request/response JSON shapes documented in OpenAPI (Swagger).
- Produce an OpenAPI YAML/JSON file at repo root or /docs/openapi.yaml.
- Use the OpenAPI to:
  - Generate typed clients (optional).
  - Generate API docs for frontend devs.
- Versioning policy:
  - v1: stable initial public API
  - v2+: for breaking changes — keep aliasing support if necessary.

Authentication boundary & flows
-------------------------------
- Backend responsibilities:
  - All auth logic (login, logout, refresh, register, password reset).
  - Issue refresh tokens and set them in HttpOnly Secure SameSite cookie (Set-Cookie).
  - Issue short-lived access tokens (JWT) returned in response body so client can keep it in memory.
  - Enforce RBAC and admin checks in backend.
  - Recalculate prices, validate stock, and run transactions.
- Frontend responsibilities:
  - Store only refresh tokens in HttpOnly cookie (set automatically by backend) or rely on cookie-only refresh flow.
  - Keep access token in memory and attach it to Authorization header on API calls: Authorization: Bearer <accessToken>.
  - Provide route guards and UI-level role gating (but do not rely on them for security).
- Cookie vs body:
  - Recommended: Set refresh token as HttpOnly Secure SameSite=Strict cookie by backend. Client does NOT directly read this cookie; refresh endpoint uses the cookie to identify session.
  - Access token is returned in response body and stored in memory (not localStorage).
- CSRF:
  - If using cookies for refresh endpoint, protect refresh/logout endpoints from CSRF:
    - Use SameSite=Strict (helps).
    - Consider double-submit CSRF token stored in non-HttpOnly cookie or require the client to send an anti-CSRF header when calling refresh (X-CSRF-Token) obtained from a separate endpoint.
    - Alternatively use refresh tokens in request body (client-side storage) for API that uses Authorization header — trade-offs apply.

CORS & Networking
-----------------
- Backend CORS policy:
  - Allow specific origins only (e.g., https://app.shello.com).
  - Allow credentials only if refresh tokens are cookie-based (Access-Control-Allow-Credentials: true).
  - Allow headers: Authorization, Content-Type, X-CSRF-Token.
- Reverse proxy / Gateway:
  - Terminate TLS at the edge (Cloudflare or ALB/NGINX).
  - Route /api/* to backend, other routes to CDN/frontend host.
- Local dev:
  - Use proxy in Angular dev server to forward /api to backend (avoid CORS during development).
  - Or run both with docker-compose on same internal network.

OpenAPI & DTOs
--------------
- Produce an OpenAPI 3.0 spec describing all backend endpoints, request bodies, response bodies, and error responses.
- Commit the spec to /docs/openapi.yaml.
- Frontend team uses the spec to:
  - Generate TypeScript types (openapi-generator or openapi-typescript).
  - Ensure contract conformance.
- Keep API doc in sync — include automated checks in CI that validate responses against spec for critical endpoints.

Error handling & status codes
-----------------------------
- Backend returns standardized JSON errors:
  - { "error": { "code": "INVALID_INPUT", "message": "Email is invalid", "details": {...} } }
- Use proper HTTP status codes:
  - 200/201 success, 400 validation error, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 429 rate-limit, 500 server error.
- Frontend should handle 401 by trying refresh once then redirect to login if refresh fails.

Build & Deployment
------------------
Frontend:
- Build: ng build --configuration=production (ensure no source maps, no console logs).
- Deploy: upload dist/ to CDN or host via NGINX behind CDN.
- Set caching headers (immutable assets with content-hash filenames).
Backend:
- Build: Docker image (node:alpine or similar), run migrations/seed at startup if needed.
- Deploy: container in K8s or VM behind load balancer.
- Migrate/database: ensure single-node replica set for transactions if required.
- Environment variables:
  - Keep secrets in secret manager / K8s secrets.
  - Example envs: MONGODB_URI, JWT_SECRET, REFRESH_TOKEN_HMAC_KEY, NODE_ENV, RATE_LIMIT_CONFIG.

CI/CD Pipeline
--------------
- CI for frontend:
  - Run lint, unit tests, e2e tests (optional), build, produce artifact.
  - Deploy to staging on merge to main; deploy to production on tag/release.
- CI for backend:
  - Run lint, unit tests, integration tests (with test DB), run security linters (npm audit).
  - Build Docker image and push to registry; deploy to staging then production via CD.
- API compatibility checks:
  - Optionally run contract test: after backend build, validate endpoints against OpenAPI; if mismatch, fail CI.
- Automated gating:
  - Ensure SECURITY_STANDARDS.md checks are enforced in pipeline (e.g., missing envs, secrets, or security headers fail build).

Local development setup
-----------------------
- docker-compose.yml (dev) with services: backend, mongo (replica set if needed), redis (optional), frontend (dev server).
- Angular proxy.conf.json to forward /api to backend to avoid CORS.
- Example .env.dev and .env.test files (never commit).
- Script tasks:
  - yarn dev:frontend — ng serve with proxy
  - yarn dev:backend — nodemon backend
  - yarn dev — docker-compose up

Testing & QA
------------
- API tests:
  - Unit tests for controllers and services.
  - Integration tests for order flow, stock decrement, price calculation.
  - Contract tests validating OpenAPI.
- Security tests:
  - Automated tests for rate limiting, expired token behavior, cookie flags, and role enforcement.
- End-to-end tests:
  - Critical flows: registration, login, add-to-cart, checkout, admin order update.
- Load & concurrency tests:
  - Simulate concurrent orders against same product to ensure atomic stock management.

Security & Operational Boundaries
---------------------------------
- Backend is the only trusted place for business logic (prices, stock, discounts).
- Frontend must be considered untrusted input: all inputs validated server-side.
- Secrets only on backend; frontend served statically with no secret keys.
- MongoDB and other data stores must be internal-only (private network).

Concrete Checklist (Tasks to finish separation)
----------------------------------------------
1. Repo structure
   - [ ] Create /frontend and /backend folders (or repos).
   - [ ] Add Dockerfiles for both.
   - [ ] Add docker-compose.yml for local dev.

2. API contract
   - [ ] Create OpenAPI spec (docs/openapi.yaml).
   - [ ] Add CI check to validate API vs spec.

3. Auth & cookies
   - [ ] Implement refresh token cookie (HttpOnly, Secure, SameSite=Strict) in backend.
   - [ ] Ensure backend sets Access-Control-Allow-Credentials and appropriate CORS.
   - [ ] Implement access token in memory on frontend and attach Authorization header.
   - [ ] Add CSRF protections for cookie-based endpoints (double-submit token or SameSite+anti-CSRF header).

4. CORS & proxy
   - [ ] Configure backend CORS with allowed origins list.
   - [ ] Add Angular proxy for dev.

5. OpenAPI client types
   - [ ] Generate TypeScript types for API responses and request payloads.
   - [ ] Use these types in frontend services.

6. Build & deploy
   - [ ] Frontend production build (no source maps).
   - [ ] Backend Docker image and deployment manifests.
   - [ ] CDN / static hosting configured for frontend.

7. Security hardening
   - [ ] Ensure SECURITY_STANDARDS.md items completed (cookie flags, helmet, rate-limit, CORS).
   - [ ] Run security scans and dependency audits.

8. Tests
   - [ ] Add unit, integration, contract, and e2e tests.
   - [ ] Add load tests for order concurrency.

9. Monitoring & logging
   - [ ] Ensure backend logs auth events and admin actions.
   - [ ] Configure frontend error reporting (Sentry) if desired.

10. Final verification
   - [ ] Run final go-live verification (see SECURITY_STANDARDS.md).

Example cookie refresh flow (summary)
------------------------------------
- Backend on /auth/login:
  - Sets Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Expires=<...>
  - Returns { accessToken } in response body.
- Frontend:
  - Stores accessToken in memory.
  - When accessToken expires, call POST /auth/refresh with credentials: 'include' so cookie is sent.
  - Backend reads cookie, validates refresh token, issues new accessToken and rotates refresh token (sets new cookie).
- Logout:
  - POST /auth/logout with credentials: 'include' → backend clears refresh token cookie (set expiry in past) and revokes server-side token.

Example CORS config (express)
-----------------------------
- Allowed origin: process.env.FRONTEND_ORIGIN
- Set credentials: true
- Allowed headers: 'Content-Type, Authorization, X-CSRF-Token'

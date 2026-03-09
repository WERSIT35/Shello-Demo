API Contract — Shello
=====================

Purpose
-------
This document defines the public API contract between the frontend (Angular SPA or other clients) and the Shello backend (Node/Express). It specifies endpoints, request/response shapes, authentication requirements, error formats, headers, and versioning. Use this file as the canonical reference for frontend and backend teams. Generate an OpenAPI spec from it for automation.

Versioning
----------
- Base path: /api/v1
- Breaks and incompatible changes MUST bump the version (e.g., /api/v2).
- Non-breaking additions (new optional fields, new endpoints) SHOULD be added to the same version.

General rules
-------------
- All requests and responses use application/json unless otherwise specified.
- Time format: ISO 8601 (UTC) for all date/time fields.
- IDs: MongoDB ObjectId strings.
- Pagination: use cursor or limit/offset pattern (prefer cursor for scalability). Default page size MUST be documented per endpoint.
- Consistent error format (see Errors section).
- Authentication:
  - Protected endpoints require Authorization: Bearer <accessToken> header.
  - For cookie-based refresh flow, refresh endpoints are called with credentials included (fetch/axios credentials: 'include').
- CORS:
  - Responses include Access-Control-Allow-Credentials when cookie flow is enabled.

Headers
-------
- Required headers (where applicable):
  - Authorization: Bearer <JWT> (for protected endpoints)
  - Content-Type: application/json
  - Accept: application/json
- Optional headers:
  - X-Request-ID: client-generated idempotency / tracing id
  - X-CSRF-Token: required if using double-submit CSRF protection with cookies

Error format
------------
All error responses should return a non-2xx HTTP status and a body in this shape:

{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional, structured validation errors */ }
  }
}

Common HTTP status codes:
- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request (validation)
- 401 Unauthorized (not authenticated)
- 403 Forbidden (insufficient privileges)
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity (semantic errors)
- 429 Too Many Requests (rate limit)
- 500 Internal Server Error

Authentication endpoints
------------------------

POST /api/v1/auth/register
- Purpose: create new user account
- Public
- Body:
  {
    "name": "string",
    "lastName": "string",
    "email": "string",
    "password": "string"
  }
- Response 201:
  {
    "user": {
      "_id": "string",
      "name": "string",
      "lastName": "string",
      "email": "string",
      "pinCode": "string",
      "role": "user",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
- Notes:
  - Do not return password or refresh tokens.
  - Optionally auto-login and return access token and set refresh cookie (documented if implemented).

POST /api/v1/auth/login
- Purpose: authenticate and issue tokens
- Public
- Body:
  {
    "email": "string",
    "password": "string"
  }
- Response 200:
  {
    "accessToken": "string",
    "expiresIn": 900,           // seconds (example: 15m)
    "user": {
      "_id": "string",
      "name": "string",
      "lastName": "string",
      "email": "string",
      "pinCode": "string",
      "role": "user"
    }
  }
- Server sets refresh token cookie when using cookie-based flow:
  - Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Expires=<date>

POST /api/v1/auth/refresh
- Purpose: rotate refresh token and issue new access token
- Public (requires valid refresh token via HttpOnly cookie or in body)
- Request: cookie included or body: { "refreshToken": "string" }
- Response 200:
  {
    "accessToken": "string",
    "expiresIn": 900
  }
- Server rotates refresh token and sets new cookie if cookie flow is used.

POST /api/v1/auth/logout
- Purpose: revoke current refresh token session
- Auth / Credentials: cookie or Authorization header as required
- Request: cookie included or body: { "refreshToken": "string" }
- Response 204 No Content
- Server revokes refresh token and clears cookie.

POST /api/v1/auth/forgot-password
- Purpose: request password reset
- Public
- Body:
  { "email": "string" }
- Response 204
- Server sends email with one-time reset link/token.

POST /api/v1/auth/reset-password
- Purpose: complete password reset
- Public
- Body:
  { "token": "string", "newPassword": "string" }
- Response 204
- Server verifies token, sets new password, invalidates sessions.

User endpoints
--------------

GET /api/v1/users/me
- Purpose: fetch current authenticated user
- Auth: required
- Response 200:
  {
    "_id": "string",
    "name": "string",
    "lastName": "string",
    "email": "string",
    "pinCode": "string",
    "role": "user",
    "createdAt": "string",
    "updatedAt": "string"
  }

PATCH /api/v1/users/me
- Purpose: update user profile (non-sensitive fields)
- Auth: required
- Body (any of):
  { "name": "string", "phone": "string", "shippingAddresses": [ ... ] }
- Response 200: updated user object

POST /api/v1/users/me/change-password
- Purpose: change own password
- Auth: required
- Body:
  { "oldPassword": "string", "newPassword": "string" }
- Response 204
- Server must verify oldPassword, set new hashed password, increment tokenVersion or revoke sessions.

Admin user endpoints (require admin role)
- GET /api/v1/users — list users (paged)
- GET /api/v1/users/:id — get any user
- PATCH /api/v1/users/:id — update any user (dangerous; use caution)
- POST /api/v1/users/:id/revoke-sessions — revoke all sessions for user

Products endpoints
------------------

GET /api/v1/products
- Purpose: list products (public)
- Query params:
  - q: string (text search)
  - pageSize: int
  - cursor / page: pagination
  - isActive: boolean (default true)
- Response 200:
  {
    "data": [
      { "_id": "string", "title": "string", "description": "string", "price": number, "stock": number, "images": [string], "isActive": boolean, "createdAt": "...", "updatedAt": "..." }
    ],
    "meta": { "nextCursor": "string" }
  }

GET /api/v1/products/:id
- Purpose: get product details
- Response 200: product object
- 404 if not found or not active (if not admin)

POST /api/v1/products
- Purpose: create product
- Auth: admin
- Body:
  {
    "title": "string",
    "description": "string",
    "price": number,
    "stock": int,
    "images": [ "string" ],
    "metadata": { /* optional */ }
  }
- Response 201: created product
- Notes: Server validates price >= 0 and stock >= 0.

PATCH /api/v1/products/:id
- Purpose: update product
- Auth: admin
- Body: any updatable fields (title, description, price, stock, images, isActive, metadata)
- Response 200: updated product

DELETE /api/v1/products/:id
- Purpose: archive/soft-delete product
- Auth: admin
- Response 204

Orders endpoints
----------------

POST /api/v1/orders
- Purpose: create order (checkout)
- Auth: required
- Body:
  {
    "items": [
      { "productId": "string", "quantity": int }
    ],
    "shippingAddress": {
      "fullName": "string",
      "phone": "string",
      "addressLine": "string",
      "city": "string",
      "postalCode": "string",
      "country": "string"
    },
    "paymentMethod": { /* payment provider info or token */ }
  }
- Server-side behavior (MUST):
  - Recalculate item prices from products collection and compute totalPrice.
  - Verify product stock; atomically decrement stock within transaction.
  - Create order document with items[].priceAtPurchase, totalPrice, status: "pending" or "paid" depending on payment flow.
- Response 201:
  {
    "orderId": "string",
    "status": "pending",
    "totalPrice": number,
    "createdAt": "string"
  }
- Failures:
  - 409 Conflict if stock insufficient (include details in error.details).

GET /api/v1/orders
- Purpose: list current user's orders (paged)
- Auth: required
- Query params: page, pageSize
- Response 200:
  { "data": [ orders... ], "meta": { ... } }

GET /api/v1/orders/:id
- Purpose: get order details
- Auth: required
- Access rules:
  - user can access own order
  - admin can access any order
- Response 200: full order object including items, shippingAddress, status, paymentInfo (if permitted)

PATCH /api/v1/orders/:id/status
- Purpose: update order status (admin only)
- Auth: admin
- Body: { "status": "paid" | "shipped" | "delivered" | "cancelled" }
- Response 200: updated order
- Notes: Financial implications (refunds) should go through payment provider workflows.

Payments
--------
- Payment processing is handled via payment provider (Stripe, PayPal, etc.) or external microservice.
- API should accept payment tokens/ints in POST /api/v1/orders or use separate payment endpoints.
- Do NOT trust client-provided payment success; verify via provider webhooks and update order status server-side.

Webhooks
--------
- POST /api/v1/webhooks/:provider
- Purpose: provider webhooks (e.g., payment confirmation)
- Requirements:
  - Validate signature headers using provider secret.
  - Update order status only after verifying webhook authenticity.
  - Return 200 quickly; process heavy work asynchronously.

Admin & Audit endpoints
-----------------------
- GET /api/v1/admin/orders?status=paid — admin listing with filters
- POST /api/v1/admin/products/:id/adjust-stock — admin-only stock adjustments (records reason)
- All admin actions MUST be logged in audit trail.

Idempotency
-----------
- For critical endpoints that may be retried (e.g., order creation, payment), support idempotency via:
  - X-Idempotency-Key header: server should store and reuse result for the given key for a reasonable TTL.
  - Return 409 or previous result when a duplicate idempotency key is used.

Rate limiting & throttling
--------------------------
- Apply rate limits per IP and per account for sensitive endpoints (auth, orders).
- Return 429 Too Many Requests with Retry-After header when limits exceeded.

Examples
--------
1) Create order request example:
{
  "items": [
    { "productId": "603e2dfb1c4a4f3b9c0b1234", "quantity": 2 }
  ],
  "shippingAddress": {
    "fullName": "Jane Doe",
    "phone": "+123456789",
    "addressLine": "123 Main St",
    "city": "City",
    "postalCode": "12345",
    "country": "Country"
  },
  "paymentMethod": {
    "provider": "stripe",
    "token": "tok_abc123"
  }
}

2) Error example (insufficient stock):
HTTP 409
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Not enough stock for product 603e2dfb1c4a4f3b9c0b1234",
    "details": { "productId": "603e2dfb1c4a4f3b9c0b1234", "available": 1, "requested": 2 }
  }
}

Testing & Contract validation
-----------------------------
- Maintain an OpenAPI (Swagger) spec generated from this contract.
- Use contract tests to validate that backend responses conform to the spec.
- Optionally generate TypeScript client types from OpenAPI for frontend.

Security & validation reminders
-------------------------------
- Recalculate prices server-side; ignore client-submitted prices.
- Verify stock and use transactions to avoid race conditions.
- Enforce RBAC on protected/admin endpoints.
- Validate and sanitize all inputs.
- Log auth events and admin actions.

Change control
--------------
- Any change to API contract MUST be documented, reviewed, and (if breaking) versioned.
- Update the OpenAPI spec and regenerate client types when API changes.
- Run backward-compatibility checks in CI for non-breaking changes.

End of document
---
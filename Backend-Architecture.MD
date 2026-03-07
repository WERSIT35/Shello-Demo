# Shello Full Backend Architecture

**Stack:** Node.js + Express + TypeScript
**Database:** MongoDB
**Authentication:** JWT (Access + Refresh)
**Security Level:** Production-Grade

---

# 1. Folder Structure

```
server/
│
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   └── security.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── products/
│   │   ├── orders/
│   │   └── email/
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── hash.ts
│   │   └── logger.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

# 2. Core Principles

* No business logic in routes
* Controller → Service → Repository pattern
* All input validated
* All responses sanitized
* Centralized error handling
* Role-based access control

---

# 3. Modules Overview

## Auth Module

* Register
* Login
* Refresh Token
* Logout
* Password hashing (bcrypt 12+)

## Users Module

* Get profile
* Update profile
* Admin: list users

## Products Module

* Create product (admin)
* Update product
* Delete product
* Get all products
* Get single product

## Orders Module

* Create order
* Get user orders
* Admin: view all orders
* Update order status

Order security rules:

* Price recalculated on backend
* Product stock verified

---

# 4. Security Layers

* Helmet
* Rate limiting
* Strict CORS
* JWT in httpOnly cookies
* Refresh token rotation
* Zod validation
* Role middleware
* Logging

---

# 5. Database Models

## User

* name
* lastName
* email
* pinCode
* password
* role
* createdAt

## Product

* name
* description
* price
* images
* stock
* createdAt

## Order

* userId
* items
* totalAmount
* shippingInfo
* status
* createdAt

---

# 6. Environment Variables

* NODE_ENV
* PORT
* MONGO_URI
* JWT_SECRET
* REFRESH_SECRET
* EMAIL_API_KEY
* FRONTEND_URL

Secrets never committed to git.

---

Production-ready backend structure optimized for security and scalability.

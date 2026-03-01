MongoDB Collections — Shello
============================

Purpose
-------
This document defines the MongoDB collections, schemas (JSON Schema validator), indexes, and relationship guidance for the Shello application. Place it in the repository root as MONGODB_COLLECTIONS.md and use it as the canonical reference for DB structure, validation, and indexing.

Contents
--------
- Collections overview
- Users collection
  - JSON Schema (validator)
  - Mongoose model (shape)
  - Indexes
  - Notes
- Products collection
  - JSON Schema (validator)
  - Mongoose model (shape)
  - Indexes
  - Notes
- Orders collection
  - JSON Schema (validator)
  - Mongoose model (shape)
  - Indexes
  - Notes
- Relationships & transactions
- Backup & operational notes
- Migration & versioning guidance

Collections overview
--------------------
Database name: shello_db

Collections:
- users
- products
- orders

Users collection
----------------
Purpose: store user accounts (customers and admins).

JSON Schema validator (use with createCollection or collMod)
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["name", "email", "password", "role", "createdAt", "updatedAt"],
    "additionalProperties": false,
    "properties": {
      "_id": { "bsonType": "objectId" },
      "name": { "bsonType": "string" },
      "email": { "bsonType": "string" },
      "password": { "bsonType": "string" },
      "role": { "enum": ["user", "admin"] },
      "tokenVersion": { "bsonType": "int" },
      "lastPasswordChangeAt": { "bsonType": "date" },
      "refreshTokens": {
        "bsonType": "array",
        "items": {
          "bsonType": "object",
          "required": ["tokenHash", "createdAt", "expiresAt", "revoked"],
          "additionalProperties": false,
          "properties": {
            "tokenHash": { "bsonType": "string" },
            "createdAt": { "bsonType": "date" },
            "expiresAt": { "bsonType": "date" },
            "revoked": { "bsonType": "bool" },
            "replacedByHash": { "bsonType": ["string", "null"] },
            "ip": { "bsonType": ["string", "null"] },
            "userAgent": { "bsonType": ["string", "null"] },
            "lastUsedAt": { "bsonType": ["date", "null"] }
          }
        }
      },
      "createdAt": { "bsonType": "date" },
      "updatedAt": { "bsonType": "date" }
    }
  }
}

Mongoose model shape (informational)
- _id: ObjectId
- name: String (required)
- email: String (required, unique, indexed)
- password: String (hashed, required, select: false)
- role: "user" | "admin" (default "user")
- tokenVersion: Number (default 0)
- lastPasswordChangeAt: Date | null
- refreshTokens: [
    { tokenHash, createdAt, expiresAt, revoked, replacedByHash, ip, userAgent, lastUsedAt }
  ]
- timestamps: createdAt, updatedAt

Indexes
- email: { email: 1 } unique

Notes
- Passwords MUST be bcrypt-hashed; never return password field in responses.
- Keep refreshTokens array bounded (prune expired/revoked tokens).
- Use tokenVersion/lastPasswordChangeAt to invalidate issued JWTs globally.

Products collection
-------------------
Purpose: store products (phone cases) for sale.

JSON Schema validator
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["title", "price", "stock", "isActive", "createdAt", "updatedAt"],
    "additionalProperties": false,
    "properties": {
      "_id": { "bsonType": "objectId" },
      "title": { "bsonType": "string" },
      "description": { "bsonType": ["string", "null"] },
      "price": { "bsonType": "double", "minimum": 0 },
      "stock": { "bsonType": "int", "minimum": 0 },
      "images": { "bsonType": "array", "items": { "bsonType": "string" } },
      "isActive": { "bsonType": "bool" },
      "metadata": { "bsonType": ["object", "null"] },
      "createdAt": { "bsonType": "date" },
      "updatedAt": { "bsonType": "date" }
    }
  }
}

Mongoose model shape (informational)
- _id: ObjectId
- title: String (required, indexed/text)
- description: String
- price: Number (required, >=0)
- stock: Number (required, >=0)
- images: [String]
- isActive: Boolean (default true)
- metadata: Object (optional free-form for variations)
- timestamps: createdAt, updatedAt

Indexes
- text index on title: { title: "text" }
- isActive: { isActive: 1 }

Notes
- Validate price and stock on backend; do not trust client-submitted prices.
- Prefer soft-delete (isActive = false) instead of hard delete.
- Consider separate collection for product variants if complexity grows.

Orders collection
-----------------
Purpose: store purchase orders.

JSON Schema validator
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["userId", "items", "totalPrice", "shippingAddress", "status", "createdAt", "updatedAt"],
    "additionalProperties": false,
    "properties": {
      "_id": { "bsonType": "objectId" },
      "userId": { "bsonType": "objectId" },
      "items": {
        "bsonType": "array",
        "minItems": 1,
        "items": {
          "bsonType": "object",
          "required": ["productId", "quantity", "priceAtPurchase"],
          "additionalProperties": false,
          "properties": {
            "productId": { "bsonType": "objectId" },
            "quantity": { "bsonType": "int", "minimum": 1 },
            "priceAtPurchase": { "bsonType": "double", "minimum": 0 }
          }
        }
      },
      "totalPrice": { "bsonType": "double", "minimum": 0 },
      "shippingAddress": {
        "bsonType": "object",
        "required": ["fullName", "phone", "addressLine", "city", "postalCode", "country"],
        "additionalProperties": false,
        "properties": {
          "fullName": { "bsonType": "string" },
          "phone": { "bsonType": "string" },
          "addressLine": { "bsonType": "string" },
          "city": { "bsonType": "string" },
          "postalCode": { "bsonType": "string" },
          "country": { "bsonType": "string" }
        }
      },
      "status": { "enum": ["pending", "paid", "shipped", "delivered", "cancelled"] },
      "paymentInfo": { "bsonType": ["object", "null"] },
      "createdAt": { "bsonType": "date" },
      "updatedAt": { "bsonType": "date" }
    }
  }
}

Mongoose model shape (informational)
- _id: ObjectId
- userId: ObjectId (ref users), indexed
- items: [ { productId, quantity, priceAtPurchase } ]
- totalPrice: Number (computed server-side)
- shippingAddress: object with required fields
- status: enum
- paymentInfo: optional
- timestamps: createdAt, updatedAt

Indexes
- userId: { userId: 1 }
- status: { status: 1 }
- createdAt: { createdAt: 1 }

Notes
- Server MUST recompute totalPrice and verify stock before creating order.
- Use transactions (replica set) to atomically decrement stock and create order.
- Store priceAtPurchase to preserve historical pricing.

Relationships & transactions
--------------------------
- Approach: reference-based (no heavy embedding)
  - orders.userId references users._id
  - orders.items[].productId references products._id
- Use MongoDB transactions (replica set) for multi-document operations:
  - Place order workflow should:
    1. Validate each product isActive and has sufficient stock.
    2. Atomically decrement stock for each product.
    3. Create order with items and priceAtPurchase.
    4. Commit transaction (or abort and roll back on error).
- Avoid storing full product copies in orders (store necessary snapshot fields like priceAtPurchase and product title if required for display/history).

Indexing summary
----------------
- users:
  - { email: 1 } unique
- products:
  - { title: "text" }
  - { isActive: 1 }
- orders:
  - { userId: 1 }
  - { status: 1 }
  - { createdAt: 1 }

Backup & operational notes
--------------------------
- Run daily automated backups (mongodump or managed snapshot) and store off-server (S3 or similar).
- Use replica sets for high availability and to enable transactions.
- Restrict MongoDB network access to internal Docker/K8s network; do not expose publicly.
- Use strong credentials and rotate them periodically.
- Monitor disk usage and oplog size.

Migration & versioning guidance
-------------------------------
- Add a schemaVersion field to collections if you plan to migrate documents over time.
- Write idempotent migration scripts (node scripts or mongosh) and keep them in /migrations with versioned filenames.
- Before applying destructive migrations, run in staging and verify with automated tests.

Example createCollection commands (mongosh)
-------------------------------------------
db.createCollection("users", { validator: <paste users JSON Schema> });
db.createCollection("products", { validator: <paste products JSON Schema> });
db.createCollection("orders", { validator: <paste orders JSON Schema> });

Index creation examples (mongosh)
--------------------------------
db.users.createIndex({ email: 1 }, { unique: true });
db.products.createIndex({ title: "text" });
db.products.createIndex({ isActive: 1 });
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: 1 });

Document retention & GDPR notes
-------------------------------
- If you must implement user data deletion (GDPR), prefer soft-delete flags and a background purge pipeline that removes PII while keeping order integrity (e.g., anonymize user fields but keep order history).
- Maintain an audit trail for admin actions and order changes.

Change control
--------------
- All schema changes MUST be versioned and applied via migration scripts.
- Tests MUST cover migrations (up and down when applicable).
- Document schema changes in CHANGELOG or migration notes.

Contact & ownership
-------------------
- DB Owner: [assign name/team]
- Security Owner: [assign name/team]
- For urgent DB incidents, follow incident response runbook in /docs/INCIDENT_RESPONSE.md.

End of document
---
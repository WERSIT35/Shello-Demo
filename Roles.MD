User and Admin Roles — Shello
=============================

Purpose
-------
Define the application roles, permissions, and operational rules for Shello. This file documents what users and admins can and cannot do, authorization enforcement rules, and best practices for implementing and auditing role-based access control (RBAC).

Overview
--------
Roles:
- user — regular customer who can browse products, manage their account, place orders, and view their own order history.
- admin — privileged operator who can manage products, view and manage all orders, and perform administrative tasks.

Principles
----------
- Principle of least privilege: grant only the permissions necessary for a role to perform required tasks.
- Server-side enforcement: all permissions MUST be enforced on the backend. Client-side checks (UI gating) are helpful for UX but are not security controls.
- Auditability: administrative actions MUST be logged with actor ID, timestamp, IP/user-agent, and reason when appropriate.
- Separation of duties: sensitive actions (e.g., changing order financials, database migrations, production deployments) SHOULD require elevated privileges and ideally be done by separate roles or require multi-person approval.

Role definitions
----------------

1) user (customer)
- Purpose:
  - Primary consumer of Shello's storefront.
- Allowed actions:
  - Register, verify email (if enabled), login, and logout.
  - Read product listings and product details (only products where isActive = true).
  - Add items to cart (client-side).
  - Create orders (place checkout) — server validates price/stock and creates order.
  - View their own orders and order details.
  - Cancel their own orders while status = pending (subject to business rules).
  - Manage account profile (name, contact info, shipping addresses).
  - Change own password and manage active sessions (view/revoke refresh tokens).
- Forbidden actions:
  - Cannot access other users’ personal data or orders.
  - Cannot access admin endpoints (product creation, inventory management, order status updates).
  - Cannot modify product data, prices, or stock.
- Enforcement notes:
  - All user-scoped endpoints MUST verify that req.user._id === resource.ownerId (or equivalent).
  - Pagination and rate-limits should be applied to user endpoints.

2) admin (operator)
- Purpose:
  - Manage product catalog, inventory, orders, and perform administrative tasks.
- Allowed actions:
  - All user actions (view products, view orders).
  - Create, update, archive (soft-delete) products.
  - Adjust product stock and inventory metadata.
  - View and update order statuses (paid, shipped, delivered, cancelled).
  - View all users and their order histories (for customer support).
  - Revoke user sessions or force password resets (for compromised accounts).
  - Access admin dashboard and management APIs.
- Elevated restrictions and controls:
  - Admin actions that affect finances, inventory, or user data MUST be logged (who, when, what changed).
  - Actions that result in refunds, manual price adjustments, or order financial changes SHOULD require an audit trail and possibly a secondary approval workflow.
  - Admin credentials MUST use stronger security controls (MFA recommended) and stricter rate-limiting.
- Forbidden actions:
  - Admins SHOULD NOT directly modify completed order payment records in a way that conflicts with payment provider records; instead, use refund workflows tied to payment provider APIs.
  - Super-admin or privileged ops tasks (database migrations, infra changes) SHOULD be restricted to separate operational roles, not general admins.
- Enforcement notes:
  - All admin routes MUST be protected by role-based middleware and additional checks (e.g., verify user still active in DB).
  - For high-risk admin actions, require re-authentication or MFA.

Permission matrix (summary)
---------------------------
- Read product (isActive=true): user, admin
- Create product: admin
- Update product: admin
- Adjust stock: admin
- Create order: user (server verifies)
- View own orders: user
- View any order: admin
- Update order status: admin
- Cancel own pending order: user (if allowed by business rules)
- Revoke user sessions: admin
- Manage users (create/delete/admin promote): admin (or restricted super-admin)
- Access backups / DB credentials: ops only (not regular admin)

API Design & Enforcement Guidelines
----------------------------------
- Role claim in JWT:
  - Tokens MAY include a role claim for performance, but server SHOULD verify role and user status with DB for sensitive operations.
- Middleware:
  - Implement authenticate middleware that verifies JWT and attaches user record to req.user.
  - Implement requireRole(...roles) middleware that checks req.user.role and returns 403 if unauthorized.
  - For user-scoped resources, implement ownership checks:
    - Example: GET /orders/:id → load order, check order.userId === req.user._id OR req.user.role === 'admin'
- Granular permissions:
  - If your application grows, consider moving to a permissions model with specific permissions (e.g., product:create, order:update_status) stored in roles or a separate permissions collection.
- Audit logging:
  - Log admin actions with: actorId, actorEmail, endpoint, requestBodyDiff (or summary), timestamp, ip, userAgent.
  - Store logs in immutable store or centralized logging system with retention policy.

Operational controls
--------------------
- Admin onboarding:
  - Use invitation flow; new admin accounts MUST be approved by existing admin or security owner.
- MFA:
  - Strongly recommend enabling MFA (TOTP or WebAuthn) for admin accounts.
- Periodic review:
  - Quarterly review of admin accounts and privileges; remove or downgrade inactive admins.
- Least-privilege:
  - Use scoped roles for operations (e.g., support-admin vs catalog-admin) as the team grows.
- Emergency access:
  - Implement break-glass procedure for emergency super-admin access with approval and audit trail.

Example code snippets (conceptual)
---------------------------------
- requireRole middleware (conceptual):
  - function requireRole(...roles) {
      return (req, res, next) => {
        if (!req.user) return res.status(401).send();
        if (!roles.includes(req.user.role)) return res.status(403).send();
        next();
      };
    }
- Ownership check pattern:
  - const canAccessOrder = (req.user.role === 'admin') || (order.userId.equals(req.user._id));
  - if (!canAccessOrder) return res.status(403).send({ error: 'Forbidden' });

Testing & audits
----------------
- Tests:
  - Unit and integration tests for every protected route verifying:
    - Non-authenticated requests → 401.
    - Authenticated user without role → 403 for admin routes.
    - Admin user allowed on admin routes.
    - Ownership checks: user cannot access others’ resources.
- Audit:
  - Periodic review of audit logs focusing on admin actions and high-risk operations.
  - Alerts for suspicious behavior (admin account login from unusual IP, rapid admin changes).

Change control & role evolution
-------------------------------
- Any change to role definitions or permissions MUST be documented, reviewed by security owner, and applied via migration scripts if they affect stored role data.
- Introduce new roles (or permissions) incrementally and map them in the permission matrix.

Document maintenance
--------------------
- This file MUST be reviewed whenever RBAC or admin functionality changes, or at least quarterly.
- Assign ownership: Security Owner and Product Owner should approve major role changes.

End of document
---
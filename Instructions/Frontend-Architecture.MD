# Shello Full Frontend Architecture

**Framework:** Angular 21 (Standalone API)
**Architecture Style:** Standalone-first + Feature-based + Lazy-loaded Domains
**Goal:** Secure, scalable, showroom-style e-commerce platform

---

# 1. Architectural Principles

* Standalone-first (No NgModules)
* Feature-driven folder structure
* Lazy-loaded domains
* Clear separation of concerns
* No business logic inside shared UI
* Signals for lightweight state
* SSR-ready structure (optional future support)

# 1.1 Visual Direction (Dark Liquid Glass)

* Dark, glassy layers with soft translucency and blur
* Typography: Plus Jakarta Sans for all text
* Palette: deep charcoal base with cool cyan accent
* Subtle motion: gentle rise/fade for sections
* Spacious hero area for product storytelling
* Hero background imagery with dark overlay for legibility

---

# 2. Folder Structure

```
src/app/
│
├── core/
│   ├── interceptors/
│   ├── guards/
│   └── services/
│
├── shared/
│   ├── ui/
│   ├── directives/
│   └── pipes/
│
├── features/
│   ├── shop/
│   │   ├── product-list/
│   │   ├── product-detail/
│   │   ├── cart/
│   │   └── checkout/
│   │
│   ├── auth/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── user/
│   │   └── orders/
│   │
│   └── admin/
│       ├── dashboard/
│       ├── products/
│       ├── orders/
│       └── users/
│
├── layouts/
│   ├── public-layout/
│   └── admin-layout/
│
├── state/
│   ├── cart.store.ts
│   └── ui.store.ts
│
├── app.routes.ts
└── app.config.ts
```

---

# 3. Core Layer

Contains application-wide utilities only.

## Interceptors

* Auth interceptor (withCredentials: true)
* Global error interceptor

## Guards

* AuthGuard
* AdminGuard

## Services

* Token status check
* Notification service
* Storage abstraction (if needed)

No business logic allowed here.

---

# 4. Shared Layer

Reusable UI components only.

## UI Structure (Atomic Approach)

* atoms (button, input, badge)
* molecules (form-field, card, modal)
* organisms (navbar, table, sidebar)

Shared must not contain API logic.

---

# 5. Feature Domains

## Shop Domain

* Product listing grid (showroom style)
* Product detail page
* Cart page
* Checkout page

Cart managed via Angular Signals.

## Auth Domain

* Register page
* Login page
* Protected routes

## User Domain

* Order history
* Profile information

## Admin Domain

* Dashboard
* Product CRUD
* Order management
* User management

Admin routes lazy-loaded and guarded.

---

# 6. Routing Strategy

* Public routes lazy-loaded
* Admin routes lazy-loaded
* Role-based route protection
* Layout-based route composition

Example:

* / → Public Layout
* /admin → Admin Layout

---

# 7. State Management

Minimal global state:

* cart.store (signals)
* ui.store (loading/modals)

Avoid heavy state libraries unless scaling requires it.

---

# 8. Security Considerations in Frontend

* No JWT stored in localStorage
* All requests use withCredentials
* Admin routes guarded
* No sensitive logic in frontend
* Backend always validates critical actions

---

# 9. Scalability Readiness

This structure supports:

* Internationalization (i18n)
* Blog expansion
* Payment integration
* Multi-admin system
* SSR migration
* Monorepo migration (Nx)

---

Shello frontend is designed to be clean, secure, scalable, and production-ready.

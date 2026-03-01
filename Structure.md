# Shello Angular 21 Architecture

**Angular CLI:** 21.2.0\
**Node:** 20.19.1\
**Package Manager:** npm 10.8.2\
**Operating System:** Linux x64\
**Architecture Style:** Standalone-first + Feature-based + Domain-driven

------------------------------------------------------------------------

# 1. Architectural Overview

This project is built using:

-   Angular 21 Standalone API
-   Functional Providers
-   Route-based lazy loading
-   Signals-compatible state structure
-   SSR-ready design
-   Feature-driven domain separation

The system contains two major application domains:

-   Public Marketing Website
-   Admin CMS Panel

Both domains are strictly separated by routing and structural
boundaries.

------------------------------------------------------------------------

# 2. High-Level Folder Structure

    src/
    │
    ├── app/
    │   ├── app.config.ts
    │   ├── app.routes.ts
    │   ├── app.component.ts
    │
    │   ├── core/
    │   ├── data-access/
    │   ├── shared/
    │   ├── layouts/
    │   ├── features/
    │   └── state/
    │
    ├── assets/
    ├── styles/
    ├── environments/
    └── main.ts

------------------------------------------------------------------------

# 3. Detailed Architecture

## app/

Root application layer containing global configuration, routing, and
providers.

### app.config.ts

Registers: - provideRouter() - provideHttpClient() -
provideAnimations() - provideClientHydration() (if SSR enabled) - Global
interceptors and providers

Replaces traditional AppModule.

### app.routes.ts

Defines: - Public routes (lazy-loaded) - Admin routes (fully
lazy-loaded) - Route guards - Layout composition

------------------------------------------------------------------------

## core/

Purpose: Application infrastructure only.

    core/
    ├── config/
    ├── interceptors/
    ├── guards/
    ├── services/
    └── core.providers.ts

### config/

-   API configuration
-   Injection tokens
-   Environment providers

### interceptors/

-   auth.interceptor.ts
-   error.interceptor.ts

Handles JWT injection and global API error handling.

### guards/

-   auth.guard.ts
-   role.guard.ts

Controls route access.

### services/

Global utilities: - storage.service.ts - notification.service.ts -
theme.service.ts

No domain logic allowed here.

------------------------------------------------------------------------

## data-access/

Purpose: Domain API and business logic layer.

    data-access/
    ├── auth/
    ├── hero/
    ├── about/
    ├── services/
    ├── testimonials/
    ├── users/
    └── messages/

Each domain contains:

-   service (API calls)
-   models
-   optional store (signals/state)

Example:

    auth/
    ├── auth.service.ts
    ├── auth.store.ts
    └── auth.models.ts

------------------------------------------------------------------------

## shared/

Purpose: Reusable UI components only (no business logic).

    shared/
    ├── ui/
    ├── directives/
    └── pipes/

### ui/ (Atomic Design Structure)

    ui/
    ├── atoms/
    ├── molecules/
    └── organisms/

#### atoms/

-   button/
-   input/
-   badge/
-   icon/

#### molecules/

-   form-field/
-   card/
-   modal/

#### organisms/

-   table/
-   navbar/
-   sidebar/

------------------------------------------------------------------------

## layouts/

Separate layout systems prevent structural and style collision.

    layouts/
    ├── public-layout/
    └── admin-layout/

Each layout contains its own structural components such as header,
footer, navbar, and sidebar.

------------------------------------------------------------------------

## features/

Contains page-level logic and route definitions.

    features/
    ├── public/
    └── admin/

### public/

    public/
    ├── home/
    │   ├── home.page.ts
    │   └── sections/
    │       ├── hero-section/
    │       ├── about-section/
    │       ├── services-section/
    │       └── testimonials-section/
    ├── contact/
    └── public.routes.ts

### admin/

    admin/
    ├── dashboard/
    ├── auth/
    │   └── login.page.ts
    ├── hero-management/
    │   ├── list.page.ts
    │   ├── create.page.ts
    │   └── edit.page.ts
    ├── services-management/
    ├── testimonials-management/
    ├── users/
    ├── messages/
    └── admin.routes.ts

Each management domain follows a list/create/edit pattern to avoid
monolithic components.

------------------------------------------------------------------------

## state/

Optional global state layer.

    state/
    ├── app.store.ts
    └── ui.store.ts

Used for global UI state, application-wide signals, or centralized state
management.

------------------------------------------------------------------------

# 4. Assets Structure

    assets/
    ├── images/
    ├── icons/
    ├── fonts/
    └── i18n/

Supports localization and design assets.

------------------------------------------------------------------------

# 5. Styles Architecture (Modified 7-1 Pattern)

    styles/
    ├── abstracts/
    ├── base/
    ├── layout/
    ├── components/
    ├── themes/
    └── main.scss

## abstracts/

-   variables
-   colors
-   spacing scale
-   breakpoints
-   mixins
-   functions

## base/

-   reset
-   typography
-   global rules
-   animations

## layout/

-   grid
-   containers
-   layout-specific structure

## components/

-   buttons
-   forms
-   cards
-   tables
-   modals

## themes/

-   public theme
-   admin theme

------------------------------------------------------------------------

# 6. Scalability Support

This structure supports:

-   JWT authentication
-   Role-based access control
-   Multi-admin systems
-   Blog or e-commerce expansion
-   Internationalization
-   State management integration
-   SSR (Angular Universal)
-   Future monorepo migration

------------------------------------------------------------------------

# 7. Architectural Principles

-   Standalone-first
-   Lazy-loaded domains
-   Clear layer separation
-   No business logic in shared
-   No UI in core
-   Fully scalable and maintainable
-   Enterprise-ready organization

------------------------------------------------------------------------

# End of Document
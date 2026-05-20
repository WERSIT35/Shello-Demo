# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## i18n (Georgian + English)

This project uses Angular compile-time i18n. Georgian (ka) is the default build, and English (en) is a separate build.

Run both builds in two terminals for language switching during development:

```bash
# Terminal 1 (Georgian)
npm run start:ka

# Terminal 2 (English)
npm run start:en
```

Open:
- Georgian: http://localhost:4200/
- English: http://localhost:4201/

`/en/` also works, but local language switching sends English traffic to port `4201` directly.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Static mode (frontend-only / Vercel)

The frontend supports two runtime modes, switchable without code changes:

| Mode            | How to enable                                    | What it does                                                              |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| Full-stack      | set `SHELLO_STATIC_MODE=false` on Vercel or `staticMode = false` locally | Calls the backend API for products, content, auth, orders, admin.        |
| Static (no API) | set `SHELLO_STATIC_MODE=true`                    | Renders a local catalog only. No network calls. Auth/checkout/admin off. |

### What static mode disables

- Login, register, Google login, 2FA, profile, orders, every `/admin/*` route.
- Checkout submission and "Add to cart" / "Checkout" CTAs (replaced with a small "Ordering temporarily unavailable" notice on shop pages).
- All HTTP calls to the backend (`AuthService`, `ProductsService`, `ContentService`, `OrdersService` short-circuit to local data or noop; the HTTP interceptor also blocks any missed `/api/v1` request as a final safeguard).

The landing page, shop list, and product detail pages remain fully usable and read from local data.

### Editing the static catalog

All shop content in static mode comes from a single file:

```
frontend/src/app/data/products.static.ts
```

Each product has these fields:

```ts
{
  id: 'aurora-shell-15-pro',  // slug used in /products/:id
  name: 'Aurora Shell',
  brand: 'Shello',
  model: 'iPhone 15 Pro',
  price: 89,
  image: 'https://...jpg',     // main image (https URL or /assets/... path)
  description: 'Satin-finish shell...',
  category: 'Slim',
  inStock: true,
  extraImages: [],             // optional, additional gallery images
  color: 'Graphite',           // optional
  caseType: 'Slim'             // optional
}
```

The same file also exports `STATIC_HERO_EN` / `STATIC_HERO_KA` (homepage hero copy) and the `STATIC_HERO_PRODUCT_IDS` / `STATIC_SUGGESTED_PRODUCT_IDS` arrays that pick which products appear on the landing page.

Add or edit entries, rebuild, redeploy. No backend code is touched.

### Local development in static mode

Open `frontend/public/shello-config.js` and set `staticMode = true`:

```js
window.__SHELLO_CONFIG__ = window.__SHELLO_CONFIG__ || {};
window.__SHELLO_CONFIG__.staticMode = true;
```

Then `ng serve` as usual. For this temporary static phase, this local file is set to `true` so `ng serve` does not try to proxy backend calls. Set it back to `false` to develop against the backend again.

### Deploying to Vercel

The repo already ships with `frontend/vercel.json`. Point the Vercel project at the `frontend/` directory and:

1. In Vercel → Project → Settings → Environment Variables, set:
   - `SHELLO_STATIC_MODE` = `true`
2. Trigger a deploy.

`scripts/prepare-vercel-output.mjs` reads that env var at build time and rewrites `dist/frontend/vercel/shello-config.js` (and the `/ka/` and `/en/` mirrors) so the deployed bundle boots in static mode. No backend or environment outside Vercel is required.

The `vercel.json` rewrites for `/api/*` and `/uploads/*` are harmless in static mode (the app never fires those requests) and stay in place so you can switch back to full-stack later.

### Switching back to full-stack mode

1. In Vercel → Project → Settings → Environment Variables, change `SHELLO_STATIC_MODE` to `false` (or delete it).
2. Trigger a deploy.

That's the entire revert. The backend services, guards, auth flow, and admin routes are untouched on disk — they just stop being short-circuited once the runtime flag is `false`.


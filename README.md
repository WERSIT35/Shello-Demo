# Shello Demo

Shello Demo is a full-stack e-commerce app for phone cases. It includes an Express + TypeScript API with MongoDB and an Angular SSR frontend. Features include authentication (JWT + refresh cookies), Google OAuth popup sign-in, product and order management, and an admin dashboard for content and catalog updates.

## Tech Stack

- Backend: Node.js, Express, TypeScript, Mongoose, JWT, bcrypt
- Frontend: Angular (SSR), RxJS, SCSS
- Database: MongoDB

## Project Structure

- Backend/server/        API server (Express + TypeScript)
- frontend/              Angular SSR app
- *.MD                   Architecture and security docs

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+
- MongoDB running locally (or a remote MongoDB URI)

## Quick Start

### 1) Backend

```bash
cd Backend/server
npm install
```

Create a .env file (see example below), then run:

```bash
npm run dev
```

The API will run on http://localhost:4000 by default.

### 2) Frontend

```bash
cd frontend
npm install
ng s
```

The frontend will run on http://localhost:4200 and proxies /api and /uploads to the backend.

## Environment Variables (Backend)

Create Backend/server/.env using the example below and adjust values as needed.

```env
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb://localhost:27017/shello_db
JWT_SECRET=replace-with-strong-secret
REFRESH_SECRET=replace-with-strong-secret
REFRESH_TOKEN_HMAC_KEY=replace-with-strong-secret
FRONTEND_URL=http://localhost:4200
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
TRUST_PROXY=0

SUPER_ADMIN_EMAIL=admin@shello.local
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_PIN_CODE=000001
SUPER_ADMIN_NAME=Shello
SUPER_ADMIN_LAST_NAME=Admin
ADMIN_RESET_PASSWORD=Otariko123!

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4200/api/v1/auth/google/callback
GOOGLE_ALLOWED_ORIGIN=http://localhost:4200
```

## Google OAuth Setup

1) Create OAuth credentials in Google Cloud Console.
2) Add the redirect URI:
   - http://localhost:4200/api/v1/auth/google/callback
3) Add the frontend origin:
   - http://localhost:4200
4) Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Backend/server/.env.

## Scripts

Backend (Backend/server):
- npm run dev

Frontend (frontend):
- ng s
- ng build

## Docs

See the architecture and security docs in the repository root:
- Overall-Architecture.MD
- Backend-Architecture.MD
- Frontend-Architecture.MD
- SECURITY_STANDARDS.MD
- JWT_STRATEGY.md

## Notes

- Refresh tokens are stored in httpOnly cookies.
- Google sign-in uses a popup flow with a localStorage fallback to handle COOP restrictions.

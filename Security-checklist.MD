# Shello Pre-Launch Security Checklist

This checklist must be completed before deploying Shello to production.

---

# 🔐 Backend Security Checklist

## Authentication & Authorization

* JWT stored in httpOnly, Secure, SameSite=Strict cookies
* Access Token expiration ≤ 15 minutes
* Refresh Token rotation implemented
* Strong JWT secrets (32+ characters)
* bcrypt hashing with 12+ salt rounds
* Role-based access control enforced server-side
* Admin routes protected with role middleware

## API Protection

* Helmet enabled
* Rate limiting configured (login + global API)
* Strict CORS policy (no wildcard origins)
* All endpoints validated (Zod/class-validator)
* Centralized error handling (no stack traces in production)
* Request size limits configured

## Order & Business Logic Integrity

* Backend recalculates product price
* Product stock verified before order creation
* Frontend pricing ignored
* Order status updates restricted to admin

## Database Security

* MongoDB NOT publicly exposed
* Authentication enabled for MongoDB
* Strong database credentials
* Mongo running inside private Docker/K8s network
* Regular backups configured

## Secrets Management

* No secrets committed to Git
* .env excluded from repository
* Production secrets stored securely (VPS/K8s Secrets)

---

# 🖥 Frontend Security Checklist

## Build & Production

* Angular production build enabled
* Source maps disabled
* No console logs
* No debug endpoints exposed

## Authentication Handling

* No JWT stored in localStorage or sessionStorage
* Cookies used with credentials: true
* Route guards implemented (Auth + Admin)

## Browser Protection

* Content Security Policy (CSP) enabled
* X-Frame-Options enabled
* Strict-Transport-Security enabled
* Referrer-Policy configured

---

# 🌍 Infrastructure Security Checklist

## Network

* HTTPS only (HTTP redirected to HTTPS)
* SSL certificate active and valid
* Cloudflare enabled (WAF + DDoS protection)
* VPS firewall configured (only 80/443 open)

## Docker

* Containers running as non-root user
* Mongo port not exposed publicly
* Minimal base images used (node:alpine)
* Health checks configured

## Monitoring & Logging

* Backend logging enabled
* Login attempts logged
* Admin actions logged
* Uptime monitoring active

---

# 🚨 Final Go-Live Verification

* Test login brute-force protection
* Test order price manipulation attempt
* Test unauthorized admin route access
* Test expired token behavior
* Verify cookies are httpOnly
* Verify HTTPS certificate validity

---

Shello should NOT go live unless every item above is verified.

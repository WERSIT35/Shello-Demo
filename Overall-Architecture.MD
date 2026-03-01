# Shello Security-First Architecture

**Frontend:** Angular 21 (Standalone)
**Backend:** Node.js + Express + TypeScript
**Database:** MongoDB
**Infrastructure:** Docker + Kubernetes Ready
**Primary Goal:** Maximum Customer Security

---

# 1. System Overview

Shello is built with a strict security-first architecture designed to protect customer data, prevent attacks, and ensure safe online purchases.

```
Client (Browser)
        ↓ HTTPS
Cloudflare (WAF + DDoS Protection)
        ↓
Reverse Proxy (Nginx / Ingress)
        ↓
Angular Frontend (Static Build)
        ↓
Node Express API (Hardened)
        ↓
MongoDB (Private Network Only)
        ↓
Secure Email Provider (API Key Protected)
```

All communication is encrypted via HTTPS.

---

# 2. Frontend Security (Angular)

## 2.1 Authentication Strategy

* JWT stored in **httpOnly secure cookies**
* No localStorage token storage
* SameSite: Strict
* Secure: true (HTTPS only)
* Short-lived access tokens
* Refresh token rotation

## 2.2 Route Protection

* AuthGuard for authenticated routes
* AdminGuard for admin-only routes
* Role verification on every protected route

## 2.3 Content Security Policy (CSP)

Strict CSP headers enabled to prevent XSS attacks.

Example policy:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' https:;
```

## 2.4 Production Hardening

* Angular production mode enabled
* Debug logs removed
* Source maps disabled

---

# 3. Backend Security (Node + Express)

## 3.1 Authentication & Authorization

* bcrypt with 12+ salt rounds
* Strong JWT secret (32+ characters)
* Access token expiration (15 minutes)
* Refresh token rotation
* Role-Based Access Control (RBAC)

Admin endpoints verify role server-side.

---

## 3.2 Rate Limiting

Prevents brute-force and abuse attacks.

* Login: 5 attempts per 15 minutes
* General API: 100 requests per 15 minutes

---

## 3.3 Input Validation

All incoming data validated server-side using:

* Zod or class-validator

Validated fields include:

* Email format
* Password strength
* Order details
* Shipping information

Frontend data is never trusted.

---

## 3.4 Secure Headers (Helmet)

Helmet middleware enabled to add:

* XSS Protection
* HSTS
* Frameguard
* DNS Prefetch Control
* Content-Type protection

---

## 3.5 Strict CORS Policy

Only allow production domain:

* No wildcard origins
* Credentials enabled

---

## 3.6 Order Integrity Protection

When creating an order:

* Backend recalculates total price
* Product price fetched from database
* Frontend price ignored

Prevents price manipulation attacks.

---

# 4. Payment Security

Shello does NOT store card details.

Recommended providers:

* Stripe
* PayPal

All PCI compliance handled by payment provider.

---

# 5. Database Security (MongoDB)

* MongoDB not exposed to public internet
* Runs inside private Docker/Kubernetes network
* Authentication enabled (username + password)
* No root access exposed

---

# 6. Email Security

* API keys stored in environment variables
* No hardcoded credentials
* Email provider 2FA enabled
* Order notifications sent securely

---

# 7. Docker Security

Production container rules:

* Use node:20-alpine (minimal image)
* No root user inside containers
* MongoDB port not exposed publicly
* Separate frontend and backend networks

---

# 8. Kubernetes Security (Optional Production Setup)

* Kubernetes Secrets (no plain env variables)
* Network Policies enabled
* Private Mongo service
* TLS via Ingress
* Cert-manager for SSL automation

---

# 9. Global Hosting Security

Recommended production stack:

Cloudflare (SSL + WAF + DDoS)
↓
Nginx Reverse Proxy
↓
Dockerized Node API
↓
Private MongoDB

VPS firewall enabled.
Fail2Ban configured.

---

# 10. Advanced Security Enhancements

* 2FA for admin accounts
* Login notification emails
* Admin IP whitelist (optional)
* Audit logs for admin actions
* Automatic logout on inactivity
* CSRF protection
* CAPTCHA on login/register

---

# 11. Logging & Monitoring

* Winston for backend logging
* PM2 process manager
* Uptime monitoring
* Error tracking system

---

# 12. Security Rules (Never Break These)

* Never store JWT in localStorage
* Never expose MongoDB publicly
* Never hardcode secrets
* Never trust frontend prices
* Never allow HTTP (HTTPS only)
* Never disable validation

---

# Final Architecture Summary

Frontend:

* Angular Standalone
* httpOnly cookies
* Strict guards
* CSP enabled

Backend:

* JWT + refresh rotation
* bcrypt 12+
* Helmet
* Rate limiting
* Input validation
* Role middleware
* Strict CORS

Infrastructure:

* Dockerized
* Mongo private network
* Cloudflare protection
* HTTPS only
* Environment secrets
* VPS firewall enabled

---

Shello is designed to prioritize customer data protection, transaction safety, and production-level security best practices.

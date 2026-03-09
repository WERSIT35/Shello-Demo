# Shello – Development Roadmap (Security-First)

This roadmap defines the correct execution order for building Shello with security as the highest priority.

---

# Phase 1 – Architecture & Planning

## Goals

* Define complete system architecture
* Design database schema
* Define authentication strategy
* Define security standards

## Tasks

* Finalize frontend/backend separation
* Design MongoDB collections
* Define User/Admin roles
* Define JWT strategy (access + refresh)
* Define password hashing policy (bcrypt 12+ rounds)
* Define API contract

Deliverables:

* Project Overview MD
* Backend Architecture MD
* Frontend Architecture MD
* Database Schema MD

---

# Phase 2 – Backend Core (Build Secure First)

## Step Order

1. Setup Node.js + Express + TypeScript
2. Setup MongoDB connection
3. Create User model
4. Implement Register (hashed passwords)
5. Implement Login (JWT in httpOnly cookies)
6. Create Auth middleware
7. Create Role middleware (admin protection)
8. Enable Helmet
9. Enable strict CORS
10. Enable rate limiting
11. Add request validation

Then:

* Product CRUD (admin protected)
* Order creation (server-side price validation)
* Order status update (admin only)

Deliverable:

* Secure REST API ready for frontend

---

# Phase 3 – Frontend Development

## Step Order

1. Setup Angular production architecture
2. Create authentication pages
3. Create product listing & details
4. Implement cart logic
5. Implement route guards (Auth + Admin)
6. Connect to backend using credentials: true
7. Production build testing

Rules:

* No JWT in localStorage
* No business logic trusted from frontend

Deliverable:

* Secure frontend connected to backend

---

# Phase 4 – Containerization

1. Create backend Dockerfile
2. Create frontend Dockerfile
3. Setup Docker Compose
4. Keep MongoDB inside private network
5. Run containers as non-root
6. Add health checks

Deliverable:

* Production-ready containerized system

---

# Phase 5 – Infrastructure Deployment

1. Purchase domain
2. Setup VPS (Ubuntu)
3. Configure firewall (22, 80, 443 only)
4. Install Docker
5. Deploy containers
6. Configure Nginx reverse proxy
7. Install SSL (Let's Encrypt)
8. Force HTTPS
9. Enable Cloudflare (WAF + DDoS)

Deliverable:

* Live secure production system

---

# Phase 6 – Pre-Launch Security Audit

* Test brute-force protection
* Test price manipulation attempts
* Test admin route access
* Test expired tokens
* Run npm audit
* Verify HTTPS rating

Only after passing all checks → launch.

---

# Phase 7 – Post-Launch Monitoring

* Enable logging
* Monitor server resources
* Enable automated backups
* Weekly dependency updates
* Monthly security review

Security is continuous, not one-time.

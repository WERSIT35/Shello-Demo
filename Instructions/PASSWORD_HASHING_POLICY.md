Password Hashing Policy — Shello
================================

Purpose
-------
Define required standards and operational guidance for hashing and storing user passwords in Shello. This policy ensures passwords are stored securely, supports future algorithm updates, and provides verification and incident handling procedures.

Scope
-----
Applies to all systems and code paths that accept, process, store, or verify user passwords for Shello (web, mobile, backend services, auth microservices, and migration scripts). Does not apply to third-party identity providers (OAuth/OIDC) except when integrating and mapping external identities.

Policy Statements (MUST)
------------------------
1. Hashing algorithm
   - Passwords MUST be hashed with bcrypt.
   - The bcrypt cost (rounds) MUST be at least 12 in production environments.
   - Use a well-maintained library (bcrypt or bcryptjs) from a trusted package registry.

2. Unique salts
   - Use bcrypt’s built-in per-password salt generation. Do NOT reuse salts across users.

3. No plaintext storage or logging
   - Passwords MUST NEVER be stored or transmitted in plaintext after initial receipt.
   - Avoid logging raw passwords at any point (request logs, error logs, debug output).

4. Secure handling in transit
   - All password transmission MUST occur over TLS (HTTPS). Clients MUST not submit passwords over insecure channels.

5. Hash storage
   - Store only the bcrypt hash (including salt and cost) in the users collection.
   - The password field MUST be excluded from default API responses (e.g., set select: false in Mongoose) and from logs.

6. Password verification
   - Use bcrypt.compare when verifying passwords.
   - Do NOT implement custom comparison functions that bypass constant-time semantics.

7. Rate limiting
   - Apply rate-limiting and progressive delays or account lockout after repeated failed password attempts to mitigate brute-force attacks.

8. Password complexity & policy
   - Enforce a reasonable password policy at registration / change time (server-side):
     - Minimum length: 8 characters (recommend 12 for stronger security)
     - Encourage passphrases or longer passwords.
     - Consider checks against common-password lists (e.g., use the OWASP top 10k) and disallow extremely common passwords.
   - Do NOT implement overly strict composition rules that reduce entropy (e.g., requiring unusual symbol placement) — prefer length and entropy.

9. Migration & algorithm agility
   - Store metadata as needed to identify hashing algorithm and parameters if you may change algorithm later (e.g., store bcrypt cost).
   - Implement transparent upgrade path:
     - On successful login, if stored hash uses weaker parameters (e.g., rounds < current standard), re-hash password with the new parameters and update the stored hash.
   - Plan for future algorithm migration (e.g., to Argon2) via a versioned hash scheme:
     - Example stored hash format: { algorithm: "bcrypt", cost: 12, hash: "<bcrypt-hash>" } or store algorithm in separate DB field.

10. Secret & dependency management
    - Use libraries from trusted sources; pin versions or use an approved dependency update policy.
    - Run dependency vulnerability scanning routinely.

Implementation Guidance (HOW)
----------------------------
1. Using bcrypt in Node.js (example notes)
   - Choose library: bcrypt (native bindings) for performance, or bcryptjs (pure JS) if avoiding native builds.
   - Example flow (pseudocode):
     - const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
     - const hash = await bcrypt.hash(password, saltRounds);
     - store hash in DB
     - To verify: const ok = await bcrypt.compare(passwordInput, storedHash);

2. Configuration
   - BCRYPT_ROUNDS environment variable:
     - Default: 12
     - Allow ops to increase for production hardware as needed.
     - Document in deployment config and ensure CI does not lower this value accidentally.

3. Timing & performance
   - Understand bcrypt cost affects CPU and latency. Benchmark bcrypt.hash with desired rounds on production-like hardware to ensure acceptable user login/registration latency.
   - Consider using background workers or rate-limiting to prevent CPU exhaustion from mass hashing requests.

4. Handling password resets
   - When user resets password, hash new password with current rounds before storing.
   - Invalidate existing refresh tokens / sessions after password change (increment tokenVersion or set lastPasswordChangeAt).

5. Account lockout & progressive delays
   - Track failed login attempts and apply:
     - Progressive delays (e.g., 100ms doubling) or
     - Temporary account lockout after N failures (e.g., 5 attempts → 15-minute lock)
   - Store counters in Redis for distributed environments.

6. Testing & QA
   - Add unit tests for hashing and verification logic.
   - Test migration flow: login with old hash triggers re-hash with new cost.
   - Performance tests on hashing (ensure acceptable response times).

Audit & Verification (MUST)
---------------------------
- Code review:
  - Ensure hashing is implemented via bcrypt and that plaintext values are not logged or stored.
- Configuration review:
  - Ensure BCRYPT_ROUNDS >= 12 in production envs.
- DB review:
  - Confirm no plaintext passwords stored in database snapshots.
- Periodic checks:
  - Quarterly review of hashing parameters and upgrade plan.
- Pen-testing:
  - Include password-related attack vectors in penetration testing (brute-force simulation, timing attacks).

Incident Response
-----------------
- If a password database compromise is suspected:
  - Immediately rotate secrets and increase monitoring.
  - Force password reset for affected users and invalidate all sessions (increment tokenVersion / revoke refresh tokens).
  - Preserve forensic logs and follow the incident response runbook.
  - Notify affected users per legal and policy requirements.

Appendix & Recommendations
--------------------------
- Consider Argon2 in future:
  - Argon2 (Argon2id) is recommended by modern guidelines (memory-hard). Plan a migration path (hash versioning).
- Bcrypt rounds guidance:
  - 12 is the current minimum. As hardware changes, increase rounds and re-hash on login.
- Common-password blacklists:
  - Use a maintained list (e.g., from HaveIBeenPwned or OWASP) to block weak passwords.
- Use HTTPS and secure cookie flags to protect password transmission and session tokens.

Document maintenance
--------------------
- Review this policy at least annually and after any security incident, or when major cryptographic recommendations change.
- Record changes and rationale in the project changelog.

End of document
---
# Security Audit — Hemisphere Learning App

## Date: 2026-02-15
## Standard: OWASP Top 10

### A01 — Broken Access Control
**Status: Mitigated**
- JWT-based authentication enforced via `authMiddleware` on all protected routes.
- Role-based access control via `requireRole` middleware (learner, moderator, admin).
- Refresh token rotation with reuse detection: if a revoked token is replayed, all tokens for that user are revoked immediately.
- No direct object references exposed; UUIDs used for all resource IDs.

### A02 — Cryptographic Failures
**Status: Mitigated**
- Passwords hashed with bcrypt (10 rounds) — never stored in plaintext.
- JWT signed with HS256; secret sourced from `JWT_SECRET` env variable (not hardcoded in production).
- Access tokens short-lived (15 minutes); refresh tokens expire after 30 days.
- HTTPS enforced in production via `Strict-Transport-Security` header.

### A03 — Injection
**Status: Mitigated**
- All database queries use Drizzle ORM with parameterised query building — no raw SQL concatenation.
- Input validated via Zod schemas before any data reaches the database layer.
- Email and display name fields trimmed and length-capped at the schema level.

### A04 — Insecure Design
**Status: Partially mitigated**
- Threat model reviewed for auth flows; refresh token family invalidation implemented.
- Outstanding: formal threat modelling workshop not yet conducted.

### A05 — Security Misconfiguration
**Status: Mitigated**
- Security headers applied globally: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`.
- HSTS applied in production only.
- Default JWT secret is a clearly labelled dev-only placeholder; CI/CD checks should reject deployment without `JWT_SECRET` env var set.

### A06 — Vulnerable and Outdated Components
**Status: Ongoing**
- Dependencies managed via pnpm; `pnpm audit` run as part of CI.
- Outstanding: automated dependency update PRs (Dependabot / Renovate) not yet configured.

### A07 — Identification and Authentication Failures
**Status: Mitigated**
- Rate limiting on `/api/auth/login` and `/api/auth/signup`: 5 requests per 15 minutes per IP.
- Generic error messages returned for invalid credentials (no user enumeration via differential responses).
- `jti` (JWT ID) claim added to access tokens for future revocation support.

### A08 — Software and Data Integrity Failures
**Status: Partially mitigated**
- OAuth tokens verified against Google and Apple JWKS endpoints.
- Outstanding: subresource integrity (SRI) not yet applied to frontend assets.

### A09 — Security Logging and Monitoring Failures
**Status: Partial**
- Auth errors logged to stdout (captured by host logging infrastructure).
- Outstanding: structured audit log for sensitive actions (admin operations, token revocations).

### A10 — Server-Side Request Forgery (SSRF)
**Status: Low risk**
- No user-controlled URLs are fetched server-side in current feature set.
- JWKS endpoints are hardcoded to trusted Google and Apple URLs.

---

## Implemented Controls
- Rate limiting on auth endpoints (in-memory; Redis-backed for multi-instance deployments planned)
- Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS in production)
- JWT with expiry (15m access, 30d refresh with rotation and reuse detection)
- `jti` claim on access tokens for future per-token revocation
- Bcrypt password hashing (10 rounds)
- Input validation via Zod schemas (email trim/max, password max length, display name trim/max)
- Parameterised queries via Drizzle ORM (no raw SQL injection risk)
- OAuth token verification via remote JWKS (Google, Apple)

## Outstanding Items (pre-launch)
- [ ] Move to Redis-backed rate limiting for multi-instance deployments
- [ ] Implement Content-Security-Policy header
- [ ] Add audit logging for admin actions
- [ ] Configure automated dependency updates (Dependabot or Renovate)
- [ ] Conduct formal threat modelling workshop
- [ ] Penetration testing by third party
- [ ] Enforce `JWT_SECRET` env var presence at startup (fail-fast)
- [ ] Add SRI hashes for frontend static assets

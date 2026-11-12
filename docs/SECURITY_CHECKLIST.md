# SECURITY_CHECKLIST.md — EpiLens Security & Reliability Verification

Audit Date: 2026-11-12  
Status: Verified & Compliant

---

## 1. Authentication & Route Protection
- **Status:** **PASS**
- **Evidence:** `apps/web/src/middleware.ts` + `apps/web/src/lib/auth-helpers.ts` (`requireUser()`).
- All `(app)` pages (`/overview`, `/data`, `/model`, `/results`, `/scenarios`, `/runs`, `/methods`) and all mutative/querying `/api/*` handlers enforce session validation.
- Unauthenticated requests return `HTTP 401 Unauthorized` (or redirect to `/login` for HTML pages).
- Edge-safe NextAuth v5 split prevents Edge runtime crashes by keeping Prisma out of edge middleware.

---

## 2. Ownership Isolation
- **Status:** **PASS**
- **Evidence:** `apps/web/src/tests/security-auth.test.ts` (suite 4).
- Every database query for runs, datasets, scenarios, exports, and AI explanations specifies `{ id, ownerId: user.id }`.
- Cross-user mutation, deletion, or viewing is impossible; unauthorized access returns `404 Not Found` (to avoid resource enumeration) or `403 Forbidden`.

---

## 3. Upload Validation & Defense
- **Status:** **PASS**
- **Evidence:** `apps/compute/app/data/csv_io.py`, `apps/compute/tests/test_csv_io.py`.
- Enforces strict UTF-8 encoding, 10 MB maximum payload size, and 100,000 maximum row count.
- PII check rejects files containing patient identifiers (`name`, `aadhaar`, `phone`, `address`, `patient_id`).
- Region validation strictly verifies state code `PB` (Punjab, India).
- Negative correction algorithm guarantees lookback bounds (14 days) and immutably logs every transformation.

---

## 4. Server-Side Request Forgery (SSRF) Prevention
- **Status:** **PASS**
- **Evidence:** `apps/web/src/tests/security-auth.test.ts` (suite 1), `ARCHIVE_ALLOWLIST` in `packages/shared/src/constants.ts`.
- Remote archive ingestion permits HTTPS requests exclusively to `data.covid19india.org`.
- Internal IPs (`169.254.169.254`, `127.0.0.1`, `10.0.0.0/8`), external malicious domains (`evil.com`), and spoofed subdomains (`data.covid19india.org.evil.com`) are rejected before socket allocation.

---

## 5. Secrets Hygiene
- **Status:** **PASS**
- **Evidence:** Root `.gitignore` ignores `.env*` while preserving `.env.example`.
- Secrets (`AUTH_SECRET`, `COMPUTE_SHARED_SECRET`, `OPENROUTER_API_KEY`, `DATABASE_URL`) are read exclusively from environment variables on the server.
- No secrets are passed into client bundles (`NEXT_PUBLIC_` prefixes audited).
- ZIP bundle generator strictly audits generated `manifest.json` via `audit_manifest_security` and throws `ValueError` if local filesystem paths (`C:\Users`, `/home/`) or credential strings appear.

---

## 6. HTTP Security Headers
- **Status:** **PASS**
- **Evidence:** `apps/web/next.config.ts`.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (clickjacking defense)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Pragmatic Content Security Policy (`Content-Security-Policy`) allowing self scripts, Plotly eval/blob web workers, and KaTeX fonts.

---

## 7. Rate Limiting & Denial-of-Service Defense
- **Status:** **PASS**
- **Evidence:** `apps/web/src/app/api/ai/explain/route.ts` (10 requests/hour per user), `LIMITS.maxActiveJobsPerUser = 2`.
- Active analysis jobs are constrained to at most 2 concurrent runs per user (`HTTP 429 Too Many Requests`).
- Guest demo accounts auto-expire after 24 hours and are pruned by the daily cleanup cron.

---

## 8. Delete Semantics & Cascading Cleanup
- **Status:** **PASS**
- **Evidence:** `apps/web/src/app/api/runs/[id]/route.ts`, Prisma schema foreign keys.
- Deleting a run cascades to all dependent `Scenario`, `StoredFile`, `Export`, `SensitivityResult`, and `AiExplanation` records.
- Deleting a dataset referenced by existing runs is rejected (`HTTP 409 Conflict`), maintaining referential integrity.

---

## 9. Authorized Download Expiration
- **Status:** **PASS**
- **Evidence:** `apps/web/src/lib/exportToken.ts`, `apps/web/src/tests/security-auth.test.ts` (suite 2).
- Export download links use signed HMAC-SHA256 tokens expiring strictly in 300 seconds (5 minutes).
- Payload tampering or secret mismatch invalidates the token using constant-time verification (`timingSafeEqual`).

---

## 10. Compute Service Microservice Security
- **Status:** **PASS**
- **Evidence:** `apps/compute/app/core/auth.py`, `apps/compute/app/config.py`.
- Internal compute endpoints require `X-Compute-Secret` verified with `hmac.compare_digest`.
- CORS middleware restricts origins to `ALLOWED_ORIGINS` (web application host).
- JWT direct upload tokens expire in 120 seconds and are bound to upload scope.

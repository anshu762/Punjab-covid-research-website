# PHASE 6 — Methods page, UI consistency & bug-hunt pass, security, full verification, deployment, portfolio assets

**Prerequisite:** Phases 1–5 complete. Read `AGENTS.md`, then the whole `docs/PRD.md` once more, especially "Methods content" in "Required verification", "Security and data storage", "Performance and recovery", "Required verification".
**Goal:** ship-ready. Zero known bugs, one consistent premium UI, PRD fully traceable, deployed on Vercel + a Docker host with Neon, and portfolio-ready documentation.

---

## CHECKPOINT A — Methods page (`/methods`)

### Task 1 — Content and layout
Two-column layout on desktop (sticky table of contents on the left with scroll-spy, content right); single column on mobile with a collapsible ToC. Install `katex` (pin) and render equations with KaTeX (client component, `aria-label` with a plain-text version of each equation, copy-LaTeX button). Sections (anchor ids in parentheses):
1. **Purpose and scope** (`purpose`): what the site does; region fixed (Punjab, India, PB), disease COVID-19.
2. **Data provenance** (`data`): bundled archive source (COVID19India), **link to https://data.covid19india.org/documentation/csv/**, retrieval date/checksum pulled live from the user's current dataset (if any, otherwise static text), frozen-archive note, synthetic demo data explanation ("Demo data"), population provenance fields.
3. **Data cleaning rules** (`cleaning`): blanks are missing not zero; duplicates and missing dates block analysis; negative-correction algorithm (14-day window, most recent first, correction day set to zero, every adjustment logged, unresolved → blocked); per-prefix normalization to avoid leakage.
4. **Model equations** (`model`): the four ODEs with `C`; initial conditions; observation mapping `μ_d = ρ[C(t_d+1) − C(t_d)]`; `R_eff(t) = β(t)S(t)/(γN)`; "β/γ is an assumption-dependent model ratio"; piecewise β for the change-point model; **report-date approximation** (no explicit reporting-delay model) explained.
5. **Parameter definitions** (`parameters`): table — symbol, meaning, units, fixed/fitted/assumed, default, allowed range, bounds.
6. **Likelihood and fitting** (`fitting`): negative binomial mean/variance `μ + μ²/k`; bounded multi-start L-BFGS-B; seeds; solver tolerances; boundary-hit and convergence recording; **actual optimisation shortcuts used (warm starts, reduced starts in sensitivity)** — read these from `docs/DECISIONS.md` and state them truthfully.
7. **Change-point model** (`changepoint`): candidates every 7 days, ≥ 21 days each side, training data only; "represents a model change, not a verified policy event".
8. **Forecast evaluation protocol** (`evaluation`): 13 origins, 9 development / 4 final blocks, expanding window, baselines definitions, MAE/RMSE/total error definitions, frozen selection rules with exact thresholds (10 %, 6 of 9, 3 of 4), "project rules, not significance tests", retrospective validation on a revised archive.
9. **Uncertainty** (`uncertainty`): parametric bootstrap (200), ≥ 180 successful refits for "reliable", predictive vs parameter intervals, what is conditional on assumptions.
10. **Scenarios** (`scenarios`): paired baseline/scenario from same state; hypothetical wording; what it does *not* mean.
11. **Sensitivity analysis** (`sensitivity`): the 27 combinations, ranking reversals reported.
12. **Reproducibility** (`reproducibility`): run id, seeds, code revision, manifest, ZIP bundle.
13. **Limitations** (`limitations`): model findings depend on data quality and assumptions; reporting fraction and susceptibility are assumptions not estimates; homogeneous mixing; no age structure/vaccination/waning; archive is revised and frozen; reported ≠ true infections; not medical or policy advice.
14. **AI explainer** (`ai`): what it can/cannot do; grounded in stored numbers; not a research finding.
Add the "Ask about methods" box (reuses `/api/ai/explain` with `kind: "methods_qa"`, label as AI-generated). Content must be **static, versioned text in `src/content/methods.ts`** (so the AI route can reuse it) — numerical claims must match constants in `@epilens/shared` (import them, don't retype numbers). Never prepopulate a "successful research conclusion".

**CHECKPOINT A:** green, commit.

---

## CHECKPOINT B — UI consistency and bug-hunt pass (do this methodically)

### Task 2 — Automated audit script `scripts/ui-audit.md` + manual walk-through
Walk **every screen at 375, 768, 1280 px** and record findings in `docs/UI_AUDIT.md` (table: screen · issue · severity · fixed?). Fix everything. Check at least:
- Every button/input/select/slider/switch/tab/link: hover, `focus-visible`, active, disabled (+ reason), loading states all present and consistent. No button without an accessible name. No dead buttons.
- Every form: labels, units, tooltips, inline errors on blur/submit, error text linked with `aria-describedby`, no double submit, no lost input on error, correct keyboard Enter behaviour.
- Typography/spacing/colour tokens only — grep for hard-coded hex colours or arbitrary pixel values outside the token file (`rg "#[0-9a-fA-F]{3,6}" apps/web/src` must show only chart theme/token files).
- Every page: loading skeleton, empty, error, mobile layout; no layout shift; no horizontal page scroll; sticky/fixed elements never cover content; z-index sanity (Sheet, Dialog, Tooltip, Toast stack correctly).
- Status vocabulary identical everywhere (`RunStatusPill`), date format identical everywhere, number format identical (`en-IN`), no `NaN`/`undefined`/`null` strings (add a Playwright helper that scans visible text for these tokens on each page).
- Copy review: tone consistent, no placeholder text, no "lorem", no TODO strings (`rg -i "lorem|todo|fixme|xxx"`).
- Console: zero errors/warnings/React hydration warnings on every route (Playwright asserts `page.on("console")` and `pageerror` are empty).
- Charts: resize, zoom/reset, table toggle, exports on every chart; dark-on-light contrast AA; legend names present; dashes/markers distinguish series in grayscale (screenshot test converted to grayscale and eyeballed).
- Reduced motion: landing page animations disabled with the OS setting.

### Task 3 — Landing page polish
Lighthouse (mobile) targets: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. Add `opengraph-image.tsx` and `icon.tsx` (logo mark), `robots.ts`, `sitemap.ts` (landing + login only), proper `<title>`/description. Make sure the `Try the demo` flow works from a cold start (including compute service cold start: show a friendly "Warming up the analysis engine…" state with a timeout and retry message).

**CHECKPOINT B:** green, commit.

---

## CHECKPOINT C — Security and reliability verification

### Task 4 — Security checks (write automated tests where possible; record results in `docs/SECURITY_CHECKLIST.md`)
1. Auth: every `(app)` page and every `/api/*` (except auth, health, cron with secret) rejects signed-out access (401/redirect). Table-driven test over all route handlers.
2. Ownership: with user A and user B, B cannot read/modify/delete/export A's datasets, observations, runs, results, scenarios, exports, sensitivity, AI explanations, files (expect 403/404 everywhere). Table-driven test.
3. Upload: oversize, row-limit, encoding, PII header, wrong region, malformed CSV, CSV with formulas/HTML/`<script>` in text cells (rendered escaped; exported neutralized), path-traversal filename, zip-bomb-like long lines.
4. SSRF: `fetch-archive` accepts only allowlisted hosts; test with `http://169.254.169.254`, `https://evil.com`, `https://data.covid19india.org.evil.com`, redirects to disallowed hosts (disable redirects or re-validate each hop).
5. Secrets: none in repo (`git grep`, optionally `gitleaks` if installable), none in client bundle (`rg "OPENROUTER|COMPUTE_SHARED|AUTH_SECRET" apps/web/.next/static` → empty), none in logs or stored error messages, none in exports.
6. Headers: add security headers in `next.config.ts` (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, a pragmatic CSP that still works with Next + Plotly + KaTeX; test the app with the CSP on).
7. Rate limiting: simple in-DB/in-memory limits on demo login (e.g. 10/hour/IP), AI route (done), upload-token route.
8. Delete semantics: deleting a run removes scenarios/exports/files/sensitivity rows; a dataset referenced by runs cannot be deleted (409).
9. Public URLs: no run is accessible without auth; export URLs expire.
10. Compute service: internal routes reject missing/wrong secret with constant-time comparison; CORS only allows `ALLOWED_ORIGINS`; request size limits; JWT upload tokens expire in 2 min and are scope-bound.

### Task 5 — Reliability checks
- Refresh mid-run reconnects (store + `GET /api/runs?active=true`). Kill compute mid-run → reaper marks requeued/failed; no eternal spinner. Cold-start compute: queued run starts after `wakeWorker()` retries. Neon suspended: first request succeeds after wake (handle connection retry once with backoff). Two simultaneous tabs submitting the same config → one run (idempotency). Job limit 2 enforced.
- Cache rule: identical config + dataset checksum + code revision returns the existing completed run; changing any one of the three does not.

**CHECKPOINT C:** green, commit.

---

## CHECKPOINT D — Full end-to-end verification vs the PRD

### Task 6 — Playwright suite `e2e/full-workflow.spec.ts` (PRD "Required verification")
One long scenario (use the synthetic demo dataset): load data → resolve an error (upload a bad CSV, see row-level errors, then a good one) → configure fit → run → inspect all five tabs → run evaluation → inspect comparison and validation → create scenario → reopen the saved run from `/runs` → download CSV/JSON/ZIP and verify the manifest run id matches. Plus separate specs for: missing dates, negative corrections, duplicates, wrong region, invalid populations, malicious text, cancelled jobs, failed optimisation (force via invalid bounds fixture through API), stale-results marking, unauthorized access.

### Task 7 — Backend verification summary
Run `pytest -q` including slow tests once (`-m slow`). Report: state conservation, non-negativity, zero incidence at β = 0, incidence mapping, reproducible synthetic outputs, future-record independence, baseline calculations, identical evaluation dates, comparison compatibility, export values, interval labels.

### Task 8 — PRD traceability matrix `docs/TRACEABILITY.md`
A table of **every** requirement sentence group in the PRD → implementing file(s) → test(s) → status (Done / Deviated (see DECISIONS) / Not done). Be honest. Any "Not done" must be fixed in this phase unless impossible (then explained).

**CHECKPOINT D:** everything green, commit.

---

## CHECKPOINT E — Deployment and portfolio assets

### Task 9 — Deploy configs
- **Web → Vercel:** project root `apps/web`; install command `pnpm install --frozen-lockfile` from repo root (enable "Include source files outside of the Root Directory" for the shared package); build command runs `prisma generate` then `next build`; `vercel.json` with the daily cron `/api/cron/cleanup`; env vars list documented. Migrations: `prisma migrate deploy` run from CI or manually (document; **do not** run migrations inside the Vercel build against production without a flag).
- **Compute → Railway (or any Docker host):** `apps/compute/Dockerfile` (multi-stage not required; non-root user; `PYTHONUNBUFFERED=1`; healthcheck `/health`); Railway service with root `apps/compute` (or Dockerfile path), env vars, 1 replica, `WORKER_PROCESSES=1` on small plans; `ALLOWED_ORIGINS` = Vercel URL(s). Provide the free alternative instructions (Hugging Face Spaces Docker / Render) in `docs/DEPLOY.md`, noting cold starts and that `wakeWorker()` + retries handle them.
- **Neon:** pooled URL for `DATABASE_URL` (web), **direct URL** for compute and for migrations; note free-tier suspend behaviour and why the worker is idle-by-default.
- **Google OAuth:** step-by-step for credentials, authorised redirect `https://<domain>/api/auth/callback/google`.
- **CI (optional but nice):** `.github/workflows/ci.yml` running install, typecheck, lint, vitest, pytest (no DB tests), and a Playwright smoke if feasible.
- `docs/DEPLOY.md`: ordered checklist (create Neon → migrate → deploy compute → set `COMPUTE_URL`/secrets → deploy web → set OAuth → run smoke test) + a **post-deploy smoke test script** (`scripts/smoke.sh`) hitting `/api/health`, compute `/health`, and the demo login flow.
- Measure and document real-world timings of FIT and EVALUATE on the deployed compute plan; if EVALUATE exceeds the host's practical limits, document the recommended plan and the fallback (reduce `nStarts` via the Advanced panel, with the disclosure already in Methods).

### Task 10 — Portfolio assets
- `README.md` (final): hero description, animated GIF/screenshots placeholders list (the human adds images), feature list mapped to the PRD, architecture diagram (ASCII or Mermaid), tech stack and **why** (hybrid TS + Python decision, Postgres job queue, cost-aware worker), how to run locally, how to deploy, testing, limitations, license note ("research tool — not medical or policy advice").
- `docs/CASE_STUDY.md`: a 600–800 word freelance-style case study (problem, constraints, approach, key technical decisions, challenges solved — e.g. leakage-free prefix normalization, idempotent job queue on Neon free tier, honest-by-design UI — and outcomes) written in first person for the author to adapt.
- `docs/DEMO_SCRIPT.md`: a 3-minute click-through script for showing the project to a client/recruiter.

**CHECKPOINT E:** final commit and tag `v1.0.0`.

---

## FINAL ACCEPTANCE CHECKLIST (PASS/FAIL + evidence)

1. `pnpm typecheck && pnpm lint && pnpm test`, `pytest -q` (+ slow), Playwright full suite — all green. Paste summary counts.
2. `docs/TRACEABILITY.md` has no unexplained "Not done".
3. Methods page contains all 14 sections, the COVID19India documentation link, the dependence-on-data-quality-and-assumptions statement, correct equations, and numbers imported from shared constants.
4. UI audit: `docs/UI_AUDIT.md` lists all findings and all are fixed; zero console errors on all routes; no `NaN/undefined/null` text visible anywhere; every button/input verified.
5. Lighthouse numbers recorded for the landing page (mobile) meet targets or the gap is explained.
6. Security checklist complete; cross-user access impossible; SSRF tests pass; no secrets in repo/bundle/logs/exports.
7. Production build (`next build`) succeeds; app runs against production env locally (`next start`) with both services.
8. Deployment docs verified by following them from scratch (describe what was verified) — or flagged as "needs human credentials" with exact missing steps.
9. Demo flow works for a first-time visitor in under 60 seconds from the landing page (cold compute included) and the demo user's data is isolated and expires in 24 h.
10. README, CASE_STUDY, DEMO_SCRIPT, DEPLOY, SECURITY_CHECKLIST, UI_AUDIT, TRACEABILITY, DECISIONS, PROGRESS all present and accurate.

Finish with the PHASE 6 REPORT (AGENTS.md §11), including a final list of "known limitations" the author should be aware of before showing the project to clients.

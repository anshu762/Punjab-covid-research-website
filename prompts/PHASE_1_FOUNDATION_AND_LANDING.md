# PHASE 1 — Foundation, Database, Auth, Job Queue, Design System, App Shell, Animated Landing Page

**Read first:** `AGENTS.md` (all rules apply), `docs/PRD.md` sections "Website structure", "Page layout and visual design", "Persistent interface rules", "7 Reliability security".
**Goal of this phase:** a deployable skeleton that already *looks* premium: public animated landing page, working login (Google + one-click demo account), protected app shell with 7 placeholder pages (honest empty states), the full database schema, and a Python compute service with a working Postgres job queue. No science yet.

Work through the tasks in order. Commit after each. Stop at each CHECKPOINT to update `docs/PROGRESS.md` and run all checks.

---

## CHECKPOINT A — Repo, shared package, database

### Task 1 — Monorepo scaffold
1. `git init`. Create root `package.json` (private, `packageManager` pinned to the installed pnpm version), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `.gitignore` (node_modules, .next, .env*, !.env.example, __pycache__, .venv, *.pyc, .pytest_cache), `.editorconfig`, `.nvmrc` (22), `.python-version` (3.12).
2. Create the web app: `pnpm create next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm`. Package name `@epilens/web`. Keep Next's defaults for Tailwind (use whatever version the CLI installs; do not downgrade).
3. Create `packages/shared` (`@epilens/shared`): `package.json` (`"main": "src/index.ts"`, `"types": "src/index.ts"`), `tsconfig.json`, `src/index.ts`. Add `"@epilens/shared": "workspace:*"` to web and set `transpilePackages: ["@epilens/shared"]` in `next.config.ts`.
4. Create `apps/compute` skeleton: `app/__init__.py`, `app/main.py`, `tests/`, `data/.gitkeep`, `requirements.txt`, `requirements-dev.txt`, `Dockerfile` (python:3.12-slim, installs requirements, `CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`). Create a venv `apps/compute/.venv`, install and **pin exact versions** (`pip freeze` style) of: fastapi, uvicorn[standard], pydantic, pydantic-settings, python-multipart, psycopg[binary,pool], PyJWT, numpy, scipy, pandas, matplotlib. Dev: pytest, httpx, ruff.
5. Root scripts in `package.json`: `dev:web`, `dev:compute` (`cd apps/compute && python -m uvicorn app.main:app --reload --port 8000`), `typecheck` (all TS packages), `lint`, `test` (vitest in shared + web), `test:compute` (`cd apps/compute && python -m pytest -q`), `db:migrate`, `db:generate`.
6. Install Vitest in `packages/shared` and `apps/web`. Create `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md` (empty templates).
✔ Check: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm dev:web` shows the default page; `pnpm dev:compute` serves `/docs`.

### Task 2 — Shared package (`packages/shared/src`)
Create and export from `index.ts`:
- `constants.ts`:
  ```ts
  export const APP_NAME = "EpiLens";
  export const APP_TAGLINE = "Punjab COVID-19 research workbench";
  export const REGION = { code: "PB", name: "Punjab, India", disease: "COVID-19" } as const;
  export const DEFAULT_DATE_RANGE = { start: "2020-07-01", end: "2020-11-30" } as const;
  export const LIMITS = { uploadMaxBytes: 10*1024*1024, uploadMaxRows: 100000, maxActiveJobsPerUser: 2, maxCompareRuns: 3 } as const;
  export const MODEL_DEFAULTS = { infectiousDurationDays: 7, reportingFraction: 0.20, susceptibleFraction: 0.95,
    bootstrapReplicates: 200, nStarts: 20, seed: 42, betaBounds: [0.01, 2], dispersionBounds: [0.05, 1000],
    maxInitialInfectious: 1_000_000, rtol: 1e-8, atol: 1e-8, forecastHorizonDays: 7,
    scenario: { percentChange: -20, horizonDays: 28, minPercent: -50, maxPercent: 50, stepPercent: 5, minHorizon: 7, maxHorizon: 60 } } as const;
  export const EVAL_PROTOCOL = { firstOrigin: "2020-08-31", originStepDays: 7, defaultBlocks: 13, developmentBlocks: 9, finalBlocks: 4, minInitialTrainingDays: 42, minBlocksCustom: 13 } as const;
  export const ARCHIVE_ALLOWLIST = ["data.covid19india.org"] as const;
  export const METHODS_SOURCE_URL = "https://data.covid19india.org/documentation/csv/";
  ```
- `dates.ts`: `parseIsoDate`, `isIsoDate`, `addDays`, `diffDays`, `listDates(start,end)`, `formatDisplayDate` ("01 Jul 2020") — all UTC-safe string math.
- `format.ts`: `formatInt`, `formatNumber`, `formatPercent`, `formatDuration(seconds)`; they return "—" for null/undefined/NaN/Infinity.
- `errors.ts`: `ApiErrorBody` type + `makeError(code, message, extra)`.
- `status.ts`: `RUN_STATUSES` (queued, validating, fitting, evaluating, estimating_uncertainty, exporting, completed, failed, cancelled) with human labels, `isTerminal`, `isActive`, ordered stage list.
- Vitest tests for dates and format (including edge cases: leap day, `NaN`, negative numbers).

### Task 3 — Prisma schema + migration
Install Prisma + `@prisma/client` in `apps/web` (follow the official docs for the installed version and for Neon: pooled `DATABASE_URL` at runtime, `DIRECT_URL` for migrations). Create `apps/web/prisma/schema.prisma` with EXACTLY the models below (apply the `@map`/`@@map` rule from AGENTS.md §4b; adapt only generator/datasource syntax to the installed Prisma version). Use `cuid()` ids.

```prisma
enum DatasetStatus { PENDING_MAPPING READY BLOCKED }
enum QualityFlag { OK MISSING DUPLICATE CORRECTED CORRECTION_DAY UNRESOLVED_CORRECTION }
enum FileKind { RAW_UPLOAD CLEAN_CSV QUALITY_LOG EXPORT }
enum RunMode { FIT EVALUATE }
enum ModelType { M1 M2 }
enum RunStatus { QUEUED VALIDATING FITTING EVALUATING ESTIMATING_UNCERTAINTY EXPORTING COMPLETED FAILED CANCELLED }
enum ScenarioStatus { QUEUED RUNNING COMPLETED FAILED CANCELLED }
enum ExportStatus { QUEUED RUNNING READY FAILED }
enum JobType { RUN SCENARIO SENSITIVITY EXPORT SELFTEST }
enum JobStatus { QUEUED RUNNING DONE FAILED CANCELLED }

model User { id, name String?, email String? @unique, emailVerified DateTime?, image String?,
  isDemo Boolean @default(false), demoExpiresAt DateTime?, createdAt DateTime @default(now()),
  accounts Account[], sessions Session[], datasets Dataset[], runs Run[], scenarios Scenario[], exports Export[], files StoredFile[] }
model Account { standard Auth.js Prisma-adapter fields; @@unique([provider, providerAccountId]); onDelete Cascade }
model Session { standard }            // required by adapter even with JWT
model VerificationToken { standard }

model Dataset { id, ownerId, familyId String, version Int, name String,
  regionCode String @default("PB"), isSynthetic Boolean @default(false),
  sourceKind String /* ARCHIVE | UPLOAD | SYNTHETIC */, sourceName String, sourceUrl String?,
  retrievedAt DateTime, sha256 String, status DatasetStatus,
  rawFileId String?, cleanFileId String?, qualityLogFileId String?,
  schemaMapping Json?, qualitySummary Json?,
  populationValue Int?, populationSourceUrl String?, populationReferenceYear Int?, populationGeography String?,
  createdAt DateTime @default(now()), updatedAt DateTime @updatedAt,
  owner User @relation(onDelete: Cascade), observations Observation[], runs Run[], files StoredFile[]
  @@unique([ownerId, familyId, version]) @@index([ownerId, createdAt]) }

model Observation { datasetId String, date DateTime @db.Date, newConfirmedRaw Int?, newConfirmedAnalysis Int?,
  qualityFlag QualityFlag, transformationId String?, sourceRef String?,
  dataset Dataset @relation(onDelete: Cascade)  @@id([datasetId, date]) }

model StoredFile { id, ownerId, datasetId String?, runId String?, kind FileKind, filename String, mimeType String,
  sizeBytes Int, sha256 String, content Bytes, createdAt DateTime @default(now()),
  owner User @relation(onDelete: Cascade), dataset Dataset? @relation(onDelete: Cascade), run Run? @relation(onDelete: Cascade) }

model Run { id, ownerId, datasetId, displayName String, mode RunMode, modelType ModelType,
  config Json, configHash String, cacheKey String, status RunStatus @default(QUEUED), stage String @default("queued"),
  progressDone Int?, progressTotal Int?, cancelRequested Boolean @default(false), idempotencyKey String?,
  createdAt DateTime @default(now()), startedAt DateTime?, completedAt DateTime?,
  codeVersion String, seed Int, errorReference String?, errorMessage String?,
  hasFit Boolean @default(false), evaluated Boolean @default(false),
  owner User @relation(onDelete: Cascade), dataset Dataset @relation(onDelete: Restrict) /* referenced dataset cannot be deleted */,
  fitResult FitResult?, forecastRows ForecastRow[], scenarios Scenario[], exports Export[], files StoredFile[]
  @@unique([ownerId, idempotencyKey]) @@index([ownerId, createdAt]) @@index([ownerId, cacheKey]) }

model FitResult { runId String @id, parameters Json, parameterIntervals Json?, assumptions Json,
  convergence Json, boundaryHits Json, changePoint Json?, payload Json, createdAt DateTime @default(now()),
  run Run @relation(onDelete: Cascade) }

model ForecastRow { id Int @id @default(autoincrement()), runId String, model String, originDate DateTime @db.Date,
  targetDate DateTime @db.Date, split String /* development | final */, estimate Float, lower Float?, upper Float?,
  intervalUnavailableReason String?, actual Float, run Run @relation(onDelete: Cascade)
  @@index([runId, model, originDate]) }

model Scenario { id, ownerId, parentRunId, percentChange Int, horizonDays Int, status ScenarioStatus @default(QUEUED),
  config Json, dailyOutputs Json?, summary Json?, errorReference String?, errorMessage String?,
  createdAt DateTime @default(now()), completedAt DateTime?,
  owner User @relation(onDelete: Cascade), parentRun Run @relation(onDelete: Cascade) }

model Export { id, ownerId, runId, scenarioId String?, type String, status ExportStatus @default(QUEUED),
  fileId String?, checksum String?, manifest Json?, errorReference String?, createdAt DateTime @default(now()), expiresAt DateTime?,
  owner User @relation(onDelete: Cascade), run Run @relation(onDelete: Cascade) }

model Job { id, type JobType, refId String, status JobStatus @default(QUEUED), attempts Int @default(0), maxAttempts Int @default(2),
  lockedAt DateTime?, lockedBy String?, heartbeatAt DateTime?, lastError String?,
  createdAt DateTime @default(now()), updatedAt DateTime @updatedAt  @@index([status, createdAt]) }
```
(Write out all fields fully; the block above is shorthand — include real types, `@id @default(cuid())`, relation fields and `onDelete` exactly as shown.)

Run `prisma migrate dev --name init` against the Neon dev DB (human provides `DATABASE_URL`/`DIRECT_URL`; if missing, stop and tell the human exactly which env vars to fill in `.env`). Create `src/lib/db.ts` (Prisma singleton, `server-only`). Write `docs/DB_TABLES.md` listing every table and column (snake_case) — Python depends on it.

### Task 4 — Environment handling
- `apps/web/.env.example`: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `APP_URL`, `COMPUTE_URL` (server→compute), `NEXT_PUBLIC_COMPUTE_PUBLIC_URL` (browser→compute, upload only), `COMPUTE_SHARED_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_FALLBACK_MODELS`, `CRON_SECRET`, `NEXT_PUBLIC_AUTHOR_NAME`, `NEXT_PUBLIC_AUTHOR_URL`.
- `apps/compute/.env.example`: `DATABASE_URL` (direct Neon URL), `COMPUTE_SHARED_SECRET`, `ALLOWED_ORIGINS`, `CODE_REVISION`, `WORKER_CONCURRENCY=1`, `WORKER_PROCESSES`.
- `apps/web/src/lib/env.ts`: zod-validated env (server vars in `server-only` file, public vars separately). In dev, missing optional vars (Google, OpenRouter) warn but do not crash; missing `DATABASE_URL`/`AUTH_SECRET` crash with a clear message.
- `apps/compute/app/settings.py` with pydantic-settings.

**CHECKPOINT A:** run all checks, update PROGRESS.md, commit.

---

## CHECKPOINT B — Auth, BFF utilities, compute service with job queue

### Task 5 — Auth.js v5
Use the edge-safe split pattern:
- `src/auth.config.ts` (providers metadata + `authorized` callback + pages `{ signIn: "/login" }`; **no Prisma import**) used by `src/middleware.ts`.
- `src/auth.ts` (full config: PrismaAdapter, `session: { strategy: "jwt" }`, Google provider, and a **Credentials provider with id `demo`**).
- Demo flow: server action `startDemoSession()` calls `signIn("demo", { redirectTo: "/overview" })`. In `authorize()`: create a fresh user `{ name: "Demo Researcher", email: "demo-<random>@demo.epilens.local", isDemo: true, demoExpiresAt: now+24h }`, then best-effort (8s timeout, never throws) call compute `POST /internal/datasets/import-bundled` with source `synthetic_demo` (implemented in Phase 2 — in Phase 1 just call a `seedDemoData(userId)` stub in `src/lib/demo.ts` that does nothing and is documented as such). Each demo visitor gets an isolated user. In the `jwt`/`session` callbacks include `user.id` and `isDemo`; if `isDemo` and expired → treat as signed out.
- Middleware protects everything except `/`, `/login`, `/api/auth/*`, `/_next/*`, static files; unauthenticated → redirect to `/login?callbackUrl=...`.
- `src/lib/auth-helpers.ts`: `getCurrentUser()`, `requireUser()` (throws a typed `HttpError(401)`), `assertOwner(resourceOwnerId, user)` (throws 403).
- Cron cleanup route `GET /api/cron/cleanup` (Bearer `CRON_SECRET`): delete demo users with `demoExpiresAt < now()` (cascades). Add `vercel.json` cron entry (daily).
✔ Check: demo login works with no Google keys; visiting `/overview` signed-out redirects to `/login`; signed-in demo user sees `/overview`.

### Task 6 — BFF utilities
- `src/lib/http.ts`: `HttpError`, `apiHandler(fn)` wrapper that adds `request_id`, converts errors (zod → 422 with `field`, HttpError → status, unknown → 500 with `error_reference`), returns the envelope from AGENTS.md §5.
- `src/lib/compute.ts` (`server-only`): `computeFetch(path, init)` adds `X-Internal-Secret`, `X-User-Id`, 15s timeout, maps failures to `HttpError(502, "compute_unavailable")`; `wakeWorker()` = fire-and-forget `POST /internal/jobs/wake` (never throws).
- `src/lib/logger.ts`.
- `GET /api/health` → `{ ok: true }` (no DB call).

### Task 7 — Compute service skeleton (`apps/compute/app`)
- `main.py`: FastAPI app, CORS limited to `ALLOWED_ORIGINS`, request-id middleware, JSON error handler producing the same error envelope, routers: `GET /health` (no DB), `GET /health/db` (does `SELECT 1`), `POST /internal/jobs/wake`, `POST /internal/selftest` (creates a SELFTEST job). Internal routes require header `X-Internal-Secret` == `COMPUTE_SHARED_SECRET` (constant-time compare) else 403.
- `db.py`: psycopg `ConnectionPool` (min 0/1, max 4) with `row_factory=dict_row`; small helpers `fetch_one`, `fetch_all`, `execute`.
- `worker.py` — **Postgres job queue, cost-aware:**
  - Runs in a background thread started in FastAPI `lifespan`.
  - **Idle by default: does not touch the DB while idle.** It sleeps on a `threading.Event`. `POST /internal/jobs/wake` sets the event. After waking it polls every 1s; when the queue is empty for 15 consecutive seconds it goes idle again. A safety poll every 30 minutes is allowed (Neon free tier must be able to suspend).
  - Claim query (atomic):
    ```sql
    UPDATE jobs SET status='RUNNING', locked_at=now(), locked_by=%(w)s, heartbeat_at=now(), attempts=attempts+1, updated_at=now()
    WHERE id = (SELECT id FROM jobs WHERE status='QUEUED' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *;
    ```
  - Heartbeat every 10s while a job runs. **Reaper** (runs on each active poll): `RUNNING` jobs with `heartbeat_at < now() - interval '60 seconds'` → back to `QUEUED` if `attempts < max_attempts`, else `FAILED` (and mark the referenced run/scenario FAILED with an error reference). Nothing may stay "running" forever.
  - Handler registry `HANDLERS: dict[JobType, Callable]`. Register `SELFTEST` (sleeps 3×1s updating nothing but heartbeat, then DONE). `RUN`, `SCENARIO`, `SENSITIVITY`, `EXPORT` handlers are registered later phases; until then they mark the job FAILED with message "handler not implemented".
  - Concurrency = `WORKER_CONCURRENCY` (default 1).
- `tests/test_queue.py`: pure-logic tests for backoff/idle behaviour with a fake clock; an integration test that is skipped unless `DATABASE_URL_TEST` is set.
✔ Check: with both servers running, `curl -X POST localhost:8000/internal/selftest -H "X-Internal-Secret: ..."` → job goes QUEUED→RUNNING→DONE in the DB; with no secret → 403; `/health` works.

### Task 8 — Connect web ↔ compute
Add dev-only route `POST /api/dev/selftest` (404 in production) that calls compute selftest through `computeFetch` and returns the job id. Add a tiny dev page `/dev/health` (not linked in nav) showing web health, compute health, and a "Run selftest job" button with polling. Remove or guard with `NODE_ENV !== "production"`.

**CHECKPOINT B:** all checks, PROGRESS.md, commit.

---

## CHECKPOINT C — Design system and app shell

### Task 9 — Design tokens and base components
- Implement tokens from AGENTS.md §6 in `src/styles/globals.css` + Tailwind theme mapping. Load Inter and JetBrains Mono with `next/font`.
- Initialise shadcn/ui (`pnpm dlx shadcn@latest init`) and add: button, input, label, textarea, select, checkbox, switch, slider, tabs, table, card, badge, tooltip, dialog, alert-dialog, sheet, dropdown-menu, popover, separator, skeleton, progress, accordion, sonner, form. **Restyle** them to the tokens (primary = blue-600, radius 10px, visible focus ring). Add `Spinner`.
- Custom components in `src/components/`:
  - `layout/AppShell.tsx` (fixed left nav 260px navy with logo, 7 links + icons, active state with left accent bar, user menu at bottom with sign-out; collapses below 768px to hamburger `Sheet`; skip-to-content link)
  - `layout/StatusBar.tsx` (project name, dataset name, selected dates, run status pill with `aria-live="polite"`, `DemoBadge`)
  - `layout/PageHeader.tsx` (title, description, actions slot)
  - `common/EmptyState.tsx` (icon, title, explanation, primary CTA, optional secondary), `common/ErrorState.tsx` (message, retry, error reference with copy button), `common/DemoBadge.tsx`, `common/StaleBanner.tsx` ("Settings changed — rerun required", amber, icon + text), `common/StatCard.tsx` (label, value, hint, loading skeleton variant), `common/FieldHelp.tsx` (label + `?` tooltip + hint), `common/InlineError.tsx`, `common/CopyButton.tsx`, `common/ConfirmDialog.tsx`, `common/RunStatusPill.tsx` (each status has icon + text + colour; never colour only).
  - `charts/ChartCard.tsx` (title, toolbar slot, "View as table" toggle, children = chart or table, caption slot) — chart internals come in Phase 2.
- A hidden dev route `/dev/ui` showing every component in every state (default, hover instructions, focus, disabled, loading, error) for visual QA. Guard with `NODE_ENV !== "production"`.

### Task 10 — Workspace store
`src/store/workspace.ts` (zustand + `persist` to `localStorage`, **versioned key** `epilens-workspace-v1`, SSR-safe via `skipHydration`/mounted guard): `datasetId`, `dateRange {start,end}`, `activeRunId`, `modelSettingsDraft` (typed later), actions `setDataset`, `setDateRange`, `setActiveRun`, `reset`. Hydration must not cause React hydration mismatch warnings.

### Task 11 — Routes and placeholders
Create route group `src/app/(app)/` with layout using `AppShell` + `StatusBar` and these pages (each with `PageHeader` using the exact PRD titles, and an `EmptyState` explaining what the page will do and linking to the next sensible step — **no fake numbers**):
`/overview` (Overview), `/data` (Data), `/model` (Model setup), `/results` (Results), `/scenarios` (Scenario explorer), `/runs` (Saved runs and downloads), `/methods` (Methods).
Add `loading.tsx`, `error.tsx` per route group and `not-found.tsx`. Nav labels: Overview, Data, Model setup, Results, Scenario explorer, Saved runs & downloads, Methods.
✔ Check at widths 320, 375, 768, 1280: no horizontal scroll; nav collapses <768; focus ring visible by keyboard.

**CHECKPOINT C:** all checks, PROGRESS.md, commit.

---

## CHECKPOINT D — Landing page and login (the portfolio showpiece)

### Task 12 — Public landing page `/` (framer-motion)
Light, premium, crisp. Use `LazyMotion` + `m` components (`domAnimation`), keep client components as leaves, `useReducedMotion()` disables transforms (fade only). Standard reveal: `initial {opacity:0,y:24}`, `whileInView {opacity:1,y:0}`, `viewport {once:true, margin:"-80px"}`, duration 0.6, ease `[0.22,1,0.36,1]`, stagger 0.08 for groups. Sections (each its own component in `src/components/landing/`):

1. **Navbar** — sticky, blurred white background after scroll, logo (inline SVG mark + "EpiLens"), links (Features, How it works, Rigor, Stack), buttons `Sign in` (ghost) and `Try the demo` (primary, calls `startDemoSession`). Mobile: hamburger sheet.
2. **Hero** — subtle gradient mesh + faint grid background (CSS only); badge "Private research workbench · Punjab, India"; H1 "Model Punjab's COVID-19 epidemic. Honestly."; sub-copy: "Fit SIR models, validate 7-day forecasts against transparent baselines, and explore hypothetical transmission scenarios — with every assumption on the table."; CTAs `Try the demo` + `Sign in with Google`; under CTAs three small trust chips ("Observed ≠ simulated", "Reproducible exports", "Pre-registered evaluation rules"). Right side: a **product window mock** (browser frame built with real components, not an image) containing an animated epidemic curve: observed bars rising in sequence (stagger), a dashed fitted line drawing with `pathLength` 0→1, a shaded interval fading in, and two floating chips ("Forecast origin", "R_eff = 1") with gentle float loops (`y` ±6px, 5s, reduced-motion safe). Label under it: "Illustrative visual — not Punjab data".
3. **Capability counters** — count-up (on view) of true product facts: `7 workspaces`, `4 compared forecast models`, `13 evaluation blocks`, `27 sensitivity scenarios`. (These are facts from the PRD, not statistics.)
4. **Features grid** (6 cards, icon + title + 2 lines, hover lift + border glow): Data quality gate; SIR fitting (constant & change-point); Forecast validation vs baselines; Scenario explorer; Reproducible exports (ZIP bundle with manifest); AI explainer grounded in stored numbers.
5. **How it works** — 4-step vertical/horizontal timeline whose progress line is scroll-linked (`useScroll` + `useTransform`): Load & validate data → Configure assumptions → Run fit / evaluation → Explore scenarios & export.
6. **Interactive illustrative SIR playground** — pure-TS RK4 SIR (N = 1,000,000, 1 initial infection… implement in `src/lib/illustrative-sir.ts` with unit test for S+I+R conservation). Two sliders (R0 1.0–4.0, infectious duration 3–21 days) re-draw the infectious-curve SVG area; use `m.path` `animate={{ d }}` with the same point count so it morphs smoothly. Prominent label: "Illustrative simulation — not Punjab data". Provide `aria-label`s and a "View as table" for the plotted points.
7. **Rigor section** — "Built to not mislead": 4 cards (Observed vs simulated always separated · Every assumption visible · Fixed chronological evaluation, rules frozen before final test · Results traceable to a run ID). Link to Methods is NOT public (private app) — instead show a short equations teaser (render `dS/dt = −βSI/N` etc. as styled text/inline SVG, no KaTeX yet).
8. **Tech stack strip** — Next.js · TypeScript · Tailwind · Prisma · Neon Postgres · FastAPI · SciPy · Plotly · OpenRouter (text pills, no logos needed).
9. **Final CTA band** (navy) + **Footer** with `NEXT_PUBLIC_AUTHOR_NAME` / `NEXT_PUBLIC_AUTHOR_URL` ("Designed & built by …", hidden gracefully if env missing), "Research tool — not medical or policy advice."
Performance: no layout shift, images none (SVG/CSS only), `next/font`, Lighthouse perf ≥ 90 mobile target. Add `metadata` (title, description, OG tags text only).

### Task 13 — `/login`
Centered card on soft gradient: logo, "Sign in to EpiLens", `Continue with Google` button (disabled with tooltip "Google sign-in not configured" if env missing), divider "or", `Explore with a demo account` primary button (spinner while starting; error toast + inline error on failure), small note "Demo sessions are isolated and deleted after 24 hours". Show auth error messages from `?error=` query. Footer link back to `/`. Fully keyboard accessible.

### Task 14 — Docs and final verification
- `README.md` at root: what it is, architecture diagram (ASCII), prerequisites, env setup steps (Neon, Google OAuth credentials, local run commands for both servers), scripts table.
- Update `docs/PROGRESS.md`, `docs/DECISIONS.md` (all pinned versions + any deviations).

---

## ACCEPTANCE CHECKLIST (print PASS/FAIL + evidence for every line)

1. `pnpm install && pnpm typecheck && pnpm lint && pnpm test` pass. `cd apps/compute && pytest -q` passes.
2. `prisma migrate` applied; `docs/DB_TABLES.md` lists all 14 tables.
3. Signed-out visit to `/overview` redirects to `/login`; demo login lands on `/overview`; sign-out works; two demo logins create two separate users.
4. All 7 app routes render with PageHeader + honest EmptyState; no fake numbers anywhere.
5. Nav: fixed on desktop; hamburger Sheet <768px; keyboard navigable; visible focus; skip link works.
6. StatusBar shows project name, dataset ("No dataset selected"), dates ("—"), run status ("No run").
7. Landing page: all 9 sections present; animations play once on scroll; `prefers-reduced-motion` removes motion; playground sliders update the curve; "Illustrative" labels present; no horizontal scroll at 320px; no console errors/hydration warnings.
8. Compute: `/health` OK; internal routes 403 without secret; selftest job QUEUED→RUNNING→DONE; killing the worker mid-job gets the job requeued/failed by the reaper (describe how you tested).
9. Worker is idle (no DB queries) when no jobs — prove with a log line or test.
10. No secrets in git (`git grep -i "secret"` shows only env var names).
11. Every shadcn component restyled consistently; `/dev/ui` shows all states.
12. README lets a new developer run both servers in < 10 minutes.

Finish with the PHASE 1 REPORT (AGENTS.md §11).

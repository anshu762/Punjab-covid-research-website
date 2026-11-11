# AGENTS.md — Global Rules for EpiLens (read before EVERY task)

You are a senior full-stack engineer building **EpiLens**, a private research website for Punjab (India) COVID-19 data: SIR model fitting, forecast evaluation, scenarios, and reproducible exports.

**Source of truth = `docs/PRD.md`.** If a phase prompt and the PRD disagree, the PRD wins, unless `docs/DECISIONS.md` records a deliberate deviation. The product must look like a polished, premium freelance/portfolio project AND be scientifically honest.

---

## 1. HOW YOU MUST WORK (very important)

1. **Plan first.** At the start of each phase, create/update `docs/PROGRESS.md` with the phase's task list as a checklist. Tick items only after they are verified.
2. **One task at a time, in order.** Do not start Task N+1 before Task N passes its checks. Do not "also improve" unrelated files.
3. **After every task run:** `pnpm typecheck` and `pnpm lint` (and `pytest` / `pnpm test` if you touched that area). Fix all errors before moving on. Never silence errors with `any`, `@ts-ignore`, `eslint-disable`, or by deleting tests.
4. **Commit after every task** (conventional commits, e.g. `feat(data): add csv validation`). At each CHECKPOINT, also update `docs/PROGRESS.md`.
5. **Do not guess library APIs.** Next.js, Prisma, Auth.js, shadcn/ui, Plotly, framer-motion and SciPy change often. If you are not 100% sure, read the official docs (web) for the version you installed. Pin exact versions (no `^`/`~`) in `package.json` and `requirements.txt` and list them in `docs/DECISIONS.md`.
6. **Never fabricate.** No fake statistics, fake users, fake results, lorem ipsum, or hard-coded numbers in the app UI. Before an analysis exists, show an explanatory EmptyState (PRD rule). The ONLY exception: the public landing page may show an *illustrative* simulation, and it must be labelled "Illustrative — not Punjab data".
7. **Do not leave fake-working features.** If something is unfinished, render an honest EmptyState/disabled control with explanation and list it in `docs/PROGRESS.md` under "Not done".
8. **If blocked after two attempts:** write the exact error + what you tried in `docs/BLOCKERS.md`, pick the simplest safe workaround, record it in `docs/DECISIONS.md`, and continue. Only ask the human for missing secrets/credentials.
9. **Do not rename** database tables/columns, shared constants, API routes or file paths given in the phase prompts. Other phases depend on them.
10. **At the end of each phase** print the ACCEPTANCE CHECKLIST with PASS/FAIL + evidence (command output or file path), then the final report in the format in section 11.

---

## 2. STACK (pin versions when installing; record in docs/DECISIONS.md)

- Monorepo: **pnpm workspaces** (Node 22 LTS). No Turborepo.
- `apps/web`: **Next.js (App Router, TypeScript strict), React, Tailwind CSS, shadcn/ui, framer-motion, TanStack Query, TanStack Table, react-hook-form + zod, zustand, sonner, lucide-react, date-fns, Plotly (`plotly.js-basic-dist-min`)**.
- `packages/shared`: `@epilens/shared` — zod schemas, constants, pure TS helpers (no React, no Node-only APIs).
- `apps/compute`: **Python 3.12, FastAPI, Uvicorn, Pydantic v2, NumPy, SciPy, pandas, matplotlib, psycopg 3, PyJWT, pytest, ruff**.
- DB: **Neon Postgres + Prisma** (schema owned by Prisma; Python reads/writes the same tables with raw SQL via psycopg).
- Auth: **Auth.js v5 (next-auth)** with Prisma adapter, JWT sessions, Google provider + "demo" credentials provider.
- AI: **OpenRouter** (server-side only).
- Hosting: Vercel (web), Railway or any Docker host (compute), Neon (db). Keep cost near zero.

## 3. REPO LAYOUT (fixed)

```
/AGENTS.md
/docs/{PRD.md, PROGRESS.md, DECISIONS.md, BLOCKERS.md, DB_TABLES.md}
/apps/web/src/{app,components,lib,hooks,store,styles}
/packages/shared/src
/apps/compute/{app,tests,data,Dockerfile,requirements.txt}
/prompts   (phase prompts, kept for reference)
```

## 4. CODE CONVENTIONS

- TypeScript `strict: true`, no `any`. Validate every external input (forms, route handlers, env, compute responses) with zod. Python: type hints everywhere, Pydantic models at boundaries, `ruff` clean.
- **Dates are ISO strings `YYYY-MM-DD` (UTC, no time zone math).** Never use `new Date("YYYY-MM-DD")` for display logic; use helpers in `packages/shared/src/dates.ts` (`parseIsoDate`, `addDays`, `diffDays`, `formatDisplayDate`).
- Number formatting only through `packages/shared/src/format.ts` (`formatInt`, `formatNumber(n, digits)`, `formatPercent`) using locale `en-IN`. Never show `NaN`, `Infinity`, `undefined`, `null` to a user: show "—" or an explicit reason ("Undefined: baseline total is zero").
- Server-only code lives in files that start with `import "server-only"`.
- Small files: components < 250 lines, split otherwise. Names: PascalCase components, camelCase functions, kebab-case files.
- No `console.log` left in committed code (use `lib/logger.ts`). Never log secrets, tokens, or file paths.
- Python naming: snake_case; DB column names are snake_case (Prisma `@map`).

## 4b. DATABASE NAMING RULE

Every Prisma field gets `@map("snake_case")`, every model gets `@@map("plural_snake_case")`. Table list is fixed in `docs/DB_TABLES.md`. Python SQL uses those exact names.

## 5. API CONVENTIONS (web BFF)

- Browser talks ONLY to Next.js route handlers (`/api/...`), except the CSV upload which goes straight to the compute service with a short-lived signed token (Phase 2).
- Every handler: `requireUser()` → validate with zod → ownership check (`where: { id, ownerId: user.id }`) → work → JSON response.
- Error envelope (always): `{ "error": { "code": string, "message": string, "field"?: string, "rows"?: number[], "request_id": string } }` plus header `x-request-id`.
- Status codes: `401` not signed in, `403` exists but not yours, `404` not found, `409` incompatible state, `422` invalid input, `429` job limit / rate limit, `500` unexpected (message generic + `error_reference`).
- Never expose stack traces, SQL, file paths, secrets.

## 6. UI / DESIGN SYSTEM RULES (consistency is a hard requirement)

**Look:** clean white background, dark text, navy navigation, restrained blue accents (PRD). Premium = whitespace, crisp type, subtle shadows, smooth micro-interactions — not clutter.

**Tokens** (defined once as CSS variables in `src/styles/globals.css`, mapped in Tailwind theme):
`--navy-900:#0B1F3A; --navy-800:#12294A; --blue-600:#2563EB; --blue-700:#1D4ED8; --blue-300:#93C5FD; --blue-50:#EFF6FF; --ink:#0F172A; --muted:#475569; --border:#E2E8F0; --surface:#FFFFFF; --surface-2:#F8FAFC; --success:#15803D; --warning:#B45309; --danger:#B91C1C;` Radius `10px` (cards `14px`). Spacing on a 4px grid. Fonts: **Inter** (UI) and **JetBrains Mono** (IDs, numbers in tables) via `next/font`.

**Chart series (fixed everywhere):** observed = ink `#0F172A` solid (bars/markers); SIR constant (M1) = `#2563EB` dashed; SIR change-point (M2) = `#0891B2` dotted; 7-day-mean baseline = `#64748B` dash-dot; same-weekday baseline = `#94A3B8` long-dash; intervals = translucent blue fill + legend entry. **Never rely on colour alone** (use dash/marker/label too).

**Every interactive element must have all states:** default, hover, `focus-visible` (2px blue ring + offset), active, disabled (reduced opacity + `cursor-not-allowed` + reason in tooltip when non-obvious), loading (spinner + disabled + `aria-busy`). Min touch target 40px.

**Forms:** visible `<Label>` for every input; unit/range hint under the input; short `?` tooltip for non-obvious fields; inline error text below the field (red + icon, linked by `aria-describedby`, `role="alert"` on submit failures); validation on blur and on submit with the same zod schema used by the server; submit buttons show spinner and block double-submit.

**Page skeleton:** fixed left nav (navy, 260px) ≥768px; below 768px the nav collapses into a hamburger `Sheet`; top **StatusBar** always shows project name, dataset name, selected dates, run status (and a "Demo data" badge for synthetic data); page heading under it. No horizontal page scroll at any width ≥320px. Wide tables scroll inside their own container.

**Every page must have:** loading skeleton, empty state (explains what to do next + CTA), error state (message + retry + reference), and a mobile layout.

**Charts:** real dates, labelled axes with units, consistent series styling above, zoom/reset buttons (keyboard accessible), "View as table" toggle (table alternative for EVERY chart), per-chart CSV download. Missing intervals are labelled "unavailable" — never drawn as zero width.

**Persistent interface rules (PRD):** explicit "Run analysis" / "Run scenario" buttons; editing inputs marks displayed output "Settings changed — rerun required" (never relabel old output as new); all charts + metrics on a screen come from ONE run ID shown on screen; never show placeholder statistics.

**Accessibility:** semantic landmarks (`nav`, `main`, `header`), skip-to-content link, `aria-live="polite"` for run status, WCAG AA contrast, keyboard operable everything, `prefers-reduced-motion` respected (framer-motion `useReducedMotion`).

## 7. SECURITY RULES

Auth required for everything except `/`, `/login`, static assets. Ownership checked on EVERY dataset/run/scenario/export request. No public run URLs. Secrets only in env vars (never committed; `.env*` git-ignored except `.env.example`). Allow remote fetches only from the server-side allowlist (`data.covid19india.org`). Sanitize filenames. Escape displayed text (React default; never `dangerouslySetInnerHTML` with user data). Neutralize spreadsheet formulas in exported text cells (prefix `'` when a *text* cell starts with `= + - @ \t \r`). Uploaded data = aggregate counts only; reject patient identifiers.

## 8. COST RULES

Neon free tier auto-suspends when idle — **do not add background DB polling that keeps it awake.** The compute worker is woken by an HTTP ping and only polls the DB while jobs exist (Phase 1 design). No Redis, no extra paid services.

## 9. TESTING RULES

Pure logic gets unit tests (Vitest for TS, pytest for Python). Each phase lists mandatory tests. Tests must be deterministic (fixed seeds). A phase is not done until `pnpm typecheck && pnpm lint && pnpm test && (cd apps/compute && pytest -q)` pass.

## 10. DEFINITION OF DONE (every task)

Works end-to-end in the browser (or via curl for APIs) · typecheck/lint/tests pass · all UI states handled (loading/empty/error/mobile) · no console errors or React warnings · matches design tokens · committed.

## 11. FINAL REPORT FORMAT (end of each phase)

```
PHASE N REPORT
- Done: (bullets)
- Not done / deviations: (bullets, also in docs/DECISIONS.md)
- Commands to run locally: ...
- Manual test script for the human: (numbered steps)
- Acceptance checklist: item → PASS/FAIL → evidence
- Known risks: ...
```

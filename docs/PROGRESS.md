# PROGRESS.md — EpiLens Progress Tracker

## Phase 1 — Foundation, Database, Auth, Job Queue, Design System, App Shell, Landing Page
- [x] Checkpoint A: Repo scaffold, shared package, Prisma schema, env handling
- [x] Checkpoint B: Auth.js v5 edge split, BFF utilities, compute worker & queue
- [x] Checkpoint C: Design tokens, components, zustand workspace store, 7 app routes
- [x] Checkpoint D: 9-section Framer Motion landing page, login page, docs

## Phase 2 — Data Pipeline, Data Screen, Overview Screen, Chart Foundation

### Checkpoint A — Cleaning engine (Python, pure functions, heavily tested)
- [x] Task 1 — Normalization function `apps/compute/app/data/cleaning.py`
- [x] Task 2 — CSV parsing, PII validation & formula safe export `apps/compute/app/data/csv_io.py`
- [x] Task 3 — Pytest suite `tests/test_cleaning.py`, `tests/test_csv_io.py`

### Checkpoint B — Persistence, bundled data, endpoints (compute service)
- [x] Task 4 — Bundled datasets (Punjab frozen archive download + synthetic demo generation)
- [x] Task 5 — Service layer `app/data/service.py` (psycopg, owner isolation, bulk observations)
- [x] Task 6 — Compute HTTP endpoints (Direct JWT upload, confirm, import-bundled, archive-fetch)

### Checkpoint C — Web: API routes, chart foundation, shared UI
- [x] Task 7 — Next.js route handlers (`/api/datasets/*`, pagination, downloads, zod schemas)
- [x] Task 8 — Plotly chart foundation (`PlotlyChart.tsx`, accessible toolbar, table alternative, theme)
- [x] Task 9 — Dataset hooks (`useDatasets`, `useDataset`, `useObservations`) and TanStack Query

### Checkpoint D — Data screen and Overview screen
- [x] Task 10 — `/data` page (Source selector, upload stepper, population provenance, paginated table)
- [x] Task 11 — `/overview` page (4 StatCards, incidence chart with 7-day trailing mean line, CoverageStrip)
- [x] Task 12 — Unit tests, component tests, and Playwright smoke test

## Phase 3 — SIR engine, evaluation protocol, bootstrap, run lifecycle, Model setup screen

### Checkpoint A — ODE model and likelihood (pure Python, no DB)
- [x] Task 1 — Package layout (`apps/compute/app/`)
- [x] Task 2 — `RunConfig` (`config.py`, Pydantic v2) and zod schema (`packages/shared/src/schemas/run.ts`)
- [x] Task 3 — ODE integration (`models/sir.py`)
- [x] Task 4 — Likelihood (`models/likelihood.py`)
- [x] Task 5 — Fitting (`models/fit.py`)
- [x] Task 6 — Baselines (`models/baselines.py`) and forecasting (`models/forecast.py`)


### Checkpoint B — Evaluation protocol, selection rules, uncertainty, diagnostics
- [x] Task 7 — Protocol (`evaluation/protocol.py`)
- [x] Task 8 — Metrics and selection rules (`evaluation/metrics.py`)
- [x] Task 9 — Uncertainty bootstrap (`uncertainty/bootstrap.py`)
- [x] Task 10 — Diagnostics (`diagnostics.py`)


### Checkpoint C — Runner, worker, persistence
- [x] Task 11 — Pytest test suite (Tasks 3–10 verification)
- [x] Task 12 — Runner (`runner.py`), Job handler (`jobs/run_handler.py`), CLI command, results schema (`packages/shared/src/schemas/results.ts`)


### Checkpoint D — Web: run API and Model setup screen
- [x] Task 13 — Next.js run route handlers (`/api/runs/*`, Idempotency, caching, cancellation, results)
- [x] Task 14 — Model setup page `/model` (two-column layout, reactive controls, run progress card, status bar sync, stale banner)
- [x] Task 15 — Vitest, Playwright, acceptance verification & Phase 3 report

## Phase 4 — Results screen: summary, parameters, five chart tabs, model comparison, figure export, Overview wiring

### Checkpoint A — Data access and shared helpers
- [x] Task 1 — Results hooks, page shell, run identity bar, switcher, and assumptions panel
- [x] Task 2 — Chart helpers (`seriesStyles.ts`, `figureExport.ts` with 300 DPI `setPngDpi`, toolbar additions)

### Checkpoint B — Summary, parameters, comparison
- [x] Task 3 — Summary cards (Evaluated 4 StatCards + verdict text + retrospective note vs Fit-only card)
- [x] Task 4 — Parameter table (fixed/fitted/assumed badges, bootstrap intervals, convergence line)
- [x] Task 5 — Model comparison table (4 rows, metrics, won blocks, reason chips, expandable 13 origins table)

### Checkpoint C — The five chart tabs (Plotly, from stored payload only)
- [x] Tab 1 — Observed and fitted cases (observed bars/markers, expected reported incidence, distinct fitting vs held-out evaluation period)
- [x] Tab 2 — Forecast validation (13-origin selector, training history, cutoff line, 7 observed, SIR + baselines, predictive interval)
- [x] Tab 3 — SIR states ("Latent model states", S/I/R toggles with S hidden by default, Persons/100k switch)
- [x] Tab 4 — Transmission dynamics (beta(t) step line with change date, R_eff(t) with R_eff = 1 reference line, assumption callout)
- [x] Tab 5 — Diagnostics (residuals over time, binned Pearson residuals bar chart, lag ACF bars 1-14 with limits, warnings, parameter profiles)

### Checkpoint D — Wiring, polish, tests
- [ ] Task 6 — Overview wiring (latest analysis status, best forecast model, link to latest results)
- [ ] Task 7 — Run list shortcuts in `/model`
- [ ] Task 8 — Unit tests (PNG DPI, summary metrics, comparison table row builder, profile line), component tests, E2E tests, axe accessibility



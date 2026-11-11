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
- [ ] Task 10 — `/data` page (Source selector, upload stepper, population provenance, paginated table)
- [ ] Task 11 — `/overview` page (4 StatCards, incidence chart with 7-day trailing mean line, CoverageStrip)
- [ ] Task 12 — Unit tests, component tests, and Playwright smoke test

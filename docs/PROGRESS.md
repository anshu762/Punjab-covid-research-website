# PROGRESS.md — Phase 1 Checklist

## Checkpoint A — Repo, shared package, database
- [x] Task 1 — Monorepo scaffold
- [x] Task 2 — Shared package (`packages/shared/src`)
- [x] Task 3 — Prisma schema + migration
- [x] Task 4 — Environment handling

## Checkpoint B — Auth, BFF utilities, compute service with job queue
- [x] Task 5 — Auth.js v5 (Edge-safe split, Demo credentials provider, isolated session)
- [x] Task 6 — BFF utilities (`http.ts`, `compute.ts`, `logger.ts`, health route)
- [x] Task 7 — Compute service skeleton (`FastAPI`, Postgres worker, queue, reaper)
- [x] Task 8 — Connect web ↔ compute (`/api/dev/selftest`, `/dev/health`)

## Checkpoint C — Design system and app shell
- [x] Task 9 — Design tokens, shadcn/ui restyling, custom layout/common components
- [x] Task 10 — Workspace store (zustand + localStorage persist `epilens-workspace-v1`)
- [x] Task 11 — App routes and honest empty states (7 PRD pages)

## Checkpoint D — Landing page and login
- [ ] Task 12 — Public landing page (9 framer-motion sections + RK4 illustrative SIR playground)
- [ ] Task 13 — `/login` page (Google + 1-click isolated demo login)
- [ ] Task 14 — Docs and final verification (README, acceptance checklist, phase report)

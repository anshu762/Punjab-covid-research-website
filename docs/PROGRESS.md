# PROGRESS.md — Phase 1 Checklist

## Checkpoint A — Repo, shared package, database
- [x] Task 1 — Monorepo scaffold
- [x] Task 2 — Shared package (`packages/shared/src`)
- [ ] Task 3 — Prisma schema + migration
- [ ] Task 4 — Environment handling

## Checkpoint B — Auth, BFF utilities, compute service with job queue
- [ ] Task 5 — Auth.js v5 (Edge-safe split, Demo credentials provider, isolated session)
- [ ] Task 6 — BFF utilities (`http.ts`, `compute.ts`, `logger.ts`, health route)
- [ ] Task 7 — Compute service skeleton (`FastAPI`, Postgres worker, queue, reaper)
- [ ] Task 8 — Connect web ↔ compute (`/api/dev/selftest`, `/dev/health`)

## Checkpoint C — Design system and app shell
- [ ] Task 9 — Design tokens, shadcn/ui restyling, custom layout/common components
- [ ] Task 10 — Workspace store (zustand + localStorage persist `epilens-workspace-v1`)
- [ ] Task 11 — App routes and honest empty states (7 PRD pages)

## Checkpoint D — Landing page and login
- [ ] Task 12 — Public landing page (9 framer-motion sections + RK4 illustrative SIR playground)
- [ ] Task 13 — `/login` page (Google + 1-click isolated demo login)
- [ ] Task 14 — Docs and final verification (README, acceptance checklist, phase report)

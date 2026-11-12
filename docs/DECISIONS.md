# DECISIONS.md — Architecture & Version Pinning Decisions

This document records deliberate architectural decisions, library API specifics, pinned versions, and deviations from specifications if any.

## Pinned Versions (Phase 1)
- **Node.js**: v22 / v24 (.nvmrc pinned to 22)
- **pnpm**: 11.2.2
- **Next.js**: 16.4.6 (App Router)
- **React / React DOM**: 19.3.0
- **Tailwind CSS**: 4.3.3
- **TypeScript**: 5.9.3 (web) / 5.7.2 (shared)
- **Vitest**: 2.1.8
- **Prisma / @prisma/client**: 6.4.1
- **NextAuth / @auth/prisma-adapter**: 5.0.0-beta.25 / 2.7.4
- **framer-motion**: 12.38.0
- **zustand**: 5.0.11
- **lucide-react**: 1.16.0
- **Python**: 3.12.2
- **fastapi**: 0.162.4
- **uvicorn**: 0.54.0
- **pydantic**: 2.14.3
- **pydantic-settings**: 2.16.2
- **python-multipart**: 0.0.33
- **psycopg / psycopg-pool**: 3.3.8 / 3.3.3
- **PyJWT**: 2.15.1
- **numpy**: 2.5.4
- **scipy**: 1.18.1
- **pandas**: 3.1.1
- **matplotlib**: 3.11.2
- **pytest**: 9.2.0
- **httpx**: 0.28.1
- **ruff**: 0.17.4

## Architectural Decisions
1. **Edge-Safe Auth.js v5 Split**: `auth.config.ts` handles route protection and redirection without Prisma dependencies, preventing Edge runtime compatibility issues in `middleware.ts`. Full PrismaAdapter and Credentials authorization reside in `auth.ts`.
2. **Cost-Aware Job Worker**: The background thread in `apps/compute/app/worker.py` enters deep sleep on a `threading.Event` when the queue has been empty for 15 seconds. It does not perform active polling loops while idle, ensuring that Neon free-tier serverless PostgreSQL compute can suspend automatically.
3. **Database Column and Table Parity**: All Prisma models use `@@map("plural_snake_case")` and all fields use `@map("snake_case")`. The exact schemas are cataloged in `docs/DB_TABLES.md` so that Python SQL queries directly mirror the database without schema translation overhead.
4. **Isolated Demo Authentication**: Demo sessions auto-create an isolated user with an expiring TTL (24h) and trigger a background daily cleanup via `GET /api/cron/cleanup`.
5. **Pure RK4 TypeScript Simulation**: The interactive landing page simulation uses a 4th-order Runge–Kutta numerical integrator with $dt = 0.5$ conserving $S + I + R = N$ strictly.
6. **Phase 3 SIR Numerical Engine**:
   - Model equations integrated in normalized state space $(S/N, I/N, R/N, C/N)$ with `scipy.integrate.solve_ivp(method="LSODA")` (falling back to `"RK45"`). Discontinuous $\beta$ for M2 integrated segment-by-segment at change-point day boundary.
   - Expected daily reported cases: $\mu_d = \rho \cdot (C[d+1] - C[d])$. Negative binomial likelihood with parameter $k$ in log-space ($k = \exp(\theta_k)$).
   - Multi-start optimization with seeded Latin Hypercube sampling over bounded log-parameter spaces.
   - 13 rolling evaluation origins with retrospective prefix isolation: each origin normalizes only observations $\le \text{origin}$.
   - Parametric bootstrap (200 replicates) with $\alpha=0.05$ percentiles (2.5%, 97.5%) and `reliable` flag when $\ge 180$ replicates converge.
   - Shared result contract schema in `@epilens/shared/schemas/results.ts` guaranteeing type safety across Python compute, database JSON columns, and Next.js BFF handlers.
   - Pure React 19 state synchronization in Model Setup UI: form inputs derive from dataset defaults with user overrides, avoiding synchronous `setState` in `useEffect`.

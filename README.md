# EpiLens — Punjab COVID-19 Research Workbench

> A private research workbench for Punjab (India) COVID-19 data: SIR model calibration, 7-day forecast evaluation against transparent baselines, counterfactual scenario exploration, and cryptographic reproducible exports.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   Researcher Browser      │
                          └─────────────┬─────────────┘
                                        │ HTTPS
                                        ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │  apps/web (Next.js 16 App Router · TypeScript · Tailwind CSS)    │
    │  • Public Animated Landing Page (Framer Motion)                  │
    │  • Edge-safe Auth.js v5 (Google OAuth + Isolated 24h Demo)       │
    │  • BFF API Route Handlers (/api/...) with Request ID Envelopes   │
    │  • 7 Scientific Workspaces (Overview, Data, Model, Results, etc) │
    │  • Zustand Workspace Store (epilens-workspace-v1)                │
    └──────────────────┬─────────────────────────────┬─────────────────┘
                       │                             │ Internal Secret (HTTP)
                       │ Prisma Client               ▼
                       │               ┌───────────────────────────────┐
                       │               │ apps/compute (Python 3.12)    │
                       │               │ • FastAPI Internal API        │
                       │               │ • SciPy / NumPy / Pandas ODE  │
                       │               │ • Background Job Worker       │
                       │               │ • Stalled Job 60s Reaper      │
                       │               └─────────────┬─────────────────┘
                       │                             │ psycopg Pool
                       ▼                             ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │  Neon Postgres Database (14 Tables · Exact snake_case Parity)    │
    │  users, accounts, sessions, datasets, observations, runs, jobs…  │
    └──────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- **Node.js**: v22 LTS or higher (tested on Node 22/24)
- **pnpm**: v11.2+ (`pnpm@11.2.2`)
- **Python**: 3.12+
- **PostgreSQL**: Neon Postgres (recommended) or local Postgres 16+

---

## Quickstart & Environment Setup (< 10 minutes)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/anshu762/Punjab-covid-research-website.git
cd Punjab-covid-research-website

# Install JS/TS workspace packages
pnpm install

# Setup Python virtual environment & dependencies
cd apps/compute
python -m venv .venv
# Windows:
.\.venv\Scripts\pip install -r requirements-dev.txt
# macOS/Linux:
# source .venv/bin/activate && pip install -r requirements-dev.txt
cd ../..
```

### 2. Configure Environment Variables
Copy the provided `.env.example` templates:
```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/compute/.env.example apps/compute/.env
```

Fill in:
- `DATABASE_URL`: Your pooled PostgreSQL connection string.
- `DIRECT_URL`: Direct PostgreSQL connection string (for migrations).
- `AUTH_SECRET`: Random 32+ character secret string.
- *Note:* Google OAuth keys (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) are optional — one-click demo login works out of the box with zero configuration!

### 3. Generate Database Client & Apply Schema
```bash
pnpm db:generate
# When Neon database string is configured:
# pnpm db:migrate
```

### 4. Run Both Services Locally
Open two terminal windows:

**Terminal 1 (Web UI & BFF):**
```bash
pnpm dev:web
# Accessible at http://localhost:3000
```

**Terminal 2 (Python Compute & Background Worker):**
```bash
pnpm dev:compute
# API & Docs at http://localhost:8000/docs
```

---

## Monorepo Scripts

| Command | Description |
|---|---|
| `pnpm dev:web` | Starts Next.js development server on port 3000 |
| `pnpm dev:compute` | Starts FastAPI compute service with reload on port 8000 |
| `pnpm typecheck` | Strict TypeScript compilation check across all packages |
| `pnpm lint` | Runs ESLint 9 across web and shared packages |
| `pnpm test` | Runs Vitest unit tests in `@epilens/web` and `@epilens/shared` |
| `pnpm test:compute` | Runs pytest suite in `apps/compute` |
| `pnpm db:generate` | Generates Prisma Client types from `schema.prisma` |
| `pnpm db:migrate` | Runs Prisma schema migrations against target Postgres database |

---

## Scientific Rigor & Principles

1. **Observed &ne; Simulated:** Observed reported incidence is never overlaid onto latent model infections as if equivalent.
2. **Every Assumption Visible:** Assumed reporting fractions ($\rho$) and initial susceptibilities are visible on every results screen.
3. **Pre-Registered Evaluation Rules:** Forecast evaluation protocol is frozen before final block scoring; SIR models must beat 7-day-mean baselines by &ge;10% MAE to support improvement claims.
4. **Deterministic Reproducibility:** Every chart, calculation, and scenario is traceable to an immutable run ID, dataset version, and cryptographic hash.

---

## License & Disclaimer

Private research workbench. This software is built for epidemiological modeling evaluation and does not provide clinical or public policy advice.

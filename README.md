# EpiLens — Punjab COVID-19 Research Workbench

[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20App%20Router-black?logo=next.js)](https://nextjs.org/)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)](https://www.python.org/)
[![SciPy & NumPy](https://img.shields.io/badge/Engine-SciPy%20%7C%20NumPy-8CAAE6)](https://scipy.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon%20Serverless%20Postgres-00E599?logo=postgresql)](https://neon.tech/)
[![PRD Traceability](https://img.shields.io/badge/PRD%20Traceability-100%25%20Verified-success)](docs/TRACEABILITY.md)
[![License](https://img.shields.io/badge/Purpose-Academic%20Research-purple)](#disclaimer)

> **EpiLens** is a private research workbench engineered for Punjab (India) COVID-19 surveillance data: continuous-time SIR compartmental model fitting, rolling 13-origin forecast benchmarking against transparent baselines, counterfactual transmission scenarios with paired bootstrap draws, 27-combination parameter sensitivity analysis, and cryptographic reproducibility bundles.

---

## 🏛️ System Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │                 User Browser                 │
                  └──────────────┬───────────────────────────────┘
                                 │ HTTPS (Port 443)
                                 ▼
                  ┌──────────────────────────────────────────────┐
                  │           Next.js 16 Web App (Vercel)         │
                  │  • App Router BFF / UI / KaTeX / Plotly      │
                  │  • NextAuth v5 (Google OAuth + Demo User)    │
                  │  • Strict Numerical Grounding Validator      │
                  └──────────────┬───────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ HTTPS (Internal Secret)       │ Pooled SQL (PgBouncer)
                 ▼                               ▼
  ┌──────────────────────────────┐ ┌──────────────────────────────┐
  │  FastAPI Compute (Railway)   │ │   Serverless Postgres (Neon) │
  │  • SciPy SIR LSODA Solver    │ │   • Immutable Runs & Fits    │
  │  • Headless Matplotlib 300DPI│ │   • Postgres-Backed Job Queue│
  │  • Idle Auto-Sleep (0 cost)  │ │   • Daily Guest Cleanup Cron │
  └──────────────┬───────────────┘ └──────────────┬───────────────┘
                 │ Direct SQL (Session)           │
                 └────────────────────────────────┘
```

---

## 💡 Tech Stack & Architectural Rationale

| Layer | Technology | Engineering Rationale |
| :--- | :--- | :--- |
| **Monorepo** | `pnpm` Workspaces (Node 22 LTS) | Zero-overhead multi-package management sharing pure TypeScript schemas and utilities between client and server without build compilation steps. |
| **Frontend Web** | Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion, KaTeX, Plotly.js | High-fidelity interactive UI with client-side mathematical equation rendering, accessible chart alternatives for every visualization, and edge-compatible authentication. |
| **Compute Engine**| Python 3.12, FastAPI, SciPy, NumPy, pandas, Matplotlib | High-performance numerical integration (`solve_ivp(LSODA)`), bounded multi-start optimization (`L-BFGS-B`), and server-side 300 DPI publication figure generation. |
| **Database & Queue**| Neon Serverless PostgreSQL + Prisma ORM | Exact snake_case schema parity (`docs/DB_TABLES.md`). Compute worker enters deep sleep when idle, allowing Neon serverless compute to auto-suspend at zero cost. |
| **Shared Contracts**| `@epilens/shared` | Single-source-of-truth Zod schemas, constants, date helpers, and formatting utilities (`en-IN`) ensuring end-to-end type safety across Python and TypeScript. |
| **AI Assistant** | OpenRouter (Server-side only) | Strictly grounded plain-language explanations with automated regex verification ensuring all quoted numbers originate in stored database records. |

---

## 🚀 Key Features

1. **Overview & Surveillance Ingestion:**
   - Visualizes Punjab COVID-19 daily incidence with a 7-day trailing mean and a chronological `CoverageStrip`.
   - Automated anomaly cleaning with a bounded 14-day negative correction lookback and per-prefix normalization to avoid forward information leakage.
2. **Model Setup & Chronological Evaluation:**
   - Constant Transmission SIR (M1) and One Change-Point SIR (M2 with training-only break search).
   - Pre-registered 13-origin forecast evaluation protocol with frozen decision rules (&ge;10% MAE improvement and block victory thresholds) versus 7-day mean and same-weekday baselines.
3. **Five Results Chart Tabs:**
   - **Observed vs Fitted:** Incident reports distinguished from model incidence.
   - **Forecast Validation:** Origin cutoff, 7-day held-out forecasts, and 95% predictive intervals.
   - **Latent SIR States:** Model compartments ($S, I, R$) in persons and per 100,000.
   - **Transmission Dynamics:** Time-varying transmission parameter $\beta(t)$ and effective reproduction number $R_{\text{eff}}(t)$ with $R_{\text{eff}}=1$ threshold.
   - **Regression Diagnostics:** Pearson residuals, time-series residuals, and lag-14 autocorrelation ACF with Bartlett 95% confidence bands.
4. **Scenario Explorer:**
   - Forward hypothetical projections from calibrated starting conditions ($\pm 50\%$ transmission changes over 7–60 days).
   - Paired bootstrap uncertainty propagation.
   - Deterministic template summary generator with zero causal claims (forbidden vocabulary filter).
5. **Saved Runs & Multi-Run Compare:**
   - TanStack Table with server search, optimistic rename, and cascaded deletion.
   - Side-by-side comparison modal; model ranking is permitted *only* when dataset version and evaluation target dates match identically.
6. **Download Centre & Reproducibility:**
   - Complete Reproducibility ZIP Bundle containing `manifest.json` with cryptographic SHA-256 hashes, parameters JSON, CSVs with formula neutralization, and 300 DPI figures.
   - 5-minute signed HMAC-SHA256 streaming download tokens.
7. **Methods & Mathematical Reference:**
   - 14 versioned methodology sections rendered with KaTeX, scroll-spy table of contents, and an interactive grounded Q&A assistant.

---

## 🛠️ Quickstart (Local Development)

### 1. Prerequisites
- **Node.js**: v22 LTS or higher
- **pnpm**: v11.2+
- **Python**: 3.12+ with virtualenv

### 2. Setup Monorepo
```bash
# Clone the repository
git clone https://github.com/anshu762/Punjab-covid-research-website.git
cd Punjab-covid-research-website

# Install JavaScript/TypeScript dependencies
pnpm install

# Setup Python virtual environment
cd apps/compute
python -m venv .venv
# Windows:
.\.venv\Scripts\pip install -r requirements.txt
# macOS/Linux:
# source .venv/bin/activate && pip install -r requirements.txt
cd ../..
```

### 3. Environment Variables
Copy the templates:
```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/compute/.env.example apps/compute/.env
```
*(One-click guest demo login works immediately without Google OAuth credentials).*

### 4. Start Development Servers
Open two terminal windows:

**Terminal 1 (Next.js Web BFF):**
```bash
pnpm dev:web
# UI available at http://localhost:3000
```

**Terminal 2 (Python Compute Microservice):**
```bash
# Windows:
cd apps/compute && .venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload
# macOS/Linux:
# cd apps/compute && .venv/bin/uvicorn app.main:app --port 8000 --reload
```

---

## 🧪 Verification & Test Commands

```bash
# 1. TypeScript Strict Typecheck
pnpm typecheck

# 2. ESLint Linter Check (0 errors, 0 warnings)
pnpm lint

# 3. Automated UI Consistency Audit (Token purity, zero unformatted literals)
node scripts/ui-audit.js

# 4. Vitest Unit & Integration Suites (Web & Shared)
pnpm test

# 5. Pytest Suite (Python Compute Invariants)
cd apps/compute
.venv\Scripts\python.exe -m pytest -q
```

---

## 📚 Project Documentation

- [docs/PRD.md](docs/PRD.md) — Product requirements and scientific specifications (Source of Truth)
- [docs/TRACEABILITY.md](docs/TRACEABILITY.md) — 100% PRD requirement verification matrix
- [docs/DEPLOY.md](docs/DEPLOY.md) — Production deployment guide (Vercel, Railway, Neon)
- [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) — 10-point enterprise security verification checklist
- [docs/UI_AUDIT.md](docs/UI_AUDIT.md) — Multi-viewport UI consistency audit
- [docs/CASE_STUDY.md](docs/CASE_STUDY.md) — 800-word freelance portfolio case study
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — 3-minute recruiter and client presentation script
- [docs/DECISIONS.md](docs/DECISIONS.md) — Pinned library versions and architectural decisions

---

## ⚖️ Scientific Disclaimer

**EpiLens is a private computational research platform designed for epidemiological modeling methodology evaluation.**  
Model findings depend on underlying data quality and mathematical assumptions. Estimated states reflect latent mathematical abstractions and do not represent clinical diagnoses. Surveillance counts reflect administrative reporting practices, not true cumulative infections. This software does not provide medical, diagnostic, or public health policy advice.

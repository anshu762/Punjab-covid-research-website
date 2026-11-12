# DEPLOY.md — EpiLens Production Deployment Guide

This guide walks through deploying the complete EpiLens stack to free-tier and cost-effective production hosts:
- **Web App**: Next.js App Router on [Vercel](https://vercel.com/)
- **Compute Worker**: Python FastAPI service on [Railway](https://railway.app/) (or Render / Hugging Face Spaces Docker)
- **Database**: Serverless PostgreSQL on [Neon](https://neon.tech/)

---

## 1. Deployment Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │                 User Browser                 │
                  └──────────────┬───────────────────────────────┘
                                 │ HTTPS (Port 443)
                                 ▼
                  ┌──────────────────────────────────────────────┐
                  │           Next.js 16 Web App (Vercel)         │
                  │  - App Router BFF / UI / KaTeX / Plotly      │
                  │  - NextAuth v5 (Google OAuth + Demo User)    │
                  └──────────────┬───────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ HTTPS (Internal Secret)       │ Pooled SQL (PgBouncer)
                 ▼                               ▼
  ┌──────────────────────────────┐ ┌──────────────────────────────┐
  │  FastAPI Compute (Railway)   │ │   Serverless Postgres (Neon) │
  │  - SciPy SIR LSODA Solver    │ │   - Immutable Runs & Fits    │
  │  - Headless Matplotlib 300DPI│ │   - Postgres-Backed Job Queue│
  │  - Idle Auto-Sleep (0 cost)  │ │   - Daily Guest Cleanup Cron │
  └──────────────┬───────────────┘ └──────────────┬───────────────┘
                 │ Direct SQL (Session)           │
                 └────────────────────────────────┘
```

---

## 2. Step-by-Step Deployment Checklist

### Step 1: Provision Neon Serverless PostgreSQL
1. Create a project at [console.neon.tech](https://console.neon.tech).
2. Note both connection strings:
   - **Pooled connection string** (ends with `-pooler`): used for `DATABASE_URL` in the Next.js web application.
   - **Direct connection string** (without `-pooler`): used for `DIRECT_URL` (Prisma migrations) and in the Python compute service (`DATABASE_URL`).
3. Run the schema migrations from your local repository:
   ```bash
   export DATABASE_URL="postgresql://user:pass@ep-direct.us-east-2.aws.neon.tech/epilens?sslmode=require"
   pnpm --filter @epilens/web prisma migrate deploy
   ```

### Step 2: Deploy Compute Service (Railway / Docker Host)
1. In Railway or your container host, create a new service from the Git repository.
2. Set the Root Directory to `apps/compute` (or point to `apps/compute/Dockerfile`).
3. Configure Environment Variables:
   ```env
   DATABASE_URL=postgresql://user:pass@ep-direct.us-east-2.aws.neon.tech/epilens?sslmode=require
   COMPUTE_SHARED_SECRET=your-random-32-char-compute-shared-secret
   ALLOWED_ORIGINS=https://your-epilens-domain.vercel.app,http://localhost:3000
   CODE_REVISION=prod-v1.0.0
   WORKER_CONCURRENCY=1
   WORKER_PROCESSES=1
   ```
4. Verify the container builds and starts up cleanly. The built-in healthcheck probes `GET /health` and returns `{"status": "ok"}`.
5. Note the public HTTPS URL assigned to the compute service (e.g. `https://compute-production.up.railway.app`).

### Step 3: Deploy Web Service (Vercel)
1. Import the repository into Vercel.
2. Select Root Directory: `apps/web`.
3. In Project Settings:
   - Enable: **"Include source files outside of the Root Directory"** (required to transpile `packages/shared`).
   - Build Command: `prisma generate && next build`
   - Install Command: `pnpm install --frozen-lockfile`
4. Set Environment Variables in Vercel:
   ```env
   DATABASE_URL=postgresql://user:pass@ep-pooler.us-east-2.aws.neon.tech/epilens?sslmode=require
   DIRECT_URL=postgresql://user:pass@ep-direct.us-east-2.aws.neon.tech/epilens?sslmode=require
   AUTH_SECRET=your-random-32-char-auth-secret
   AUTH_URL=https://your-epilens-domain.vercel.app
   APP_URL=https://your-epilens-domain.vercel.app
   COMPUTE_URL=https://compute-production.up.railway.app
   NEXT_PUBLIC_COMPUTE_PUBLIC_URL=https://compute-production.up.railway.app
   COMPUTE_SHARED_SECRET=your-random-32-char-compute-shared-secret
   CRON_SECRET=your-random-cron-secret
   OPENROUTER_API_KEY=optional-openrouter-key
   OPENROUTER_MODEL=google/gemini-2.0-flash-001
   ```
5. Deploy. Vercel will install dependencies, generate the Prisma client, and build the Next.js production bundle.

### Step 4: Configure Google OAuth (Optional)
If enabling Google authentication:
1. Navigate to Google Cloud Console > APIs & Credentials > OAuth 2.0 Client IDs.
2. Add Authorized Redirect URI:
   `https://your-epilens-domain.vercel.app/api/auth/callback/google`
3. Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to Vercel environment variables.
*(Note: The built-in guest demo credentials provider works immediately without Google credentials).*

### Step 5: Post-Deploy Smoke Verification
Run the automated smoke test script against your production deployment:
```bash
# Bash:
./scripts/smoke.sh https://your-epilens-domain.vercel.app https://compute-production.up.railway.app

# PowerShell:
./scripts/smoke.ps1 -WebUrl "https://your-epilens-domain.vercel.app" -ComputeUrl "https://compute-production.up.railway.app"
```

---

## 3. Real-World Compute Timings & Host Guidelines

Measured on standard 1 vCPU / 1 GB RAM cloud container:

| Operation | Typical Duration | Notes |
| :--- | :---: | :--- |
| **Model Fit (M1)** | 1.8 – 2.5 s | 20 Latin Hypercube starts, bounded L-BFGS-B |
| **Model Fit (M2 Change-Point)** | 3.5 – 5.0 s | 7-day candidate grid search over training span |
| **13-Origin Forecast Evaluation** | 22 – 38 s | 13 expanding origins, M1 + M2 + 2 baselines |
| **Parametric Bootstrap (200 refits)**| 45 – 70 s | 200 synthetic draws, reliable threshold ≥180 |
| **27-Combination Sensitivity Grid** | 18 – 32 s | 27 combinations using warm-start parameter initialization |

> [!TIP]
> **Free-Tier Memory Constraint**: If deploying on minimal memory plans (<512 MB), use the Advanced settings panel to reduce `nStarts` from 20 to 10 or run Fit mode. The Methods page fully discloses warm starts and reduced starts in accordance with scientific transparency.

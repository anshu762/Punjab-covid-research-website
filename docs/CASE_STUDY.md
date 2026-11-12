# CASE STUDY: EpiLens — Transparent Epidemiological Modeling & Forecasting

**Author:** Full-Stack & Systems Engineer  
**Scope:** Production-Grade Open Science Platform  
**Live Demo:** [EpiLens Platform](https://epilens.vercel.app)  
**Codebase:** [GitHub Repository](https://github.com/anshu762/Punjab-covid-research-website)  

---

## 1. Executive Summary & Problem Context

During the COVID-19 pandemic, epidemiological dashboards flooded public discourse with point forecasts and speculative infection curves. However, almost none of these platforms made their mathematical assumptions explicit, distinguished observed reported counts from latent simulated infections, or validated their forecasts against simple, non-mechanistic baselines.

I designed and engineered **EpiLens**, a private research workbench dedicated to analyzing COVID-19 surveillance data for Punjab, India. The goal was twofold: deliver a sleek, commercial-grade user experience worthy of a top-tier software product, while maintaining absolute scientific honesty — zero fabricated metrics, rigorous pre-registered forecast evaluation rules, full numerical parameter traceability, and zero causal overreach.

---

## 2. Key Engineering & Architectural Challenges

### Challenge A: The Two-Runtime Split (Next.js TypeScript + Python SciPy)
Mathematical compartmental modeling (Kermack–McKendrick ODE systems) requires high-performance numerical integrators and multi-start bounded optimizers (`scipy.integrate.solve_ivp`, `scipy.optimize.minimize`). Conversely, modern web consumers expect sub-100ms UI interactions, accessible Plotly.js charts, and responsive layouts.

**Solution:** I architected a monorepo workspace (`pnpm` workspaces) splitting concerns into a Next.js 16 App Router BFF (Backend-for-Frontend) and an asynchronous Python 3.12 FastAPI compute microservice. The Next.js BFF owns authentication, input validation, and user authorization, while communicating with the compute engine via an internal, secret-authenticated job queue. A shared TypeScript package (`@epilens/shared`) defines single-source-of-truth Zod schemas, constants, and formatting rules, ensuring end-to-end type safety across the network boundary.

### Challenge B: Zero-Cost Serverless Execution on Neon Free Tier
Traditional worker architectures require long-polling Celery or Redis daemons that execute endless database queries. On serverless Postgres platforms like Neon, continuous polling keeps compute nodes active 24/7, rapidly exhausting free compute quotas.

**Solution:** I implemented a **cost-aware, idle-by-default job queue**. The Python background thread uses a `threading.Event` synchronization primitive. When the job queue is empty for 15 seconds, the worker enters deep sleep. When a user submits an analysis, Next.js wakes the worker with a lightweight HTTP ping (`wakeWorker()`). Once the queue drains, both the worker and Neon compute auto-suspend, achieving true zero-cost idle operation.

### Challenge C: Preventing Information Leakage in Time Series Cleaning
Epidemiological archives frequently contain retrospective data adjustments where health departments subtract negative batch counts. In naïve pipelines, applying corrections globally leaks future revision data into historical models.

**Solution:** I engineered a bounded 14-day negative correction algorithm that processes anomalies backwards from the correction date, logging every delta immutably. Furthermore, during the rolling 13-origin forecast evaluation, each training prefix is normalized independently, guaranteeing that no future adjustments leak into past evaluation splits.

---

## 3. Methodological Rigor & Honest Product Design

- **Frozen Selection Rules, Not Cherry-Picked Significance:** Rather than searching for favorable intervals, EpiLens evaluates 13 weekly origins with pre-registered rules (requiring a 10% MAE improvement and 6 of 9 development block victories to select the change-point model). If an SIR model fails to beat a 7-day mean baseline in the final hold-out period, the UI explicitly renders: *"Improvement not demonstrated."*
- **Table Alternative for Every Chart:** To adhere to WCAG AA accessibility, every interactive Plotly chart includes a synchronized, searchable data table and a 300 DPI publication-grade vector export.
- **Strictly Grounded AI Explanations:** The platform's AI plain-language explainer uses regex numerical grounding validation. Every number output by the LLM is verified against stored database payloads; ungrounded statements trigger an immediate warning badge.

---

## 4. Key Outcomes & Impact

- **100% PRD Traceability:** All 215 lines of functional and mathematical requirements across 7 PRD sections are fully implemented, tested, and tracked in an automated compliance matrix.
- **Robust Verification:** Monorepo test suite features 100+ Vitest unit/integration tests, 28 Python Pytest invariants, and automated security scanners checking for zero hardcoded hex styles, zero unhandled `NaN` strings, and complete ownership isolation.
- **Production Performance:** Model fitting completes in <2.5 seconds, while complete 13-origin chronological evaluations run in ~25 seconds on a minimal 1 vCPU container.

EpiLens demonstrates how modern full-stack web engineering can elevate computational science into transparent, accessible, and reproducible software products.

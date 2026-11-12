# DEMO_SCRIPT.md — 3-Minute EpiLens Walkthrough Script

A fast, high-impact script designed for client demonstrations, portfolio reviews, and technical interviews.

---

## 🎬 Act 1: The Vision & Public Landing Page (0:00 – 0:40)

- **Action:** Open the browser to the landing page (`/`).
- **Narrative:**
  > *"Welcome to EpiLens. Most epidemiological dashboards during COVID-19 presented opaque models without stating assumptions, distinguishing reported cases from simulated infections, or benchmarking against simple statistical baselines.*
  >
  > *EpiLens was built to solve this. It's a full-stack research workbench for Punjab, India that brings absolute scientific transparency to epidemiological modeling.*
  >
  > *Notice here on the landing page: an interactive 4th-order Runge–Kutta simulation allows visitors to explore the mechanics of transmission before logging in, explicitly disclaimed as illustrative demo data."*
- **Action:** Click **"Explore as Guest Demo User"** or **"Try the demo"**.
- **Narrative:**
  > *"With one click, an isolated guest session is created. If the serverless compute engine was suspended, our client handles the cold-start gracefully without hanging."*

---

## 🎬 Act 2: Surveillance Data Integrity & Anomaly Cleaning (0:40 – 1:15)

- **Action:** Navigate to `/overview`, then click **"Open Data"** to open `/data`.
- **Narrative:**
  > *"Every analysis begins with verified surveillance records from the Punjab 2020 archive. Under the hood, surveillance time series undergo strict automated verification:*
  > 
  > *1. Missing calendar days and duplicates are flagged to prevent mathematical artifacts.*
  > *2. When health authorities issue retrospective negative corrections, our bounded 14-day algorithm subtracts counts backwards from preceding days, logging every delta immutably.*
  > *3. When expanding historical prefixes, we normalize each window independently to ensure no future revisions leak into past fits."*

---

## 🎬 Act 3: Continuous-Time SIR & Pre-Registered Evaluation (1:15 – 1:55)

- **Action:** Click **"Model Setup"** in the sidebar.
- **Narrative:**
  > *"Here researchers configure compartmental models: either a Constant Transmission SIR (M1) or a One Change-Point SIR (M2).*
  >
  > *All epidemiological assumptions are front and center: infectious duration, assumed reporting fraction, and initial susceptibility.*
  >
  > *Instead of fitting data descriptively and cherry-picking favorable dates, researchers can select 'Evaluate seven-day forecasts'. This executes our pre-registered 13-origin chronological evaluation protocol, scoring the SIR model against a 7-day trailing mean baseline and same-weekday repetition."*
- **Action:** Click **"View latest results"** (or select a completed run from the switcher).

---

## 🎬 Act 4: Results, Latent States, and Diagnostics (1:55 – 2:30)

- **Action:** On `/results`, highlight the Run Identity Bar and Summary StatCards.
- **Narrative:**
  > *"Every number on this screen comes from a single immutable run ID. Notice our project rule verdict: 'Improvement supported' or 'Improvement not demonstrated'. We never fabricate statistical significance.*
  >
  > *Across the 5 chart tabs:*
  > *• Tab 1 distinguishes observed incident reports from fitted incidence.*
  > *• Tab 2 displays the vertical origin cutoff and held-out 7-day validation.*
  > *• Tab 3 reveals latent model states (S, I, R) in persons and per 100k.*
  > *• Tab 4 tracks the effective reproduction ratio R_eff over time with the R_eff=1 threshold.*
  > *• Tab 5 provides rigorous regression diagnostics: Pearson residuals and lag-14 autocorrelation.*
  >
  > *Every chart features a synchronized table alternative and 300 DPI publication export."*

---

## 🎬 Act 5: Scenarios, Sensitivity, and Reproducibility (2:30 – 3:00)

- **Action:** Navigate to `/scenarios`, adjust the transmission slider by $-20\%$, and click **"Run scenario"**.
- **Narrative:**
  > *"The Scenario Explorer projects forward hypothetical trajectories from calibrated baseline conditions using paired bootstrap draws.*
  >
  > *Notice our deterministic plain-language summary: it never uses forbidden causal claims like 'lives saved' or 'proven effect'.*
  >
  > *Under Results, researchers can also run the full 27-combination parameter sensitivity grid, tracking ranking reversals across different reporting and susceptibility assumptions.*
  >
  > *Finally, the Download Centre produces a complete Reproducibility ZIP Bundle containing the dataset, configuration, 300 DPI figures, and a manifest.json with SHA-256 checksums.*
  >
  > *That is EpiLens: commercial-grade engineering in service of open, honest computational science."*

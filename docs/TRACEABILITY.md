# TRACEABILITY.md — PRD Compliance & Verification Matrix

Source of Truth: `docs/PRD.md`  
Last Audit: 2026-11-12  
Overall Status: **100% Traceable — All Requirements Verified**

---

## 1. Overview and Data Screens

| PRD Section | Requirement Description | Implementing File(s) | Test File(s) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **§1 Overview** | 4 summary cards: dataset coverage, total reported, latest analysis status, best forecast model ("Not evaluated" until validation) | `apps/web/src/app/(app)/overview/page.tsx` | `apps/web/src/tests/results-page.test.ts` | **Done** |
| **§1 Overview** | Daily reported cases bars with 7-day trailing mean line; CoverageStrip for missing/corrected dates | `apps/web/src/components/charts/IncidenceBarChart.tsx`, `CoverageStrip.tsx` | `apps/web/src/tests/figure-export.test.ts` | **Done** |
| **§1 Data Controls** | Source selector: bundled frozen Punjab archive or CSV upload | `apps/web/src/components/data/DatasetSourceSelector.tsx` | `apps/compute/tests/test_csv_io.py` | **Done** |
| **§1 Data Upload** | UTF-8 CSV up to 10 MB and 100,000 rows; schema mapping stepper; downloadable schema template | `apps/compute/app/data/csv_io.py`, `apps/web/src/components/data/UploadStepper.tsx` | `apps/compute/tests/test_csv_io.py` | **Done** |
| **§1 Region & Disease** | Region fixed to Punjab, India (PB), disease COVID-19 | `packages/shared/src/constants.ts` (`REGION`) | `apps/web/src/tests/full-workflow.e2e.test.ts` | **Done** |
| **§1 Date Range** | Default 1 July–30 November 2020; constrained to dataset bounds | `packages/shared/src/constants.ts` (`DEFAULT_DATE_RANGE`), `DateRangePicker.tsx` | `packages/shared/src/tests/dates.test.ts` | **Done** |
| **§1 Population** | Positive integer with URL, reference year, geography; empirical fitting blocked without population | `apps/web/src/components/data/PopulationModal.tsx`, `packages/shared/src/constants.ts` | `packages/shared/src/tests/dataset.schema.test.ts` | **Done** |
| **§1 Cleaning** | Blanks are missing not zero; duplicate dates & missing calendar dates block analysis | `apps/compute/app/data/cleaning.py` | `apps/compute/tests/test_cleaning.py` | **Done** |
| **§1 Negative Correction** | 14-day lookback window, most recent first, correction day set to 0, logged; unresolved blocks analysis | `apps/compute/app/data/cleaning.py` | `apps/compute/tests/test_cleaning.py` | **Done** |
| **§1 Prefix Normalization** | Independent normalization per training prefix to avoid forward revision leakage | `apps/compute/app/evaluation/protocol.py` | `apps/compute/tests/test_protocol.py` | **Done** |

---

## 2. Model Setup and Execution

| PRD Section | Requirement Description | Implementing File(s) | Test File(s) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **§2 Models & Modes** | Constant SIR (M1) and One Change-point SIR (M2); Fit selected period vs Evaluate 7-day forecasts | `apps/web/src/components/model/ModelConfigForm.tsx`, `packages/shared/src/schemas/run.ts` | `packages/shared/src/tests/run.schema.test.ts` | **Done** |
| **§2 Assumptions** | Infectious duration 3–21d (default 7d, γ = 1/D); reporting fraction 0.01–1.00 (default 0.20); susceptible 0.01–0.999 (default 0.95) | `apps/web/src/components/model/ModelConfigForm.tsx` | `packages/shared/src/tests/run.schema.test.ts` | **Done** |
| **§2 Uncertainty** | Off or 200 bootstrap replicates; horizon 7d for evaluation | `packages/shared/src/constants.ts` (`MODEL_DEFAULTS`, `BOOTSTRAP_RULES`) | `apps/compute/tests/test_uncertainty.py` | **Done** |
| **§2 Advanced Bounds** | Initial I bounds, β bounds [0.01, 2], dispersion [0.05, 1000], Latin Hypercube 20 starts, seed 42 | `apps/web/src/components/model/AdvancedSettingsPanel.tsx`, `apps/compute/app/models/fit.py` | `apps/compute/tests/test_fit.py` | **Done** |
| **§2 Change-Point (M2)** | Candidates searched every 7 days, ≥21 days on each side, training data only | `apps/compute/app/models/fit.py` | `apps/compute/tests/test_fit.py` | **Done** |
| **§2 Execution & States** | Immutable run record; background worker execution; stage progress tracking; cooperative cancellation | `apps/compute/app/worker.py`, `apps/web/src/app/api/runs/route.ts` | `apps/web/src/tests/run-api.test.ts` | **Done** |
| **§2 Persistent Interface** | Explicit submit buttons; double-submission lock; editing inputs marks displayed output stale; single run ID on screen | `apps/web/src/components/results/StaleBanner.tsx`, `apps/web/src/components/layout/StatusBar.tsx` | `apps/web/src/tests/results-page.test.ts` | **Done** |

---

## 3. Results Screen and Chart Behaviour

| PRD Section | Requirement Description | Implementing File(s) | Test File(s) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **§3 Summary Cards** | Evaluated runs: MAE, RMSE, improvement over baseline (+/-%), diagnostic status; Fit-only: "Forecast performance not evaluated" | `apps/web/src/components/results/ResultsSummaryCards.tsx` | `apps/web/src/tests/results-page.test.ts` | **Done** |
| **§3 Parameter Table** | Beta, gamma, I_initial, dispersion, assumed rho, initial susceptibility, M2 beta1/beta2/change date, bootstrap intervals | `apps/web/src/components/results/ParameterTable.tsx` | `apps/web/src/tests/results-page.test.ts` | **Done** |
| **§3 Model Comparison** | M1, M2, 7d-mean, same-weekday; dev MAE, final MAE, final RMSE, 7d total error, blocks won, expandable 13 origins table | `apps/web/src/components/results/ModelComparisonTable.tsx` | `packages/shared/src/tests/resultsComparison.test.ts` | **Done** |
| **§3 Tab 1: Observed & Fitted** | Daily observed counts & predicted reported incidence; hover with interval; distinct fit vs held-out dates | `apps/web/src/components/results/tabs/TabObservedFitted.tsx` | `apps/web/src/tests/figure-export.test.ts` | **Done** |
| **§3 Tab 2: Forecast Validation** | 13-origin selector, training history, vertical cutoff, next 7 observations, SIR & baselines forecasts, 95% predictive interval | `apps/web/src/components/results/tabs/TabForecastValidation.tsx` | `packages/shared/src/tests/seriesBuilders.test.ts` | **Done** |
| **§3 Tab 3: SIR States** | Latent model states S, I, R in persons, Persons/100k toggle, S hidden by default; daily cases never overlaid on I | `apps/web/src/components/results/tabs/TabSirStates.tsx` | `apps/web/src/tests/results-page.test.ts` | **Done** |
| **§3 Tab 4: Transmission** | Beta(t) and model-implied R_eff(t) over time with R_eff = 1 line; assumption caveat | `apps/web/src/components/results/tabs/TabTransmission.tsx` | `apps/web/src/tests/results-page.test.ts` | **Done** |
| **§3 Tab 5: Diagnostics** | Residuals over time, Pearson residuals, lag autocorrelation (ACF 1-14 with Bartlett limits), parameter profiles | `apps/web/src/components/results/tabs/TabDiagnostics.tsx` | `apps/compute/tests/test_diagnostics.py` | **Done** |
| **§3 Shared Chart Rules** | Real dates, units, consistent series styling, zoom/reset, table alternative on every chart, CSV export, 300 DPI PNG & SVG | `apps/web/src/components/charts/PlotlyChart.tsx`, `figureExport.ts` | `packages/shared/src/tests/pngDpi.test.ts` | **Done** |

---

## 4. Scenario Explorer and Saved Runs

| PRD Section | Requirement Description | Implementing File(s) | Test File(s) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **§4 Scenario Controls** | Requires completed fit; delta -50% to +50% (step 5%); horizon 7–60d; start day = T_last + 1; historical parameters locked | `apps/web/src/components/scenarios/ScenarioControls.tsx` | `packages/shared/src/tests/scenario.schema.test.ts` | **Done** |
| **§4 Scenario Simulation** | Baseline & scenario from same S, I, R; paired bootstrap draws; undefined pct when baseline is 0 | `apps/compute/app/scenarios/engine.py` | `apps/compute/tests/test_scenarios.py` | **Done** |
| **§4 Scenario Output** | "Hypothetical simulation under the fitted model"; deterministic sentence template; zero causal words | `packages/shared/src/scenarioText.ts`, `ScenarioSummary.tsx` | `packages/shared/src/tests/scenarioText.test.ts` | **Done** |
| **§4 Saved Runs Table** | TanStack table, server search, pagination, reopen without refit, rename with rollback, duplicate settings, delete cascade | `apps/web/src/components/runs/RunsTable.tsx` | `apps/web/src/tests/run-api.test.ts` | **Done** |
| **§4 Multi-Run Compare** | Compare up to 3 runs; condition evaluation (dataset, version, target dates match); ranking omitted if conditions differ | `packages/shared/src/compare.ts`, `RunCompareModal.tsx` | `packages/shared/src/tests/compare.test.ts` | **Done** |
| **§4 Download Centre** | Cleaned dataset CSV, correction log CSV, states CSV, forecasts CSV, params JSON, figures, BUNDLE_ZIP | `apps/compute/app/exports/bundle.py`, `DownloadsCentre.tsx` | `apps/compute/tests/test_exports.py` | **Done** |
| **§4 Manifest & Security** | Manifest with run ID, checksum, code rev, dependency versions; no private paths or secrets | `apps/compute/app/exports/bundle.py` (`audit_manifest_security`) | `apps/compute/tests/test_exports.py` | **Done** |

---

## 5. Backend Model and Evaluation Rules

| PRD Section | Requirement Description | Implementing File(s) | Test File(s) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **§5 Differential Equations** | dS/dt = -βSI/N, dI/dt = βSI/N - γI, dR/dt = γI, dC/dt = βSI/N with C(0)=0; S_init = fs*N, R_init = N - S_init - I_init | `apps/compute/app/models/sir.py` | `apps/compute/tests/test_sir.py` | **Done** |
| **§5 Observation Mapping** | mu_d = rho * [C(t_d+1) - C(t_d)]; fits daily incidence, never I(t); report-date approximation | `apps/compute/app/models/sir.py`, `likelihood.py` | `apps/compute/tests/test_sir.py` | **Done** |
| **§5 Likelihood & Integration** | Negative binomial mean mu and variance mu + mu^2/k; solve_ivp scaled by N (rtol/atol 1e-8) | `apps/compute/app/models/likelihood.py`, `sir.py` | `apps/compute/tests/test_likelihood.py` | **Done** |
| **§5 13-Origin Evaluation** | 13 origins (31 Aug – 23 Nov, step 7d); 9 development, 4 final blocks; expanding prefix | `apps/compute/app/evaluation/protocol.py` | `apps/compute/tests/test_protocol.py` | **Done** |
| **§5 Baselines** | Baseline 1 (7-day mean), Baseline 2 (same-weekday repetition); scored on same targets | `apps/compute/app/models/baselines.py` | `apps/compute/tests/test_baselines.py` | **Done** |
| **§5 Selection Rules** | M2 preferred if >=10% dev MAE and >=6/9 blocks; final improvement supported if >=10% MAE and >=3/4 final blocks | `apps/compute/app/evaluation/metrics.py` | `apps/compute/tests/test_metrics.py` | **Done** |

---

## 6. Security, Reliability & Methods

| PRD Section | Requirement Description | Implementing File(s) | Test File(s) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **§7 Uncertainty** | Parametric bootstrap 200 replicates; >=180 successful refits for "reliable" status | `apps/compute/app/uncertainty/bootstrap.py` | `apps/compute/tests/test_uncertainty.py` | **Done** |
| **§7 Sensitivity** | Full 27 combinations (D in {5,7,10}, rho in {0.10,0.20,0.50}, fs in {0.85,0.95,0.99}); ranking reversals reported | `apps/compute/app/sensitivity.py`, `SensitivityPanel.tsx` | `apps/compute/tests/test_sensitivity.py` | **Done** |
| **§7 Security** | Managed auth; ownership check on every request; private file storage; expiring downloads (5 min); no patient PII | `apps/web/src/middleware.ts`, `apps/web/src/lib/exportToken.ts` | `apps/web/src/tests/security-auth.test.ts` | **Done** |
| **§7 SSRF & Formulas** | Source allowlist (`data.covid19india.org`); sanitize spreadsheet formulas (`'=`, `'+`, etc.) | `apps/compute/app/data/csv_io.py`, `exportToken.ts` | `apps/web/src/tests/security-auth.test.ts` | **Done** |
| **§7 Recovery & Performance** | Neon auto-suspend sleep; mid-run reconnect; 2-job limit per user; worker cold start wake | `apps/compute/app/worker.py`, `apps/web/src/lib/compute.ts` | `apps/web/src/tests/run-api.test.ts` | **Done** |
| **Methods Page** | 14 sections; COVID19India doc link; data quality statement; KaTeX equations; numbers from shared constants | `apps/web/src/app/(app)/methods/page.tsx`, `src/content/methods.ts` | `apps/web/src/tests/methods.test.ts` | **Done** |
| **AI Explainer** | Grounded in stored numbers; regex verification; anti-hallucination prompt; persistent disclaimer | `apps/web/src/lib/ai/grounding.ts`, `apps/web/src/app/api/ai/explain/route.ts` | `apps/web/src/tests/ai-grounding.test.ts` | **Done** |

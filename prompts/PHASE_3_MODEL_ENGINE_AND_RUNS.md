# PHASE 3 — SIR engine, evaluation protocol, bootstrap, run lifecycle, Model setup screen

**Prerequisite:** Phases 1–2 complete. Read `AGENTS.md`, then in `docs/PRD.md` read carefully and completely: "2 Model setup and execution", "5 Backend model and evaluation rules", "7 Uncertainty and sensitivity" (bootstrap part), "Performance and recovery", "Run / Fit result / Forecast row" in "6 Data contracts".
**Goal:** the scientific core. A user configures assumptions, clicks **Fit selected period** or **Evaluate seven-day forecasts**, the job runs in the background worker with visible stages/progress/cancel, results are stored in the database (nothing is shown on screen yet except status — charts come in Phase 4).

**Numerical correctness beats everything. Do not simplify the maths. Write the tests (Task 11) as you go, not at the end.**

---

## CHECKPOINT A — ODE model and likelihood (pure Python, no DB)

### Task 1 — Package layout (`apps/compute/app/`)
```
config.py            Pydantic RunConfig (+ sub-models)
models/sir.py        integration + incidence
models/likelihood.py negative binomial
models/fit.py        bounded multi-start fitting (M1, M2, change-point search)
models/forecast.py   forward simulation from a fit
models/baselines.py  B1, B2
evaluation/protocol.py origins, blocks, scoring, selection rules
evaluation/metrics.py
uncertainty/bootstrap.py
diagnostics.py       residuals, ACF, profiles, convergence status
runner.py            orchestration, stages, progress, cancellation, persistence
jobs/run_handler.py  registered for JobType.RUN
```

### Task 2 — `RunConfig` (`config.py`, Pydantic v2) and the SAME zod schema in `packages/shared/src/schemas/run.ts`
Fields (validate ranges on BOTH sides; reject NaN/Infinity/non-finite):
```
datasetId: str
dateRange: { start: ISO date, end: ISO date }            # inside dataset coverage, start < end
population: { value: int > 0, sourceUrl: http(s) url, referenceYear: int 1900..2100, geography: str non-empty }   # missing => reject "population_provenance_missing"
mode: "FIT" | "EVALUATE"
modelType: "M1" | "M2"                                   # default M1; used by FIT. EVALUATE always runs M1, M2 and both baselines.
infectiousDurationDays: int 3..21 (default 7)            # gamma = 1 / D  (per day)
reportingFraction: float 0.01..1.00 (default 0.20)       # rho
susceptibleFraction: float 0.01..0.999 (default 0.95)
uncertainty: "OFF" | "BOOTSTRAP"                         # BOOTSTRAP => 200 replicates
advanced: {
  betaBounds [0.01, 2], initialInfectiousBounds [1, min(1_000_000, N - S_initial)],
  dispersionBounds [0.05, 1000], nStarts 20, seed 42, rtol 1e-8, atol 1e-8,
  cpMinSegmentDays 21, cpStepDays 7, cpSearchStarts 5, bootstrapStarts 1, bootstrapReplicates 200
}
```
Server-side cross-field checks (reject with 422 + `field`): `S_initial = f_s·N`; require `N − S_initial ≥ 1` ("impossible population"); lower bounds < upper bounds; initialInfectiousBounds upper ≤ `N − S_initial`; M2 requires ≥ 42 days selected; EVALUATE requires a protocol that yields ≥ 13 complete blocks and ≥ 42 initial training days (see Task 7); dataset must be `READY`.
Also compute `configHash` = sha256 of canonical (sorted-key) JSON of the config; `cacheKey` = sha256(dataset.sha256 + configHash + codeVersion). `codeVersion` = env `CODE_REVISION` or `git rev-parse --short HEAD` or `"dev"`.

### Task 3 — ODE integration (`models/sir.py`)
- Equations (PRD): `dS/dt = −β(t) S I / N`, `dI/dt = β(t) S I / N − γ I`, `dR/dt = γ I`, `dC/dt = β(t) S I / N`, `C(0)=0`. Initial: `S0 = f_s·N`, `I0` (fitted), `R0 = N − S0 − I0`.
- Integrate **scaled by N** (state vector `[S/N, I/N, R/N, C/N]`) with `scipy.integrate.solve_ivp`, `method="LSODA"` (fall back to `"RK45"` if LSODA fails), `rtol`/`atol` from config (default 1e-8), `t_eval` at integer day boundaries `0..T`.
- β(t) is **piecewise constant** (M1: one value; M2: `β1` before change day `c`, `β2` from `c` on). Integrate segment by segment so the discontinuity is exactly at a day boundary.
- Return arrays `S, I, R, C` (persons, length T+1). **Expected reported cases for day d (d = 0..T−1):** `mu_d = ρ · (C[d+1] − C[d])`. Never fit `I(t)`.
- Also return β(t_d) and `R_eff(t_d) = β(t_d) S(t_d) / (γ N)` for d = 0..T−1.
- `simulate_forward(state, beta_path, days, ...)` continues from an arbitrary state (used for forecasts and scenarios).

### Task 4 — Likelihood (`models/likelihood.py`)
Negative binomial with mean `mu` and variance `mu + mu²/k`: `logpmf(y) = gammaln(y+k) − gammaln(k) − gammaln(y+1) + k·log(k/(k+mu)) + y·log(mu/(k+mu))` with `mu` clipped at `1e-9`. `nll(params)` sums over days; returns a large finite penalty (e.g. 1e12) if the integrator fails or output is non-finite. Test against `scipy.stats.nbinom.logpmf(y, n=k, p=k/(k+mu))`.

### Task 5 — Fitting (`models/fit.py`)
- Free parameters: M1 → `(β, I0, k)`; M2 → `(β1, β2, I0, k)` + change point. **Fixed per run:** `γ`, `ρ`, `f_s`.
- Optimise in log-space with `scipy.optimize.minimize(method="L-BFGS-B")` using the bounds from config. Multi-start: `nStarts` starts from a seeded `scipy.stats.qmc.LatinHypercube` over log-bounds (RNG derived from `np.random.SeedSequence([seed, task_id])` — deterministic). Pick the best finite NLL.
- Record: `convergence = { nStarts, nConverged, bestNll, nllSpread (max−min of converged), messages[] }` and `boundaryHits = [{param, bound: "lower"|"upper", value}]` (a parameter is a boundary hit when within 0.1 % of the range (in log-space) of a bound).
- **M2 change point:** candidate change days every `cpStepDays` (7) such that ≥ `cpMinSegmentDays` (21) days lie on each side; candidates use **training data only**. For each candidate, fit with `cpSearchStarts` starts, then re-fit the best candidate with full `nStarts`. Store `changePoint = { date, dayIndex, candidates: [{date, nll}] }`. The date represents a **model change, not a verified policy event** (this wording must be in the stored metadata `note`).
- Failure handling: if no finite solution → raise `OptimizationFailed(reason)` carrying a user-actionable message.
- **Performance budget:** measure and log the time of a default full evaluation on the dev machine in `docs/DECISIONS.md`. If it exceeds ~10 minutes on 2 CPU cores, apply these allowed optimisations *in this order* and document each: (1) LSODA + vectorised likelihood, (2) `ProcessPoolExecutor` across origin×model tasks (set `OMP_NUM_THREADS=1`), (3) warm-start later origins from the previous origin's best parameters while still using `nStarts` total starts (warm start + `nStarts−1` random). Record `n_starts_effective` and `warm_start: true` in `convergence` so Methods can state it. Never reduce below the PRD defaults silently.

### Task 6 — Baselines and forecasting
- `forecast_from_fit(fit, train_len, horizon=7)`: simulate forward 7 days from the fitted end state using the final β (M2: β2) → expected reported cases for days `train_len .. train_len+6`.
- **Baseline 1 (7-day mean):** mean of the last 7 analysis cases up to the origin, repeated for all 7 forecast days. **Baseline 2 (same weekday):** forecast for origin+h (h = 1..7) = analysis value at origin+h−7 (the preceding week's daily pattern). Both use the *normalized training prefix*.

**CHECKPOINT A:** unit tests for Tasks 3–6 pass (see Task 11 list), commit.

---

## CHECKPOINT B — Evaluation protocol, selection rules, uncertainty, diagnostics

### Task 7 — Protocol (`evaluation/protocol.py`)
- **Default:** origins = 2020-08-31 and every 7 days through 2020-11-23 → exactly **13** origins. Origin = last training day. Train on the expanding prefix starting at the selected range start (1 July); forecast the next 7 days; last origin's targets end 2020-11-30. **Blocks 1–9 = development, blocks 10–13 = final.**
- Generalisation: `initial_training_days = (first_origin − start) + 1` (62 by default). For a non-default range, derive origins as `start + initial_training_days − 1` stepping 7 days while `origin + 7 ≤ end`; the protocol is **"custom (new version)"** and is only allowed with ≥ 13 blocks and ≥ 42 initial training days; development = all blocks except the last 4, final = last 4. Store `protocolVersion` ("v1-default" | "custom") in results.
- **Per-origin independence:** for each origin load raw observations ≤ origin, run `normalize()` on that prefix only (so later corrections cannot leak backwards), fit, forecast. **Actuals** for target days are the full-range normalized analysis values (identical for all models: "score every model on the same targets"). If a prefix has blocking issues or a required forecast fails, mark that origin/model `failed` with a reason and flag the comparison **incomplete** — never silently drop it and never write a zero score.
- Document in code: validation is *retrospective on a revised archive*.

### Task 8 — Metrics and selection (`evaluation/metrics.py`)
Per block and model: MAE, RMSE, signed seven-day total error (`sum(forecast) − sum(actual)`).
Per model aggregates: **development MAE** (mean absolute error over all development target points), **final MAE**, **final RMSE** (pooled final points), **mean absolute seven-day total error** (final blocks), **blocks won** (blocks where the model has the lowest block MAE among available models; ties count for each) reported as `won/13` plus a dev/final split.
Frozen selection rules (pure functions, heavily unit-tested; implement exactly):
1. **SIR model:** choose **M2** only if `(MAE_dev(M1) − MAE_dev(M2)) / MAE_dev(M1) ≥ 0.10` **and** M2 has lower block MAE than M1 in **≥ 6 of the 9 development blocks**; otherwise **M1**. (If M2 failed/unavailable → M1 with reason. For custom protocols with `n_dev` blocks use `ceil(2/3 · n_dev)`; record in `docs/DECISIONS.md`.)
2. **Baseline:** the one of B1/B2 with lower **development** MAE.
3. **Final verdict:** `improvement = (MAE_final(baseline) − MAE_final(selectedSIR)) / MAE_final(baseline)` (may be negative). "**Improvement supported (project rule)**" only if `improvement ≥ 0.10` **and** selected SIR has lower block MAE than the selected baseline in **≥ 3 of the 4 final blocks**; otherwise the stored verdict text is "**Improvement not demonstrated**". These are project rules, not significance tests (store that note).
If MAE_final(baseline) is 0 → improvement is `null` with reason "undefined".

### Task 9 — Uncertainty (`uncertainty/bootstrap.py`)
- Parametric bootstrap: for each replicate `b` in 1..200 simulate a training dataset `y*_d ~ NB(mu_hat_d, k_hat)` (seeded), re-fit with the same model structure using **warm start from the fitted parameters with `bootstrapStarts` (default 1) start** (M2: change date held at the selected value — document), store success/failure of every refit (`failed` refits are kept in the payload with reason).
- Outputs: per-replicate `{ok, beta (or beta1,beta2), i0, k, finalState {S,I,R,C}, finalBeta}` for successful refits; `requested`, `succeeded`, `failed`; **`reliable = succeeded ≥ 180`**. If < 180 succeed, intervals are still returned but flagged `reliable: false` with message "Only X of 200 refits succeeded — interpret intervals with caution".
- **Fitted-period interval:** 2.5/97.5 percentiles over replicates of expected incidence `mu_d` (label: "95% bootstrap interval for expected cases — parameter uncertainty").
- **Forecast predictive interval:** for each successful replicate simulate expected cases for the 7 forecast days, then draw **10 NB observations** per replicate/day (seeded) and take 2.5/97.5 percentiles → includes observation noise (label "95% predictive interval").
- When uncertainty is OFF: `lower/upper = null` and `intervalUnavailableReason = "Uncertainty estimation was off"`; when too few refits: reason `"Bootstrap unreliable (X of 200 refits)"`. Intervals are never zero-width placeholders. Evaluation with uncertainty ON computes the predictive interval **for the SIR models at every origin** (bootstrap per origin, with warm start; report progress counts).

### Task 10 — Diagnostics (`diagnostics.py`)
For the **final full-period fit** compute: residuals `observed − expected`; Pearson residuals `(y − mu)/sqrt(mu + mu²/k)`; autocorrelation of Pearson residuals for lags 1..14 with ±1.96/√n limits; convergence warnings (e.g. `nConverged < nStarts/2`, boundary hits, optimizer messages, bootstrap unreliable); **parameter profiles**: for β (M2: β1 and β2), I0 and k — 15 grid points (log-spaced, within bounds, centred on the MLE ×[0.5, 2] clipped to bounds), fix the parameter, re-optimise the others from the MLE (1 start), record `[{value, nll}]`. `diagnosticStatus`: `"ok"` / `"warnings"` / `"problems"` with the reasons listed.

**CHECKPOINT B:** unit tests pass, commit.

---

## CHECKPOINT C — Runner, worker, persistence

### Task 11 — Required pytest suite (write alongside; all must pass)
- **Equations:** S+I+R = N within 1e-6·N at all days; S, I, R ≥ 0; `β = 0` → mu = 0 for all days and I decays exponentially; `mu_d` equals `ρ·(C[d+1]−C[d])`; `C` is monotone non-decreasing; piecewise β continuity at the change day; scaling invariance (results in persons independent of internal scaling).
- **Likelihood:** equals `scipy.stats.nbinom.logpmf`; finite at `y=0`; penalty on integrator failure.
- **Fitting:** *parameter recovery* on a synthetic series generated with known (β, I0, k) and high reporting noise-free-ish setting: recovered β within 10 %, deterministic across two runs with the same seed, different with another seed only in the start points not the optimum (within tolerance); bounded (no result outside bounds); boundary-hit detection works (force bounds to exclude the truth).
- **Change point:** candidates every 7 days with ≥ 21 days each side; uses training data only (changing data *after* the training end does not change the choice); M2 on a synthetic two-regime series finds the change within ±7 days.
- **Baselines:** B1 and B2 hand-computed on a 21-day toy series.
- **Protocol:** default protocol yields exactly 13 origins, dates match PRD, 9 dev + 4 final; every model scored on identical target dates; **changing future records (after an origin) leaves that origin's forecasts unchanged**; normalization is per-prefix (a later negative correction does not alter an earlier origin's training data).
- **Selection rules:** truth-table tests for M1/M2 choice (exactly 10 % boundary, 5 vs 6 block wins), baseline choice, final verdict (exactly 10 %, 2 vs 3 final blocks, negative improvement, zero baseline MAE).
- **Bootstrap:** reproducible with seed; failed refits recorded; `reliable` flips at 179/180; predictive interval ≥ fit interval width on average; intervals `None` + reason when OFF.
- **Cancellation:** setting `cancel_requested` mid-run results in status CANCELLED within one task; **failure path:** forcing an optimisation failure produces FAILED with an `ERR-xxxxxxxx` reference and an actionable message (no stack trace to the user).
Mark slow tests with `@pytest.mark.slow` and keep the default suite under ~60 s.

### Task 12 — Runner (`runner.py`) and handler
- Stages & statuses (Run.status/stage): `QUEUED → VALIDATING → (EVALUATING →) FITTING → (ESTIMATING_UNCERTAINTY →) EXPORTING → COMPLETED` or `FAILED` / `CANCELLED`. FIT: validating → fitting → estimating uncertainty (if on) → exporting. EVALUATE: validating → evaluating → fitting (final full-period fit of the **selected SIR model**, needed for the fit charts and scenarios) → estimating uncertainty (if on) → exporting.
- **Validating:** re-validate config with Pydantic, dataset belongs to the run's owner, dataset is READY, population provenance present (else FAIL with code `population_provenance_missing`), range inside coverage.
- **Progress:** `progressDone/progressTotal` = counts of completed tasks (origin×model fits; bootstrap refits; final fit steps). Only set `progressTotal` when it is known. Update the DB at most once per second. Update `heartbeat_at` on the Job while working.
- **Parallelism:** `ProcessPoolExecutor(max_workers=WORKER_PROCESSES or max(1, cpu_count()-1))`; tasks are top-level pure functions taking plain dicts/arrays and returning plain dicts; **only the main process writes to the DB**. `OMP_NUM_THREADS=1` etc. set at worker start.
- **Cancellation (cooperative):** before submitting and after each completed task read `runs.cancel_requested`; if true stop submitting, `shutdown(cancel_futures=True)`, set CANCELLED. Never leave partial results marked as complete.
- **Failure:** catch everything at the top level → `status=FAILED`, `error_reference = "ERR-" + 8 random hex`, `error_message` = actionable text from a mapping (OptimizationFailed → "The optimiser could not find a valid fit. Try widening the β bounds, lowering the infectious duration, or changing the seed."; DataBlocked → ...; population → ...; default → "Unexpected error. Quote reference ERR-xxxx to support."). Log full traceback server-side **without** secrets/paths in the stored message.
- **Persistence** (single transaction at the end): insert `fit_results` row and `forecast_rows` (bulk), set `runs.has_fit`, `runs.evaluated`, `completed_at`, status COMPLETED. **Result payload contract** (store in `fit_results.payload`; define the TS type + zod in `packages/shared/src/schemas/results.ts` — Phase 4 consumes it):
  ```
  payload = {
    schemaVersion: 1,
    run: { id, mode, modelType, selectedSirModel: "M1"|"M2", completedAt, codeVersion, seed, protocolVersion|null },
    assumptions: { infectiousDurationDays, gamma, reportingFraction, susceptibleFraction, population:{value,sourceUrl,referenceYear,geography},
                   sInitial, rInitial, note: "Reporting fraction and susceptibility are assumptions, not estimates." },
    parameters: { beta?, beta1?, beta2?, i0, dispersion, gamma, reportingFraction, susceptibleFraction },
    changePoint: { date, dayIndex, candidates:[{date,nll}], note }|null,
    series: [ { date, observed, expected, lower|null, upper|null, S, I, R, C, beta, rEff } ... ]   // fitted period, one per day
    finalState: { date, S, I, R, C, beta },        // at the last fitted day boundary (used by scenarios)
    diagnostics: { residuals:[{date,raw,pearson}], acf:[{lag,value}], acfLimit, profiles:{ beta:[{value,nll}], ... }, warnings:[...], status },
    convergence, boundaryHits,
    bootstrap: null | { requested, succeeded, failed, reliable, message, draws:[{beta,beta1,beta2,i0,k,finalState,finalBeta}], failures:[{replicate,reason}] },
    evaluation: null | { origins:[...], blocks:[{index,origin,split,targetStart,targetEnd,mae:{M1,M2,B1,B2},rmse:{...},totalError:{...}}],
                         comparison:[{model,label,developmentMae,finalMae,finalRmse,meanAbsTotalError,blocksWon,blocksWonDev,blocksWonFinal,status,reason|null}],
                         selection:{ selectedSir, selectedSirReason, selectedBaseline, improvement|null, improvementReason|null, verdict, verdictText, rulesNote },
                         incomplete: bool, incompleteReasons:[...], retrospectiveNote }
  }
  ```
  Numbers stored as plain JSON numbers (no NaN/Infinity — use `null` + reason).
- Register `RUN` in the job registry. Keep a unit-level test with a stubbed DB layer.

**CHECKPOINT C:** `pytest -q` green, one real end-to-end run on the synthetic demo dataset from the CLI (`python -m app.cli run --dataset ... --mode FIT`) stores a `fit_results` row. Commit.

---

## CHECKPOINT D — Web: run API and Model setup screen

### Task 13 — Run API (Next.js route handlers, `apiHandler` + `requireUser`)
- `POST /api/runs` — header `Idempotency-Key` required (UUID). Steps: zod-validate `RunConfig` (same schema as client) → load dataset with ownership → require READY + population provenance → **limit 2 active jobs per user** (`QUEUED|VALIDATING|FITTING|EVALUATING|ESTIMATING_UNCERTAINTY|EXPORTING`) else `429 job_limit` → compute `configHash`/`cacheKey` → if an existing run with the same `(ownerId, idempotencyKey)` exists, **return it** (identical retries return the same job) → if a COMPLETED run with the same `cacheKey` exists, return it with `{ cached: true }` (UI says "Identical analysis already completed — opened the saved result") → else create `Run` (status QUEUED, display name "Fit · M1 · 1 Jul–30 Nov" style auto-name) + `Job(type=RUN)` in one transaction → `wakeWorker()` → respond **202** `{ runId }`.
- `GET /api/runs/[id]` → status, stage, progress, elapsed, error fields, links. If the run has been `QUEUED` > 10 s, call `wakeWorker()` again (cold-start safety). Ownership 403/404.
- `POST /api/runs/[id]/cancel` → sets `cancelRequested=true` only for active runs (409 otherwise).
- `PATCH /api/runs/[id]` (rename; zod 1–80 chars, trimmed) · `GET /api/runs` (list, filters later) · `DELETE /api/runs/[id]` (409 if active; cascades).
- `GET /api/runs/[id]/results` → **only for COMPLETED** (409 `run_not_completed` otherwise) returns the payload + run metadata + forecast rows.
- Return the standard error envelope; 422 for invalid input with `field`.

### Task 14 — Model setup page `/model`
Layout: **narrow left panel (controls) + main panel**, stacked <768px.
**Left panel — Standard controls** (react-hook-form + zod, same schema, live inline errors, every field has label + unit + `FieldHelp` tooltip):
- **Model:** segmented "Constant transmission SIR" (default) | "One change point SIR". Tooltip explains M2 and that the change date is a model feature, not a verified policy event.
- **Infectious duration** (slider + number input, 3–21, step 1) with live read-out "γ = 1/D = 0.1429 per day".
- **Reporting fraction** (0.01–1.00, step 0.01, default 0.20) with helper: "An assumption about what share of infections is detected — not estimated from data."
- **Initially susceptible fraction** (0.01–0.999, default 0.95). Live read-out: "S_initial = … persons"; after a fit, the results will show the inferred initial removed population.
- **Uncertainty:** segmented Off | 200 bootstrap replicates (note: slower).
- **Advanced controls** (collapsed `Accordion`): beta bounds, initial infectious bounds (shows the live maximum `min(1,000,000, N−S_initial)`), dispersion bounds, optimizer starts, seed, solver tolerances. Client+server reject impossible populations and non-finite inputs.
- Dataset + date range come from the workspace store (shown as read-only summary with link to `/data`); show an error banner if the dataset is not READY or population provenance is missing ("Empirical fitting is blocked until population provenance is provided" + link).
- **Two explicit buttons:** `Fit selected period` (primary; helper text "Descriptive — does not produce a forecast-performance claim") and `Evaluate seven-day forecasts` (secondary; helper text "Runs the fixed chronological protocol: 13 origins, both SIR variants and two baselines"). When Evaluate is chosen the model segmented control shows a note that both SIR variants are evaluated.
- Double-submit prevention: both buttons disabled while submitting or while an active run exists for this user's identical config; an `Idempotency-Key` is generated once per distinct config and reused on retries.
**Main panel:**
- **Settings summary card** (compact, before submission): dataset, range, N, model, γ, ρ, f_s, uncertainty, mode, seed.
- **Run status card** (`RunProgress` component): ordered stage stepper with current stage highlighted (icon + text), elapsed time ticking client-side, determinate progress bar **only** when `progressTotal` is known (otherwise indeterminate "working" label), `Cancel run` (ConfirmDialog), `aria-live="polite"` announcements. On completion: success panel with run id (mono), display name editable inline (PATCH), buttons `View results` and `Run another`. On failure: red panel with the actionable message, **technical error reference** + copy button, and `Edit settings` — and the previous successful run stays accessible but is clearly labelled as a *different run*, never as output of the failed request. On cancel: neutral panel.
- Polling via TanStack Query: ~2 s while active (`refetchInterval` returns false when terminal); survives page refresh because the active run id is stored in the workspace store **and** recovered from `GET /api/runs?active=true`.
- A global `ActiveRunWatcher` in the `(app)` layout keeps polling while the user navigates and updates the StatusBar pill; toast on completion/failure with a link.
- **Stale handling:** the workspace store keeps `lastSubmittedConfigHash`; if the form's current config hash differs from the displayed run's hash, show `StaleBanner` ("Settings changed — rerun required") on this page; changing inputs never modifies an active run.
- Recent runs list (last 5) with status pill, name, time, open buttons.

### Task 15 — Web tests
Vitest: zod `RunConfig` accepts/rejects the boundary values (D=2,3,21,22; ρ=0.009,0.01,1,1.01; f_s=0.009,0.01,0.999,1.0; seed non-integer; impossible population; NaN); canonical config hashing is order-independent; idempotency helper. Route-handler tests (mock Prisma) for 202/422/429/403/409 paths. Playwright: demo → Data → load demo → Model → Fit → watch stages → completed → rename run; cancel flow; refresh mid-run reconnects.

**CHECKPOINT D:** everything green, commit, update PROGRESS.md.

---

## ACCEPTANCE CHECKLIST (PASS/FAIL + evidence)

1. All pytest tests in Task 11 pass; default suite < ~60 s; `pnpm test` passes.
2. A FIT run on the synthetic demo dataset completes; `fit_results.payload` validates against the shared zod schema (add a test that loads a stored payload and parses it).
3. An EVALUATE run on the demo dataset completes with exactly 13 origins × 4 models of forecast rows (or documented failures with reasons), correct dev/final split, selection result stored. Report the measured wall-clock times for FIT and EVALUATE (with and without bootstrap) and the optimisations applied.
4. Changing a future record does not change an earlier origin's forecast (test passes).
5. Zero-beta, conservation and non-negativity tests pass.
6. Intervals are `null` + reason when uncertainty is OFF; `reliable` flag logic proven at 179/180.
7. Cancelling a running evaluation stops it quickly and ends in CANCELLED; the UI shows a neutral cancelled state.
8. A forced failure shows an actionable message and an `ERR-` reference; previous successful runs remain openable and are not shown as output of the failed request.
9. A third active run is rejected with 429 `job_limit`; double-clicking Run creates exactly one run; a retry with the same Idempotency-Key returns the same run; an identical completed config returns `cached: true`.
10. Killing the compute process mid-run: after restart the reaper requeues or fails the run — no permanent spinner (describe how you tested).
11. Editing any input after a run shows "Settings changed — rerun required" and never edits the active run.
12. Impossible inputs (D=2, ρ=0, f_s=1, N too small, NaN) are rejected on the client AND by the API (422 with `field`) AND by the worker validation.
13. Missing population provenance blocks fitting with the specified message.
14. Another user cannot read/cancel/rename/delete my run (403).
15. No secrets/paths in any stored error message.

Finish with the PHASE 3 REPORT (AGENTS.md §11).

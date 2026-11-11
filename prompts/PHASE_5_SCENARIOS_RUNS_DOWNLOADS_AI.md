# PHASE 5 — Scenario explorer, Saved runs & compare, Download centre, Sensitivity, OpenRouter AI explainer

**Prerequisite:** Phases 1–4 complete. Read `AGENTS.md`, then in `docs/PRD.md`: "4 Scenario explorer and saved runs" (all), "7 Reliability" → "Uncertainty and sensitivity" and "Security and data storage", "Persistent interface rules", "Export" in data contracts and the API contract.
**Goal:** every remaining PRD feature works end-to-end: hypothetical scenarios with paired bootstrap draws, a saved-runs library with compare, a download centre with a reproducibility ZIP, the 27-combination sensitivity analysis, and an optional AI explainer that can only restate stored numbers.

---

## CHECKPOINT A — Scenario engine and Scenario explorer

### Task 1 — Scenario computation (Python `app/scenarios/engine.py`, pure + tested)
Inputs: parent run payload (`finalState {S,I,R,C,beta}`, `assumptions` incl. γ, ρ, N), `percentChange` (integer −50..50 step 5), `horizonDays` (7..60), optional bootstrap draws.
- **Start date = the day immediately after the fitted period's last date** (store `startDate`).
- Two simulations from the **same fitted S, I, R**: baseline β = final fitted β (M2: β₂); scenario β = `β × (1 + percentChange/100)`. N, γ, ρ and starting state are **identical** and not editable here. Use the Phase 3 integrator (same tolerances).
- Outputs per day: date, baseline & scenario **expected reported cases** (`ρ·ΔC`) and **model infections** (`ΔC`); cumulative of both; summary: cumulative expected reported cases and cumulative model infections for baseline/scenario, absolute difference, **percentage difference** (`null` + reason "Undefined: baseline total is zero" when the baseline total is 0).
- **Paired bootstrap:** if the parent has bootstrap draws, for each successful draw `b` simulate baseline and scenario from *that draw's* final state/β (`β_b`, same percent change) — **identical paired draws through both scenarios**. Report 2.5/97.5 percentiles per day and for cumulative totals and the paired percentage difference. Label: "Interval is conditional on model assumptions and reflects parameter uncertainty only."
- Deterministic **summary sentence template** in `packages/shared/src/scenarioText.ts` (pure function, unit-tested, no AI): e.g. "Hypothetical simulation under the fitted model: from {start} for {H} days, changing transmission by {±x}% (β {b0} → {b1} per day) gives {A} expected reported cases versus {B} at the baseline ({diff}, {pct}%); cumulative model infections {C} versus {D} ({pct2}%)." Handle undefined percentages and zero differences. **Never** use the words "lives saved", "proven", "policy impact", "cases prevented".
- Pytest: β-scenario of 0% change equals baseline exactly; −50% reduces cumulative infections monotonically vs baseline for a growing epidemic fixture; identical start state (assert arrays); percent undefined when baseline 0; paired draws used (same index in both); horizon bounds enforced; M2 uses β₂; changing historical parameters is impossible through the API (no such fields).
- Register `SCENARIO` job handler: statuses `QUEUED→RUNNING→COMPLETED/FAILED/CANCELLED`, writes `scenarios.daily_outputs`, `summary`, `error_reference` on failure; heartbeat as in Phase 3.

### Task 2 — Scenario API (web)
- `POST /api/scenarios` — zod `{ parentRunId, percentChange (int, −50..50, multiple of 5), horizonDays (int 7..60) }`; ownership of parent; **409** if parent not COMPLETED or has no fit; ≤ 2 active jobs per user (429); creates `Scenario` (stores `config` + `parent_run_id`) + `Job(SCENARIO)`; wakes worker; 202 `{scenarioId}`. Idempotency-Key supported like runs.
- `GET /api/scenarios/[id]` (status or output; ownership) · `GET /api/scenarios?parentRunId=` · `DELETE /api/scenarios/[id]`.
- Shared zod schemas in `packages/shared/src/schemas/scenario.ts`.

### Task 3 — `/scenarios` page
Layout: **narrow left controls + main panel**, stacked <768px.
- **Left panel:** run selector (only COMPLETED runs with a fit; shows name, model, dates, "Demo data" badge; disabled option explanations), read-only **"Fitted model (locked)"** summary (β, γ, ρ, N, starting S/I/R at the start date — all disabled/read-only with lock icon + tooltip "Historical parameters cannot be changed here"), **Transmission change** slider −50…+50 % step 5 (default −20) with numeric display and ± quick buttons, **Horizon** 7–60 days (default 28), **exact start date** displayed ("Scenario starts on 01 Dec 2020"), `Run scenario` button (explicit, double-submit safe). If no completed fit → EmptyState "Complete a fit first" + CTA to `/model`.
- **Main panel:** banner at top **"Hypothetical simulation under the fitted model"** (always visible above results, with info tooltip). Then:
  1. Chart "Expected daily reported cases": baseline (solid blue) vs scenario (dashed teal), optional paired-bootstrap bands with legend "conditional on model assumptions" (or "Interval unavailable — parent run had no bootstrap"); table alternative; CSV; PNG/SVG export (Phase 4 `exportFigure`).
  2. Separate chart "Latent model infections" (toggle, collapsed by default), labelled latent.
  3. Summary cards: cumulative expected reported cases (baseline / scenario / difference / %), cumulative model infections (same). `%` shows "Undefined" when baseline total is zero.
  4. The deterministic sentence from the template.
  5. Scenario status/progress card (queued/running/completed/failed with error ref) and a list of previous scenarios for this run (reopen/delete).
- Stale rule: changing slider/horizon after a result shows `StaleBanner` "Settings changed — rerun required"; the displayed result keeps its own stored config shown in a "Configuration of displayed result" chip.
- Every scenario shows its **parent run ID** and its own scenario ID.

**CHECKPOINT A:** pytest + vitest + typecheck green, commit.

---

## CHECKPOINT B — Saved runs and compare

### Task 4 — `/runs` page ("Saved runs and downloads")
- **List/table** (TanStack Table; server-side search + pagination via `GET /api/runs?search=&page=&status=&mode=`): display name, timestamp, dataset (name + version), model, selected dates, status pill, key assumptions (D, ρ, f_s), `Demo data` badge, evaluated badge. Search by name/id (debounced 300 ms). Empty state when none; skeleton loading; error state.
- **Row actions** (dropdown + inline icon buttons with tooltips): `Reopen` (→ `/results?run=`; uses stored results, **never refits**), `Rename` (inline edit, validation 1–80 chars, optimistic UI with rollback on error), `Duplicate settings` (loads the run's config into the model draft store and navigates to `/model`; does not run anything), `Delete` (ConfirmDialog stating what will be removed: scenarios, exports, stored files; blocked with a clear message if the run is active; `DELETE /api/runs/[id]` cascades via DB relations — verify files in `stored_files` are removed too).
- **Compare up to three runs:** row checkboxes (4th selection disabled with tooltip "Compare up to 3 runs"), sticky "Compare (n)" bar. Compare view (side-by-side cards/table, responsive): config differences highlighted, parameters, final MAE/RMSE/improvement, selected models, diagnostic status. **Ranking logic in `packages/shared/src/compare.ts` (unit-tested):** show ranking by final MAE **only if** all runs are EVALUATE, the dataset id+version match, and the sets of forecast target dates are identical; otherwise show the badge **"Different evaluation conditions"** with the list of what differs and no ranking at all. Fit-only runs are comparable on parameters only.

### Task 5 — Tests
Vitest: `compare.ts` truth table (all match / different dataset version / different target dates / mix of fit and evaluate / 1 run / 4 runs rejected), rename validation. Playwright: create two runs → search → rename → duplicate settings (form prefilled, nothing started) → compare → delete with confirmation → results of deleted run 404 state.

**CHECKPOINT B:** green, commit.

---

## CHECKPOINT C — Download centre and exports

### Task 6 — Export generation (Python `app/exports/`)
Job type `EXPORT` (handler registered), each export is an `exports` row: `id, run_id, scenario_id?, type, status, file_id, checksum (sha256), manifest, error_reference, expires_at`. Files are stored in `stored_files` (kind `EXPORT`, `run_id` set so deleting the run cascades).
Types and exact contents:
1. `CLEANED_DATASET_CSV` and `CORRECTION_LOG_CSV` (from the dataset, same files as Phase 2 but bound to the run's dataset version).
2. `FITTED_STATES_CSV`: `date, observed, expected, lower, upper, S, I, R, C, beta, r_eff` (blank for unavailable — not 0).
3. `FORECASTS_CSV` (all `forecast_rows` incl. `interval_unavailable_reason`) and `METRICS_CSV` (comparison table + origin-level scores).
4. `PARAMETERS_JSON`: fitted parameters, parameter intervals, assumptions, convergence, boundary hits, change point, diagnostics, selection result.
5. `FIGURE_PNG` / `FIGURE_SVG` (server-side via **matplotlib**, `Agg` backend; 300 dpi; same series styles; caption, period and assumptions text included) for the figures: observed-fitted, forecast validation (final origin), SIR states, transmission, diagnostics residuals. (Interactive per-chart exports from the browser still exist from Phase 4; server figures exist so the ZIP is complete without a browser.)
6. `SCENARIO_CSV` (daily outputs + summary) for a scenario.
7. `BUNDLE_ZIP` — "complete reproducibility bundle": `README.txt`, `manifest.json`, `config.json` (full run config), `provenance.json` (dataset source URL, retrieval date, **source sha256**, population provenance, documentation URL), `results/*.csv|json` (all of the above), `figures/*.png|svg`, and `scenarios/*.csv` for the run's scenarios.
- **Manifest** (in the bundle and stored in `exports.manifest`): `run_id`, `dataset_id`, `dataset_version`, `source_checksum_sha256`, `code_revision`, `dependency_versions` (python, numpy, scipy, pandas, matplotlib via `importlib.metadata`), `created_at`, `files: [{path, sha256, bytes}]`. **Must not contain** session tokens, absolute/private server paths, env values, or logs. Add a test that scans the manifest and bundle for `/home`, `/mnt`, `postgres`, `SECRET`, `token`.
- All text cells pass through `neutralize()`. Exports are built from **stored completed results only**, never from unsaved UI edits. Reject export requests for non-completed runs (409).
- Idempotent: requesting the same export type for the same run reuses a READY export if its inputs (run id) are unchanged.

### Task 7 — Export & download API (web)
- `POST /api/runs/[id]/exports` `{ type, scenarioId? }` → creates export + job, 202 `{ exportId }` (ownership; 409 if run not COMPLETED; 429 job limit applies only to non-trivial exports — document).
- `GET /api/exports/[id]` → status; when READY returns `{ downloadUrl, expiresAt }` where the URL is `/api/exports/[id]/file?token=…` — an **HMAC-signed, 5-minute expiring token** (signed with `AUTH_SECRET`, bound to user id + export id).
- `GET /api/exports/[id]/file?token=` → verifies session user = export owner **and** token validity/expiry, streams the stored file with `Content-Disposition: attachment; filename="<sanitized>"`, `Cache-Control: private, no-store`; 403 otherwise. No public URLs.
- `GET /api/runs/[id]/exports` list.

### Task 8 — Download centre UI (inside `/runs`, tab "Downloads", and a `Downloads` panel on `/results`)
- Choose a run (default: active/most recent). Cards per group — **Data** (cleaned dataset, correction log), **Model output** (fitted states, forecasts, metrics, parameters JSON), **Figures** (each figure PNG/SVG), **Scenarios** (CSV per scenario), **Reproducibility bundle (ZIP)**. Each item: filename pattern, size when ready, state (`Ready` / `Preparing…` spinner / `Failed` + retry + reference), `Download` button (disabled while preparing; no double-trigger). A short "What’s inside the bundle" accordion. Text: "Exports reflect the saved run, not unsaved settings."
- Polling for preparing exports (2 s) with `aria-live` announcements.

### Task 9 — Tests
Pytest: each export's columns/values match stored payload (spot-check numbers), CSV formula neutralization, manifest has all required keys and no forbidden strings, ZIP contains the expected file list and every file's sha256 matches the manifest, figures exist at 300 dpi (read PNG pHYs), export rejected for non-completed run. Vitest/route tests: token expiry (5 min + 1 s fails), wrong user 403, tampered token 403, filename sanitization. Playwright: request ZIP → ready → download → unzip in test and verify manifest `run_id` matches the run in the URL.

**CHECKPOINT C:** green, commit.

---

## CHECKPOINT D — Sensitivity analysis

### Task 10 — Sensitivity job (`SENSITIVITY` handler, Python `app/sensitivity.py`)
PRD: "Advanced sensitivity action for infectious durations 5, 7 and 10 days, reporting fractions 0.10, 0.20 and 0.50, and susceptible fractions 0.85, 0.95 and 0.99. Show all 27 combinations and ranking reversals rather than selecting a favourable one."
- Available only for a COMPLETED **EVALUATE** run. For each of the 27 combinations (D × ρ × f_s) run the **same evaluation protocol** on the same dataset/range with that combination (everything else from the parent config; no bootstrap; to bound cost use `nStarts = 6`, `cpSearchStarts = 2`, warm start; record these reduced settings in the result and Methods — they differ from the parent run and that must be stated clearly in the UI).
- Parallelise across combinations/origins with the Phase 3 process pool; determinate progress `k/27`; cooperative cancellation; failures per combination stored with a reason (never dropped).
- Output (stored in a new table `sensitivity_results`; add Prisma migration with `runId (cascade), combos Json, summary Json, createdAt`): per combination: D, ρ, f_s, development MAE and final MAE for M1, M2, selected SIR (per frozen rules), selected baseline, improvement, final verdict, rank order of the four models by final MAE, and `rankingReversal` = (best model by final MAE differs from the parent run's best model) **or** (verdict differs from the parent). Summary: counts of verdicts, number of reversals, min/max improvement. Do **not** pick or highlight a "best" combination.
- Pytest with a tiny synthetic fixture (reduced origins via a custom protocol fixture) verifying 27 rows, correct reversal flags, failures recorded, cancellation.
- API: `POST /api/runs/[id]/sensitivity` (409 unless completed evaluate; 429 job limit), `GET /api/runs/[id]/sensitivity` (status/results), cancel via the run-style endpoint for sensitivity jobs.
### Task 11 — Sensitivity UI (on `/results` for evaluated runs: collapsed "Advanced sensitivity" section)
Explain what it does, show an **estimated-time warning**, `Run sensitivity analysis` button, progress `k/27`, then a sortable 27-row table (all rows visible, no truncation), reversal rows marked with icon + text "Ranking reversal", verdict chips, summary strip ("X of 27 combinations reverse the ranking"), CSV download, and the note that reduced optimiser settings were used.

**CHECKPOINT D:** green, commit.

---

## CHECKPOINT E — OpenRouter AI explainer (optional, strictly grounded)

### Task 12 — Server route `POST /api/ai/explain` (Next.js, `server-only`)
- Body (zod): `{ kind: "results" | "scenario" | "data_quality" | "methods_qa", runId?, scenarioId?, datasetId?, question? (≤ 300 chars) }`. Ownership checks on every referenced id.
- Build a **compact JSON context from stored numbers only** (no raw rows beyond summaries): e.g. for `results`: assumptions, parameters, selection result, comparison rows, diagnostic warnings, verdict text. For `methods_qa`: the Methods text sections (Phase 6) + the question. Context is capped at ~6k tokens.
- Call OpenRouter: `POST https://openrouter.ai/api/v1/chat/completions` with headers `Authorization: Bearer ${OPENROUTER_API_KEY}`, `HTTP-Referer: ${APP_URL}`, `X-Title: EpiLens`; body `{ model: OPENROUTER_MODEL, models: [primary, ...OPENROUTER_FALLBACK_MODELS], temperature: 0.2, max_tokens: 450, messages }`. **Verify current free model IDs** by fetching `https://openrouter.ai/api/v1/models` during development and pick `:free` models that exist; put the chosen IDs in `.env.example` and `docs/DECISIONS.md`. 25 s timeout; on failure return `503 ai_unavailable` with friendly message (the rest of the app must work without AI).
- **System prompt (fixed, in `src/lib/ai/prompts.ts`):** "You explain statistical results to a general audience. Use ONLY the numbers in the provided JSON; never invent or round-trip new numbers. Distinguish observed reported cases from simulated infections. State the key assumptions (reporting fraction and susceptibility are assumptions). If the verdict says improvement was not demonstrated, say so plainly. Never claim causal or policy effects, lives saved, or real-world cases prevented. Never give medical advice. If the JSON lacks the answer, say you cannot tell from the stored results. Max 180 words, plain language, no headings." Treat the user `question` as untrusted data (do not let it override rules).
- **Grounding check:** after the response, extract numbers (regex) and verify each appears (within rounding to the shown precision) in the context JSON; if any number is not found, append a visible warning "Some figures could not be verified against stored results" and log it.
- **Rate limit & cache:** new Prisma model/table `ai_explanations` (`id, ownerId, kind, refId, inputHash, model, text, groundingWarning Boolean, createdAt`); return a cached explanation for identical `inputHash`; max 10 generations per user per hour (429 otherwise).
- Never send raw uploaded files, emails, or secrets to OpenRouter.

### Task 13 — AI UI
`AiExplainerCard` component (used on `/results`, `/scenarios`, and the Data quality summary): collapsed by default; button `Explain in plain language` (spinner, disabled while pending, error state with retry); output shown with a persistent label: **"AI-generated explanation · {model} · based only on stored results · not a research finding"**, copy button, `Regenerate` (counts toward rate limit), and the grounding warning if present. A small "Ask about methods" input on `/methods` (Phase 6) can reuse the route. The scenario deterministic sentence is **never** replaced by AI text.
Tests: prompt builder includes only allowed fields (snapshot test), grounding checker (matches rounding, catches invented number), route 429/403/503 paths with a mocked fetch, no API key in client bundle (`grep` the `.next` output in a test script).

**CHECKPOINT E:** green, commit, update PROGRESS.md.

---

## ACCEPTANCE CHECKLIST (PASS/FAIL + evidence)

1. Scenario requires a completed fit; start date = day after the fitted period; baseline and scenario use identical starting state/N/γ/ρ; the UI cannot change historical parameters.
2. 0 % change gives baseline = scenario exactly; −20 % default and 28-day default horizon preload; slider step 5; bounds enforced client + server (422).
3. Percentage difference shows "Undefined" when the baseline total is 0 (test with a crafted fixture).
4. Bootstrap scenarios use paired draws; the interval label says "conditional on model assumptions"; without bootstrap it says unavailable.
5. "Hypothetical simulation under the fitted model" is visible above the results; no forbidden phrases appear anywhere (add a test scanning `scenarioText` outputs and UI strings).
6. Every scenario stores `parent_run_id` and its own config.
7. Saved runs: search, reopen without refit (assert no job created), rename, duplicate settings (no run started), delete with confirmation cascades scenarios, exports and stored files (verify DB counts before/after).
8. Compare allows ≤ 3 runs; ranking only under identical dataset version and target dates; otherwise "Different evaluation conditions".
9. Every export type downloads and matches stored values; manifest contains run id, source checksum, code revision, dependency versions and no secrets/paths; ZIP checksums verify; formula-looking text cells neutralized.
10. Download URL expires after 5 minutes and cannot be used by another user; tampered token rejected.
11. Sensitivity shows all 27 combinations, flags reversals, never highlights a favourable one; failures show reasons; cancellation works; reduced optimiser settings are disclosed.
12. AI explainer works with a real OpenRouter key and degrades gracefully without one (button shows friendly unavailable message); output is labelled AI-generated; grounding warning triggers on an injected fake number in a unit test; rate limit works; key never reaches the browser.
13. Two users: no cross-access to runs, scenarios, exports, AI explanations, sensitivity results.
14. Full browser workflow passes in Playwright: load data → configure fit → evaluate → inspect charts → scenario → reopen saved run → download matching files.

Finish with the PHASE 5 REPORT (AGENTS.md §11).

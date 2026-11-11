# PHASE 4 — Results screen: summary, parameters, five chart tabs, model comparison, figure export, Overview wiring

**Prerequisite:** Phases 1–3 complete (runs produce stored payloads). Read `AGENTS.md`, then in `docs/PRD.md`: "3 Results screen and chart behaviour" (all), "Persistent interface rules", "Shared chart requirements", and the payload contract in Phase 3 Task 12 (`packages/shared/src/schemas/results.ts`).
**Goal:** a premium, accurate Results page where every number and every chart comes from ONE stored run ID, every chart has a table alternative and exports, and nothing is shown before a run exists.

---

## CHECKPOINT A — Data access and shared helpers

### Task 1 — Results hooks and page shell
- `useRunResults(runId)` (TanStack Query → `GET /api/runs/[id]/results`; only enabled for completed runs; stores nothing client-side beyond the query cache). `useRuns()` list.
- Route `/results?run=<id>`: run is chosen from the URL; default = latest COMPLETED run of the user; the choice is mirrored into the workspace store (`activeRunId`). A **run switcher** (select with name, time, mode, model, "Demo data" badge) sits in the PageHeader actions.
- **Run identity bar (always visible on this page):** run display name, run ID (mono + copy), dataset name + version, date range, model, mode (Fit / Evaluate), completion time, code version, seed. Everything on the page is rendered from the payload of this single run; assert in code (a dev-mode check) that no child component receives data from a different run id.
- States: no runs at all → EmptyState ("Run a fit or evaluation first" + CTA to `/model`); run active → progress card with link back to `/model`; failed/cancelled → clear state with the stored message + reference (never show old results as this run's output); stale → `StaleBanner` when the current model-setup draft's config hash differs from the displayed run's `configHash` (display only — never relabel).
- **Assumptions panel** (collapsible, open by default): infectious duration, γ = 1/D per day, reporting fraction (labelled "assumed"), initially susceptible fraction (labelled "assumed"), population with provenance link/year/geography, S_initial, inferred initial removed population `R_initial`, observation model (negative binomial), integrator tolerances.

### Task 2 — Chart helpers (`src/components/charts/`)
Extend the Phase 2 foundation:
- `seriesStyles.ts` — exports `observedStyle`, `m1Style`, `m2Style`, `baselineMeanStyle`, `baselineWeekdayStyle`, `intervalStyle(colorKey)` (translucent fill) strictly per AGENTS.md §6 (colour + dash + marker; every series has a legend name).
- `figureExport.ts` — `exportFigure(graphDiv, { format: "png"|"svg", filename, caption, period, assumptions })`:
  1. temporarily add a bottom caption annotation block (title, caption, "Period: …", one-line assumptions) and enlarge bottom margin via `Plotly.relayout`;
  2. `Plotly.toImage(gd, { format, width: 1200, height: 675, scale: 2.5 })` → **3000×1688 px = 300 dpi at 10 in × 5.6 in** for PNG; SVG uses `format: "svg"`;
  3. for PNG inject a `pHYs` chunk (11811 pixels/metre) so the file really reports 300 dpi (write `setPngDpi(bytes, 300)` with a unit test using a tiny PNG fixture);
  4. restore the original layout, trigger download via an `<a download>` with a sanitized filename (`epilens_<run8>_<chart>_<period>.png`).
- `ChartCard` toolbar additions: `Export PNG`, `Export SVG`, `Download data (CSV)`, `View as table`. All keyboard accessible with tooltips; while exporting show a spinner and disable.
- `useChartZoom(gd)` helper for zoom in/out/reset/pan (already exists from Phase 2 — reuse, do not duplicate).

**CHECKPOINT A:** typecheck/lint/tests green, commit.

---

## CHECKPOINT B — Summary, parameters, comparison

### Task 3 — Summary cards (PRD "Summary and parameter display")
- **Evaluated runs:** four StatCards — *Forecast MAE* (final MAE of the selected SIR model), *Forecast RMSE* (final RMSE), *Improvement over selected baseline* (`+x.x%` or `−x.x%` with up/down arrow icon **and** text; "Undefined (baseline error is zero)" when null), *Diagnostic status* (ok / warnings / problems with icon + text + a "View diagnostics" link to the tab). Under the cards show the **verdict** text from `selection.verdictText` ("Improvement supported (project rule)" or "Improvement not demonstrated") and the note "These are project rules, not significance tests." plus the retrospective note ("Retrospective validation on a revised archive.").
- **Fit-only runs:** a single neutral card **"Forecast performance not evaluated"** (explains that Fit is descriptive; button `Evaluate seven-day forecasts` links to `/model` with the same settings prefilled via the draft store).
- Incomplete evaluation (`evaluation.incomplete`) → amber banner listing `incompleteReasons`.

### Task 4 — Parameter table
Rows: β (or β₁ and β₂ plus **change date** for M2, with the note "Represents a model change, not a verified policy event"), γ (= 1/D, fixed), I_initial, dispersion k, reporting fraction ρ (assumed), initially susceptible fraction (assumed), S_initial, R_initial (inferred). Each row: symbol, plain-language name, value with units, "fixed / fitted / assumed" badge (icon + text), short tooltip. Bootstrap intervals shown in an extra column when available (labelled "95% bootstrap interval — conditional on model assumptions"), otherwise "unavailable (uncertainty off)". Convergence line: "n of N starts converged · boundary hits: none/list".

### Task 5 — Model comparison table (evaluated runs only)
Rows exactly: **Constant SIR, Change-point SIR, Seven-day mean baseline, Same-weekday baseline**. Columns: Development MAE · Final MAE · Final RMSE · Seven-day total error (mean absolute, final blocks) · Blocks won (`x/13`, tooltip with dev/final split) · Run status. A failed/unavailable model shows an em-dash in numeric cells and an explicit reason chip (e.g. "Failed: optimiser did not converge at 3 origins") — **never a fabricated 0**. Highlight the selected SIR model and selected baseline with a badge (icon + text), not colour only. Below: expandable "Origin-level scores" table (13 rows: block, origin, split, targets range, MAE/RMSE/total error per model) with CSV download. Sorting by column via TanStack Table; keyboard accessible.

**CHECKPOINT B:** tests + commit.

---

## CHECKPOINT C — The five chart tabs (Plotly, from stored payload only)

Use `Tabs` (keyboard arrow navigation). Each tab = `ChartCard` with toolbar, caption (one-sentence plain-English explanation), table alternative, CSV, PNG/SVG export, and a footer line "Run <id> · <date range> · <model>". Fixed colours/dashes per AGENTS.md §6.

### Tab 1 — Observed and fitted cases
- Observed daily analysis cases: solid dark markers/bars. Model **expected reported incidence** `mu_d` (not I(t)): dashed blue line. Interval: translucent band labelled "95% bootstrap interval (expected cases)" or the legend entry "Interval unavailable — uncertainty off" (no band drawn).
- Hover: date, observation, estimate, interval (or "unavailable"). **Fitting dates vs held-out forecast dates are visually distinct:** in fit-only runs the entire selected range is "fitted"; in evaluated runs add a shaded region + legend label for the forecast-evaluation target period (origin 2020-08-31 → end) clearly separate from the final full-period fit (explain in caption that the final fit used all selected dates).
- Table alternative columns: date, observed, expected, lower, upper.

### Tab 2 — Forecast validation (evaluated runs; otherwise EmptyState "Forecast performance not evaluated")
- **Origin selector** (select + prev/next buttons; keyboard operable) listing 13 origins with split badge (Development/Final).
- Chart: training history (solid dark), vertical **cutoff line** at the origin, next **seven observed** values (hollow markers), **SIR forecast** (selected SIR model: dashed blue; also option to toggle the other SIR variant), **both baselines** (dash-dot slate and long-dash grey). 95% predictive interval shaded when available; otherwise legend "Predictive interval unavailable: <reason from forecast row>".
- Under the chart: mini table for this origin: each model's 7 forecasts vs actual + block MAE/RMSE/total error.
- Data comes from `forecast_rows` + payload (training history from `series`/observed via the dataset observations normalized prefix: **use the stored data of this run, not live dataset queries that might have changed** — if the payload does not contain training history needed, extend the Phase 3 payload with `observedAnalysis: [{date,value}]` and bump `schemaVersion` to 2 with a migration-safe zod union).

### Tab 3 — SIR states ("Latent model states")
- Heading chip "Latent model states — not observed data". Series S, I, R in persons with **visibility toggles** (checkbox group, keyboard accessible), default S hidden (explain "S can dominate the scale"), switch `Persons / per 100,000`. **Never overlay daily new cases on I as if equivalent** — no observed series on this chart. Axis titles with units. Table alternative with the same toggles.

### Tab 4 — Transmission
- Two stacked sub-charts sharing the date axis: β(t) (step line; M2 shows both β and the change date as a labelled vertical marker) and **R_eff(t)** with a horizontal reference line at 1 (dotted, labelled "R_eff = 1"). Callout: "Estimates depend on the assumed reporting fraction and susceptibility; β/γ is an assumption-dependent model ratio." R_eff interval from bootstrap draws if available (else unavailable label).

### Tab 5 — Diagnostics
- Residuals over time (observed − expected) with zero line; Pearson residual histogram **or** scatter (basic bundle has no histogram — use bar chart of binned counts computed in TS); **lag autocorrelation** bars (lags 1–14) with ±limit lines; **convergence warnings** list (icon + text; "No warnings" explicit state); **parameter-profile plots** (one small chart per parameter: NLL vs value with MLE marker and a horizontal line at min+1.92 for an approximate 95% region — label it "approximate"); diagnostic status badge with reasons.

For all tabs: `ChartCard` never throws on null fields; missing values render gaps, not zeros; initial render shows a skeleton; resize to 375px works without horizontal page scroll.

**CHECKPOINT C:** tests + commit.

---

## CHECKPOINT D — Wiring, polish, tests

### Task 6 — Overview wiring
Overview cards from Phase 2 now read real data: *Latest analysis status* from the newest run (pill + name + time); *Best forecast model* = selected SIR model label from the **latest completed EVALUATE run** ("Not evaluated" otherwise, with a hint). `View latest results` links to `/results?run=<id>`.

### Task 7 — Run list shortcuts
In `/runs` (still placeholder until Phase 5) add nothing; but in `/model` the "Recent runs" list links to `/results?run=`.

### Task 8 — Tests
- Vitest unit tests: `setPngDpi`; summary-card derivation (`improvement` sign, null handling); comparison table row builder (failed model shows reason, no zeros); series builders for each tab from a fixture payload (put a small hand-made valid payload in `packages/shared/src/fixtures/results.fixture.ts`); per-100,000 conversion; profile 95% threshold line (min+1.92).
- Component tests: empty/active/failed/fit-only/evaluated states of the Results page with mocked hooks; stale banner appears only when hashes differ; every chart has a table toggle.
- Playwright: demo → load data → Fit → Results → switch through all five tabs (fit-only shows "not evaluated" for forecast validation) → Evaluate → Results shows comparison table + origin selector → export PNG (assert a download occurs and the PNG contains the pHYs chunk) → export SVG → toggle table views → keyboard-only tab navigation test.
- Accessibility: run `@axe-core/playwright` on Results (no serious/critical violations).

**CHECKPOINT D:** everything green, commit, update PROGRESS.md.

---

## ACCEPTANCE CHECKLIST (PASS/FAIL + evidence)

1. Before any run: Results shows an explanatory EmptyState and **no statistics anywhere**; Overview says "Not evaluated".
2. Fit-only run: single card "Forecast performance not evaluated"; Forecast validation tab shows the same message; no MAE/RMSE numbers appear.
3. Evaluated run: MAE, RMSE, improvement (can be negative), diagnostic status, verdict text, retrospective note all present and equal to stored payload values (spot-check 3 numbers against the DB).
4. All charts and metrics on the page show the same run ID; switching runs updates everything atomically (no mixed data).
5. Observed vs model are visually distinct (solid vs dashed + legend); fitting dates distinct from held-out forecast dates; missing intervals show "unavailable", never zero-width bands.
6. SIR states tab: labelled "Latent model states", toggles work, per-100,000 switch correct (verify with a hand calculation in a test), no daily-cases overlay.
7. Transmission tab has the R_eff = 1 reference line and the assumption callout; M2 shows both β values and the change date with the "model change, not verified policy event" note.
8. Diagnostics tab shows residuals, ACF with limits, convergence warnings (or explicit none), 3–4 profile plots.
9. Comparison table has exactly the four required rows and columns; a failed model shows a reason, not zeros; origin-level table expands and downloads CSV.
10. Every chart: table alternative, CSV download, keyboard zoom/reset, PNG (300 dpi metadata verified) and SVG export containing caption, period and assumptions.
11. Stale banner appears when draft settings differ from the displayed run, and the displayed numbers are unchanged.
12. 375px width: no horizontal page scroll; tabs scroll inside their own container; charts resize.
13. axe: no serious/critical violations; contrast AA; focus visible everywhere.
14. Another user's run id in the URL → 403 page state, no data leaked.

Finish with the PHASE 4 REPORT (AGENTS.md §11).

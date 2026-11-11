<!-- Source of truth for the whole project. Converted from Punjab_COVID_Research_website_PRD.docx. Do not edit; record deviations in docs/DECISIONS.md -->

Punjab COVID 19 Research Website Technical Specification

Build a private research website where the user can inspect Punjab COVID-19 data, fit SIR models, compare forecasts with simple baselines, explore transmission scenarios and download reproducible results. The website must show the underlying assumptions and distinguish observed reported cases from simulated infections.

## Website structure

Overview — project summary, dataset status and latest completed analysis.

Data — select or upload a dataset, review quality and confirm the analysis range.

Model setup — configure assumptions and run a model fit or forecast evaluation.

Results — charts, fitted parameters, validation scores and uncertainty.

Scenario explorer — compare baseline transmission with a user-defined change.

Saved runs and downloads — reopen results, compare compatible runs and export files.

Methods — equations, parameter definitions, data provenance and limitations.

## Page layout and visual design

Use a clean white background, dark text, navy navigation and restrained blue chart accents. Desktop: fixed left navigation, page heading and status bar at the top, controls in a narrow left panel and charts in the main panel. At widths below 768 px, collapse navigation and stack controls above charts. Charts must resize without horizontal page scrolling.

The header always shows project name, dataset name, selected dates and run status. Show an obvious “Demo data” badge for synthetic data. Use clear field labels, short tooltips and inline errors. Provide keyboard navigation, visible focus, accessible contrast and a table alternative for every chart. Never rely on colour alone.

## Persistent interface rules

Use explicit Run analysis and Run scenario buttons. Editing an input marks displayed output “Settings changed — rerun required”; it never relabels old output as a new result. All charts and metrics must come from the same run ID. Before an analysis exists, show explanatory empty states rather than placeholder statistics.

# 1 Overview and data screens

## Overview screen

Show a short project explanation and four summary cards: dataset coverage, total reported cases within the selected period, latest analysis status and best forecast model from the latest completed evaluation. A model card displays “Not evaluated” until validation completes. Provide Open data, Configure model and View latest results actions.

Below the cards, show daily reported cases as bars with a trailing seven-day mean as a line. Show source name, retrieval date and a link to Methods. Never describe the mean as model output. A coverage strip shows missing or corrected dates.

## Data screen controls

Source selector: bundled frozen Punjab archive or CSV upload. Fetching a newer snapshot is an explicit action and creates a new dataset version.

CSV upload: accept UTF-8 CSV up to 10 MB and 100,000 rows; validate content server-side. Offer a downloadable schema template and a column-mapping step.

Region: Punjab India, state code PB. Keep region fixed for the initial website. Disease is COVID-19; do not offer a dengue selector.

Date range: default 1 July–30 November 2020 when available. Restrict controls to dates present in the dataset. Show selected day count.

Population: positive integer with source URL, reference year and geography. Block empirical fitting if population provenance is missing.

## Data preview and validation

Display a paginated table with date, raw new confirmed cases, analysis cases, quality flag and source reference. Add filters for missing, duplicate and corrected records. Above it show record count, date coverage, missing days, duplicate keys and total correction magnitude. Provide Download cleaned CSV and Download quality log.

Never convert blanks to zero or silently drop negative counts. Preserve the original upload. For a negative correction, subtract its magnitude from preceding positive counts, most recent first, within 14 days; set the correction day to zero and log every adjustment. If insufficient prior cases exist, mark unresolved. Missing dates, duplicates and unresolved corrections block analysis with an explanation and affected row numbers.

# 2 Model setup and execution

## Standard controls

Choose Constant transmission SIR or One change point SIR. Offer two actions: Fit selected period and Evaluate seven-day forecasts. The first is descriptive and must not produce a forecast performance claim. The second runs the fixed chronological evaluation protocol. Default to the constant model for a first fit.

Infectious duration: default 7 days; allowed 3–21 days, step 1. Gamma is displayed as 1 divided by duration, per day.

Reporting fraction: default 0.20; allowed 0.01–1.00. Explain that this is an assumption about detected infections, not an estimated value.

Initially susceptible fraction: default 0.95; allowed 0.01–0.999. Show inferred initial removed population after fitting.

Uncertainty: off or 200 bootstrap replicates. Forecast horizon is fixed at 7 days for evaluation; scenario horizon is configured separately.

## Advanced controls

Show initial infection bounds, beta bounds, dispersion bounds, optimization starts, seed and solver settings in a collapsed panel. Defaults: beta 0.01–2 per day; initial infectious population 1–min(1,000,000, N−S_initial); dispersion 0.05–1000; 20 optimizer starts; seed 42. Reject impossible populations and nonfinite inputs on both client and server.

For the change-point model, search candidate dates every seven days using training data only, with at least 21 days on each side. Display the chosen date after fitting. It represents a model change, not a verified policy event.

## Execution behaviour

Before submission show a compact settings summary. Create an immutable run record and execute in a background worker. Display queued, validating, fitting, evaluating, estimating uncertainty, exporting, completed, failed or cancelled. Show stage progress and elapsed time; show a percentage only when completed task counts are known. Support cancellation between fitting tasks.

Prevent double submission while retaining navigation. Changing inputs does not modify an active run. A failed run shows an actionable message and a technical error reference. Keep earlier successful runs accessible, but never display them as output of the failed request. Saving a run is automatic; give it an editable display name.

# 3 Results screen and chart behaviour

## Summary and parameter display

Display dataset version, date range, model, run ID, completion time and assumptions. Summary cards show forecast MAE, RMSE, improvement over the selected baseline and diagnostic status only for evaluated runs. Fit-only runs show “Forecast performance not evaluated”. An improvement may be negative. Parameters include beta, gamma, I_initial, dispersion, assumed reporting fraction and initial susceptibility; M2 shows both beta values and the change date.

## Required chart tabs

Observed and fitted cases: daily observed counts and predicted reported incidence. Hover shows date, observation, estimate and interval when available. Keep fitting dates distinct from held-out forecast dates.

Forecast validation: select forecast origin; show training history, vertical cutoff, next seven observations, SIR forecast and both baseline forecasts. Shade a 95 percent predictive interval when available.

SIR states: S, I and R in persons, with an optional per-100,000 toggle. Label these “Latent model states”. Provide visibility toggles because S can dominate the scale; never overlay daily new cases on I as if equivalent.

Transmission: beta and model-implied R_eff over time, with an R_eff = 1 reference line. Explain that estimates depend on assumed reporting and susceptibility.

Diagnostics: observed minus expected daily counts, residuals over time, lag autocorrelation, convergence warnings and parameter-profile plots.

## Model comparison table

Rows are constant SIR, change-point SIR, seven-day mean baseline and same-weekday baseline. Columns show development MAE, final MAE, final RMSE, seven-day total error, blocks won and run status. A failed or unavailable model has an explicit reason; no fabricated zero scores. Include origin-level scores in an expandable table.

## Shared chart requirements

Use real dates, labelled axes and units, consistent series colours, zoom/reset, keyboard-accessible controls and a downloadable data table. Use solid observations, dashed model lines and translucent intervals with legend labels. Export the visible figure as 300 dpi PNG and SVG with caption, selected period and assumptions. A missing interval is labelled unavailable, not drawn as zero width.

# 4 Scenario explorer and saved runs

## Scenario controls

Require a completed fit. Let the user choose that run, set a transmission change from −50 to +50 percent in steps of 5, and set a horizon from 7 to 60 days. Defaults: −20 percent and 28 days. Start the scenario immediately after the fitted period. Show the exact start date and disable changing historical model parameters inside this screen.

Run two simulations from the same fitted S, I and R: baseline uses the final fitted beta; scenario uses beta × (1 + change_percent/100). Keep N, gamma, reporting fraction and starting state identical. For M2 use its final beta. Every scenario stores its parent run ID and its own configuration.

## Scenario output

Show baseline and scenario expected daily reported cases, with optional latent infections in a separate chart. Display cumulative expected reported cases, cumulative model infections and their percentage differences over the selected horizon. Where the baseline total is zero, display percentage difference as undefined. If bootstrap draws exist, propagate identical paired draws through both scenarios and label the resulting interval conditional on model assumptions.

Display “Hypothetical simulation under the fitted model” above the results. Use a deterministic sentence template describing inputs and calculated differences. Never label the output lives saved, proven policy impact or real-world cases prevented.

## Saved runs

List display name, timestamp, dataset version, model, selected dates, status and assumptions. Support search, reopen, rename, duplicate settings and delete with confirmation. Reopening uses stored results without refitting. Compare up to three runs side by side. Only rank forecasts when target dates and dataset versions match; otherwise show “Different evaluation conditions”.

## Download centre

Cleaned dataset and correction log as CSV; fitted daily states and expected observations as CSV.

Forecast records and metrics as CSV; fitted parameters, assumptions and diagnostics as JSON.

Individual figures as PNG or SVG; complete reproducibility bundle as ZIP containing configuration, provenance, results and figures.

The download manifest must include run ID, source checksum, code revision and dependency versions. Do not include session tokens, private server paths or logs containing credentials. Exports reflect completed stored runs, not unsaved edits to the controls.

# 5 Backend model and evaluation rules

## Equations and observation mapping

Use dS/dt = −beta(t)SI/N; dI/dt = beta(t)SI/N − gamma I; dR/dt = gamma I. R means removed from transmission. Add dC/dt = beta(t)SI/N, with C(0)=0. Set S_initial = susceptible_fraction × N and R_initial = N−S_initial−I_initial. Time is in days; states are persons.

Expected reported cases for day d are mu_d = rho × [C(t_d+1)−C(t_d)]. Fit this daily incidence, never I(t), to observed new cases. Primary analysis uses report dates without an explicit delay model. Explain this approximation in Methods. R_eff(t)=beta(t)S(t)/(gamma N); beta/gamma is an assumption-dependent model ratio.

Use a negative binomial likelihood with mean mu and variance mu+mu²/k. Fit beta, I_initial and k; gamma, rho and initial susceptibility remain fixed per run. M2 fits two betas and searches a training-only change point. Integrate with solve_ivp at daily boundaries, internally scaled by N, rtol and atol 1e−8. Use bounded multi-start optimization and record boundary hits and convergence.

## Forecast evaluation

Default origins: 31 August 2020 and every seven days through 23 November. Train on the expanding prefix starting 1 July and forecast the next seven days. First nine blocks are development; last four are final. Freeze model selection rules before final evaluation. Alternate dates may be used only as a newly versioned configuration with at least 13 complete blocks and 42 initial training days.

Baseline 1 predicts the last seven-day mean for every forecast day. Baseline 2 repeats the preceding week’s daily pattern. Score every model on the same targets. MAE is mean absolute error; RMSE is root mean squared error. Aggregate seven-day total error by block. Report development and final performance separately.

Prefer M1 unless M2 improves development MAE by at least 10 percent and wins six of nine blocks. Select the baseline using development MAE. Mark final improvement supported only if selected SIR beats that baseline by at least 10 percent MAE and wins three of four final blocks. Otherwise state that improvement was not demonstrated. These are project rules, not significance tests.

Normalize each training prefix independently so later corrections cannot leak into earlier fits. If a required forecast fails, mark the comparison incomplete; never drop it silently. Label retrospective validation as using a revised archive.

# 6 Data contracts and application services

## Data entities

Dataset: id, version, name, region_code, source_url, retrieved_at, sha256, raw_file_key, clean_file_key, schema_mapping and quality_summary.

Daily observation: dataset_id, date, new_confirmed_raw, new_confirmed_analysis, quality_flag and transformation_id. Unique key is dataset_id plus date.

Run: id, owner_id, dataset_version, display_name, model_type, config, status, stage, created_at, completed_at, code_version, seed and error_reference.

Fit result: run_id, parameters, parameter_intervals, assumptions, convergence, boundary_hits and change_point.

Forecast row: run_id, model, origin_date, target_date, split, estimate, lower, upper and actual. Null intervals require an availability reason.

Scenario: id, parent_run_id, percent_change, horizon_days, status, daily_outputs and summary. Export: id, run_id, type, file_key and checksum.

## Recommended application architecture

React with TypeScript for the interface; Python FastAPI for validated endpoints; NumPy, pandas and SciPy for calculations; Plotly for interactive charts; a separate Python worker for long computations; PostgreSQL for metadata and a private object store for raw files, results and exports. Deploy frontend, API and worker separately. This is a proposed stack; pin tested versions during implementation.

## API contract

POST /datasets accepts a file or an approved archive source and returns dataset_id plus validation status. GET /datasets/{id} returns preview and quality summary. POST /runs accepts dataset version and validated configuration, then returns HTTP 202 with run_id. GET /runs/{id} returns status, stage and available output links. GET /runs/{id}/results returns completed results only.

POST /runs/{id}/cancel requests cooperative cancellation. POST /scenarios creates a scenario for a completed parent fit. GET /scenarios/{id} returns status or output. POST /runs/{id}/exports creates an export; GET /exports/{id} returns an authorized download. GET /runs lists the owner’s runs; PATCH /runs/{id} changes the display name; DELETE /runs/{id} deletes the run and dependent files.

Use typed request and response schemas. Return structured errors with code, message, field or row references and request_id. Use 422 for invalid input, 403 for access denied, 409 for incompatible state and 429 for job limits. Add an idempotency key to run creation; identical retries must return the same job.

# 7 Reliability security and required behaviour

## Uncertainty and sensitivity

Bootstrap runs use 200 simulated negative binomial datasets with the same fitting procedure; store failed refits. Require at least 180 successful refits before displaying intervals as reliable. Predictive intervals include observation noise. Provide an Advanced sensitivity action for infectious durations 5, 7 and 10 days, reporting fractions 0.10, 0.20 and 0.50, and susceptible fractions 0.85, 0.95 and 0.99. Show all 27 combinations and ranking reversals rather than selecting a favourable one.

## Security and data storage

Require sign-in through a managed identity provider and restrict access to authorized accounts. Check ownership on every dataset, run, scenario and download request. Use HTTPS, private file storage and expiring authorized downloads. No public run URLs by default. Treat uploaded data as aggregate counts; reject patient names and identifiers in the canonical schema.

Allow archive downloads only from a server-side source allowlist; do not fetch arbitrary user-supplied URLs. Sanitize filenames, validate CSV size and row count, escape displayed text and neutralize spreadsheet formulas in exported text cells. Store secrets outside application code. A delete operation removes dependent scenarios and exports; a referenced dataset cannot be deleted until its runs are removed.

## Performance and recovery

Run charts from stored results rather than refitting on page load. Cache only by dataset checksum, full configuration and code revision. Poll active jobs at approximately two-second intervals. Queue heavy jobs; limit each user to two active analysis jobs. Persist job state so a browser refresh can reconnect. Worker failures must produce a visible failed status or a bounded retry, never a permanently running spinner.

## Required verification

Complete the browser workflow: load data, resolve errors, configure a fit, run validation, inspect charts, create a scenario, reopen the saved run and download matching files.

Test missing dates, negative corrections, duplicates, wrong region, invalid populations, malicious text, cancelled jobs and failed optimization. Confirm that stale results are visibly marked.

Verify state conservation, nonnegative states, zero incidence when beta is zero, correct incidence mapping and reproducible synthetic outputs. Changing future records must leave an earlier forecast unchanged.

Verify baseline calculations, identical evaluation dates, comparison compatibility, export values and interval labels. Confirm unauthorized users cannot read another user’s run or files.

Methods content should link to the COVID19India archive documentation, https://data.covid19india.org/documentation/csv/, and state that model findings depend on data quality and assumptions. Keep all numerical claims traceable to completed calculations; never prepopulate a successful research conclusion.

Punjab COVID 19 Research Website  |  Technical specification
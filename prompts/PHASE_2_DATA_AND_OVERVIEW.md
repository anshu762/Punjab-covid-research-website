# PHASE 2 — Data pipeline, Data screen, Overview screen, Chart foundation

**Prerequisite:** Phase 1 complete and committed. Read `AGENTS.md`, then in `docs/PRD.md` read: "Overview and data screens" (all), "Shared chart requirements", "6 Data contracts" (Dataset, Daily observation), "Security and data storage". Re-read `docs/DB_TABLES.md`.
**Goal:** a user can load the bundled Punjab archive (or demo data) or upload a CSV, map columns, get a server-side validation + cleaning report, browse the cleaned table, confirm date range and population provenance, and see a correct Overview. All cleaning rules from the PRD are implemented *exactly* and tested.

---

## CHECKPOINT A — Cleaning engine (Python, pure functions, heavily tested)

### Task 1 — Normalization function `apps/compute/app/data/cleaning.py`
Pure function (no DB, no I/O) — it will be re-used in Phase 3 on training prefixes:

```python
@dataclass
class RawRecord: date: date; value: int | None; row_number: int   # row_number: 1-based file row incl. header (first data row = 2)
def normalize(records: list[RawRecord], window_days: int = 14) -> NormalizationResult
```
`NormalizationResult`: `observations: list[Obs]` (one per calendar date from min to max date; fields `date, raw (int|None), analysis (int|None), flag, source_ref, transformation_id`), `quality_log: list[LogEntry]`, `summary: QualitySummary`.

Rules (PRD, implement exactly):
1. **Duplicates:** if a date appears more than once → one `Obs` with `flag=DUPLICATE`, `raw=None`, `analysis=None`, `source_ref="rows 12, 57"`. Log each. *Blocks analysis.*
2. **Missing dates:** every calendar date between min and max with no record → `flag=MISSING`, `raw=None`, `analysis=None`. A **blank value** is also MISSING. **Never convert blanks to zero.** *Blocks analysis.*
3. **Negative values (corrections):** process in chronological order on the *analysis* series. For a negative value with magnitude `m` on date `t`: go back day by day `t-1 … t-window_days`, most recent first; for each earlier day whose current analysis value is a positive integer `c`, subtract `take = min(c, remaining)` and log an ADJUSTMENT entry `(date, before, after, amount)`; stop when `remaining == 0`. If `remaining > 0` after the window → **revert all adjustments made for this correction**, set the correction day `flag=UNRESOLVED_CORRECTION`, keep `analysis=None`, log it. Otherwise set the correction day analysis to `0` with `flag=CORRECTION_DAY`, and mark each adjusted day `flag=CORRECTED` (if already CORRECTION_DAY/CORRECTED keep a combined note in the log, flag stays CORRECTED). Missing/blank earlier days are skipped (cannot subtract from blanks). Never silently drop a negative.
4. **Totals:** `correction_magnitude` = sum of magnitudes of all *resolved* negative corrections.
5. `summary`: `record_count` (input rows), `date_start`, `date_end`, `expected_days`, `missing_days` (+ list), `duplicate_keys` (+ list with rows), `correction_magnitude`, `corrections[]` (date, magnitude, row_number, status, adjustments[]), `unresolved[]` (date, row_number, magnitude, shortfall), `blocking_issues[]` (`code`: MISSING_DATES | DUPLICATE_DATES | UNRESOLVED_CORRECTION, `message`, `rows[]`, `dates[]`), `analysis_ready: bool` (true only if no blocking issues).
6. **Prefix independence:** the function must give the same result for day *d* whether or not data after *d* exists **except** for adjustments caused by later negatives (which is exactly why Phase 3 normalizes each training prefix separately). Add a docstring saying so.

### Task 2 — CSV parsing and validation `app/data/csv_io.py`
- Accept bytes. Decode **UTF-8 (with optional BOM)**; otherwise error `invalid_encoding`.
- Enforce ≤ 10 MB (`file_too_large`) and ≤ 100,000 data rows (`too_many_rows`) **server-side**.
- Use `csv.DictReader` (do not trust pandas dtype guessing). Detect headers; reject files with no header or duplicated header names.
- **PII guard:** if any header (case-insensitive, normalised) contains any of `name, patient, aadhaar, aadhar, phone, mobile, address, email, dob, birth, passport, ssn, contact` → error `identifiers_not_allowed` listing the offending column names. Aggregate counts only.
- Canonical schema: `date` (YYYY-MM-DD), `new_confirmed` (integer, negative allowed as correction), optional `region_code`. A **column mapping** can map any upload header to these.
- Row validation: unparsable date → error with row numbers; non-integer count (e.g. "12.5", "abc") → error with row numbers; blank count → allowed (becomes MISSING). If `region_code` is mapped, every non-blank value must equal `PB` (case-insensitive) else error `wrong_region` listing rows. Errors are collected (up to 100 row numbers per error, plus total count) and returned together, not one at a time.
- Spreadsheet-formula safe export helper `app/data/safe_csv.py::neutralize(cell)` — prefix `'` when a **string** cell starts with `= + - @ \t \r` (do not alter numbers).
- Filename sanitizer `safe_filename(name)` (strip paths, control chars, limit length 100, keep `[A-Za-z0-9._-]`).

### Task 3 — Pytest suite `tests/test_cleaning.py`, `tests/test_csv_io.py` (all must pass)
Cases: clean series unchanged · one missing date · blank value (stays missing, not 0) · duplicate date (rows listed) · negative resolved from one prior day · negative spanning several prior days (most recent first, exact adjustments logged) · negative needing > 14 days → UNRESOLVED and all adjustments reverted · two negatives in sequence (second sees first's adjustments) · negative on day 1 (no prior) · wrong region · PII header · bad encoding · BOM file · 100,001 rows · 10 MB + 1 byte · formula injection cell (`=1+1`, `@x`, `-cmd`) neutralized but number `-5` untouched · filename `../../etc/passwd` sanitized · row numbers are 1-based with header = row 1.

**CHECKPOINT A:** `pytest -q` green, commit.

---

## CHECKPOINT B — Persistence, bundled data, endpoints (compute service)

### Task 4 — Bundled datasets `apps/compute/data/` and `app/data/bundled.py`
1. **Real snapshot:** write `scripts/fetch_punjab_snapshot.py` that downloads `https://data.covid19india.org/csv/latest/state_wise_daily.csv` (allowlisted host only), keeps rows with `Status == "Confirmed"`, columns `Date_YMD` and `PB`, and writes `data/punjab_covid_pb_frozen.csv` with columns `date,new_confirmed,region_code` (region_code = PB) plus `data/punjab_covid_pb_frozen.provenance.json` (`source_url`, `retrieved_at`, `sha256`, `documentation_url: https://data.covid19india.org/documentation/csv/`, row count). Run it and commit both files. If the download fails, write a clear note in `docs/BLOCKERS.md` and ask the human to download the CSV manually; do NOT invent data. Verify that the real file covers 2020-07-01 → 2020-11-30.
2. **Synthetic demo:** `scripts/make_synthetic_demo.py` (fixed seed 20200701) generates `data/synthetic_demo.csv` covering **2020-07-01 → 2020-11-30**: run a constant-parameter SIR with the Phase-3 integrator conventions (N=27,743,338, S0=0.95N, gamma=1/7, beta chosen so the epidemic rises then falls plausibly, reporting fraction 0.2), mean daily reported cases = rho × (C(d+1) − C(d)), add negative-binomial noise (k=30) and a mild weekday effect, and inject **exactly one** resolvable negative correction (a later small negative) so the quality log has something to show. Store its generator parameters in `synthetic_demo.provenance.json`. Dataset name: "Synthetic demo (Punjab-like)". It is always flagged `is_synthetic = true` and shows the "Demo data" badge.
3. `bundled.py` exposes `BUNDLED_SOURCES = {"punjab_frozen_archive": {...}, "synthetic_demo": {...}}` with name, source_url, retrieval date from provenance, file path, is_synthetic.

### Task 5 — Service layer `app/data/service.py` (uses psycopg; all queries filter by `owner_id`)
- `create_upload_dataset(user_id, filename, content) -> dict`: sanitize filename; store `RAW_UPLOAD` `StoredFile` (preserves the original upload untouched; sha256); create `Dataset(status=PENDING_MAPPING, source_kind=UPLOAD, family_id=new cuid, version=1)`; return `dataset_id`, detected columns, first 10 preview rows, suggested mapping (match headers `date`/`Date`/`Date_YMD`, `new_confirmed`/`cases`/`daily_cases`/`confirmed`, `region_code`/`state`), `row_count`.
- `confirm_dataset(user_id, dataset_id, mapping, name, population) -> dict`: parse with mapping → `normalize()` → write `Observation` rows (bulk `COPY`/`executemany`), `CLEAN_CSV` and `QUALITY_LOG` stored files (neutralize text cells), update dataset `status` (`READY` if `analysis_ready` else `BLOCKED`), `quality_summary`, `schema_mapping`, population fields (validated: positive integer, valid http(s) URL, year 1900–2100, non-empty geography; if missing → allowed to save but flagged `population_missing` in summary).
- `import_bundled(user_id, source_key) -> dict`: same pipeline from the bundled file. Family id = `bundled:<source_key>`. If the user already has a dataset with the same family and identical sha256 → return it (`created=false`). If sha differs → create `version+1`.
- `fetch_archive_snapshot(user_id)`: explicit action; downloads only from `ARCHIVE_ALLOWLIST` hosts (validate scheme https + host exactly), 20s timeout, 10 MB cap, computes sha256; if identical to latest version → `{ "created": false, "message": "Already at the latest snapshot" }`; else creates a new version. (The archive is frozen, so "no change" is the expected honest result.)
- Quality log CSV columns: `seq,type,date,row_number,original_value,new_value,amount,message`. Cleaned CSV columns: `date,new_confirmed_raw,new_confirmed_analysis,quality_flag,source_ref`.
- Default population for bundled sources (editable by the user): **27,743,338**, geography "Punjab, India (state)", reference year **2011** (Census of India 2011), source URL = official census site page you can verify online. **Verify the figure and URL on the web before committing; if you cannot verify, keep it but add `TODO(verify)` in `docs/DECISIONS.md`.** For the synthetic dataset use the same value and note it is synthetic.

### Task 6 — HTTP endpoints (compute)
- **Public upload (browser → compute directly, because Vercel request bodies are limited to ~4.5 MB):** `POST /public/datasets/upload` multipart, requires `Authorization: Bearer <JWT>` — HS256 JWT signed with `COMPUTE_SHARED_SECRET`, claims `sub` (user id), `scope="dataset:upload"`, `exp` ≤ 2 minutes; verify with PyJWT. Enforce size/rows server-side while streaming. CORS only for `ALLOWED_ORIGINS`.
- **Internal (secret + `X-User-Id`):** `POST /internal/datasets/{id}/confirm`, `POST /internal/datasets/import-bundled`, `POST /internal/datasets/fetch-archive`.
- All errors use the standard envelope (422 with `code`, `message`, `field`, `rows`).
- Replace the Phase-1 `seedDemoData` stub in `apps/web/src/lib/demo.ts` with a real call to `import-bundled` (`synthetic_demo`), best-effort with 8 s timeout.
- Pytest with FastAPI `TestClient` + a Postgres test DB if `DATABASE_URL_TEST` is set (skip otherwise): upload→confirm happy path, blocked dataset, wrong-user access returns 403/404, expired JWT rejected, wrong scope rejected, internal route without secret rejected.

**CHECKPOINT B:** `pytest -q` green, commit.

---

## CHECKPOINT C — Web: API routes, chart foundation, shared UI

### Task 7 — Next.js route handlers (all with `apiHandler`, `requireUser`, zod, ownership)
- `POST /api/datasets/upload-token` → `{ url, token, expiresIn }` (signs the JWT with `jose`, 2 min).
- `POST /api/datasets/[id]/confirm` (zod: mapping, name, population) → forwards to compute.
- `POST /api/datasets/import-bundled` (zod: `source` enum) · `POST /api/datasets/fetch-archive`.
- `GET /api/datasets` (list user's datasets, newest first, grouped info: id, name, version, status, isSynthetic, date coverage, quality summary headline numbers).
- `GET /api/datasets/[id]` (dataset + quality summary + provenance).
- `PATCH /api/datasets/[id]/population` (zod; updates population fields only).
- `GET /api/datasets/[id]/observations?page=&pageSize=&filter=all|missing|duplicate|corrected` — server-side pagination through Prisma (`pageSize` ≤ 100), returns rows as `{date, newConfirmedRaw, newConfirmedAnalysis, qualityFlag, sourceRef}` with ISO date strings, plus `total`.
- `GET /api/datasets/[id]/download/clean` and `/quality-log` → stream stored CSV with `Content-Disposition: attachment` and sanitized filename (ownership checked).
- `DELETE /api/datasets/[id]` → 409 with code `dataset_in_use` if any run references it, else delete.
- Shared zod schemas (population, mapping, date range) live in `packages/shared/src/schemas/dataset.ts` and are used by BOTH client forms and route handlers.

### Task 8 — Plotly chart foundation `src/components/charts/`
- Install `plotly.js-basic-dist-min` (pin). Write **`PlotlyChart.tsx`** (client): `next/dynamic` / dynamic `import()` inside `useEffect` (SSR off); `Plotly.react(div, data, layout, config)`; `config = { responsive: true, displaylogo: false, displayModeBar: false }` (we provide our own accessible toolbar); `ResizeObserver` → `Plotly.Plots.resize`; cleanup with `Plotly.purge`. Define a small TS declaration for the module.
- **`ChartToolbar.tsx`**: real `<button>`s (keyboard accessible, tooltips): Zoom in, Zoom out, Reset zoom, Pan left, Pan right (via `Plotly.relayout` on x-range), plus a range preset select. Buttons disabled until chart mounted.
- **`DataTable.tsx`** (generic, from column defs) used as "View as table" alternative and **`downloadCsv(filename, rows)`** helper that neutralizes formulas in text cells.
- **`chartTheme.ts`**: layout defaults (white paper, ink text, light grid, Inter font, margins, legend on top), series style map from AGENTS.md §6 (colours + dash patterns + markers), and a `datesAxis` helper (real dates, axis title "Date", units in y-axis titles).
- `ChartCard` (from Phase 1) now wires: title, toolbar, chart, table toggle, CSV download, caption. Chart container has fixed min-height and never causes horizontal page scroll.

### Task 9 — Dataset hooks and selection
`src/hooks/useDatasets.ts` (TanStack Query), `useDataset(id)`, `useObservations(id, page, filter)`. Add `QueryClientProvider` in the `(app)` layout. Workspace store (`datasetId`, `dateRange`) must validate that the stored dataset still exists and the range lies inside the dataset's coverage; otherwise reset with a toast. When a READY dataset is selected for the first time, default the range to `DEFAULT_DATE_RANGE` clipped to coverage.

**CHECKPOINT C:** typecheck/lint/tests green, commit.

---

## CHECKPOINT D — Data screen and Overview screen

### Task 10 — `/data` page (PRD "Data screen controls" + "Data preview and validation")
Layout (desktop): narrow left control panel (≈360px) + main panel; stacked below 768px.
**Left panel (controls):**
1. **Source selector** (segmented control): "Bundled Punjab archive" | "Upload CSV" | "Synthetic demo".
   - Archive: shows source name, retrieval date, checksum short form, button `Load archive` (calls import-bundled) and `Check for newer snapshot` (explicit; shows result toast — "Already at the latest snapshot" or "Created version N").
   - Synthetic demo: `Load demo data` button + explanation that it is simulated.
   - Upload: accessible dropzone (click, drag, keyboard Enter/Space), file constraints text ("UTF-8 CSV, ≤ 10 MB, ≤ 100,000 rows"), `Download schema template` link (static header-only file `public/templates/punjab_covid_schema_template.csv` with header `date,new_confirmed,region_code`), upload progress, then the **column-mapping step** (Stepper: 1 Upload → 2 Map columns → 3 Review). Mapping step: selects for Date / New confirmed cases / Region (optional) pre-filled from suggestions, preview of first 10 rows, dataset name input, population fields. Inline errors from the server (`code`, `rows`) are shown next to the field and as a compact list ("Rows 12, 57, 90 … and 4 more") with the affected row numbers.
2. **Dataset picker** (if the user has several): select with name + version + badge (Demo data / Blocked / Ready).
3. **Region** (read-only card): "Punjab, India (PB) · COVID-19" with note "Fixed for this version". No dengue selector.
4. **Date range**: two date inputs restricted (`min`/`max`) to dataset coverage, validated start ≤ end and inside coverage; shows "N days selected". Writes to workspace store.
5. **Population provenance** form: population (positive integer), source URL, reference year, geography; Save button; if missing show a warning "Empirical fitting is blocked until population provenance is provided".
**Main panel:**
- Summary strip (above table): record count, date coverage, missing days, duplicate keys, total correction magnitude — each a `StatCard`.
- If `BLOCKED`: red `Alert` "Analysis blocked" listing each blocking issue with explanation and affected row numbers/dates, and a `Download quality log` button.
- Coverage strip (see Task 11 component) for the full dataset.
- Paginated table (TanStack Table, server-side pagination 25/page): columns Date, Raw new confirmed, Analysis cases, Quality flag (badge with icon + text), Source reference. Filter chips: All · Missing · Duplicate · Corrected. Raw blanks display "— (missing)", never 0.
- Buttons: `Download cleaned CSV`, `Download quality log`, and `Delete dataset` (ConfirmDialog; shows 409 reason if runs exist).
- Demo badge for synthetic data in StatusBar and on the dataset card.
- Empty state when no dataset: explains the three ways to start.

### Task 11 — Overview page `/overview` (PRD "Overview screen")
Server-render the data via Prisma/cached queries, client chart.
- Short project explanation paragraph and **four StatCards**: *Dataset coverage* (start–end, N days), *Total reported cases in selected period* (sum of analysis cases within the range; "—" with reason if the dataset is blocked/missing), *Latest analysis status* (from the latest Run: status pill; "No analysis yet" if none), *Best forecast model* (shows **"Not evaluated"** until a completed EVALUATE run exists; later phases fill it from the stored selection result).
- Actions: `Open data`, `Configure model`, `View latest results` (disabled with tooltip when no completed run).
- **Chart:** daily reported cases as bars (analysis cases) with a **trailing 7-day mean line** (mean of the last 7 days; first 6 days = no value). Legend labels: "Reported cases (analysis)" and "7-day trailing mean (descriptive, not a model)". Never call the mean model output. Hover: date, cases, mean. Table alternative + CSV download. Correction/missing days marked with a distinct marker + legend entry (not colour only).
- Below chart: source name, retrieval date, checksum, link to `/methods`.
- **`CoverageStrip` component** (`src/components/data/CoverageStrip.tsx`): one cell per day, aria-labelled, shapes/patterns for OK / Missing / Duplicate / Corrected / Unresolved (solid, hatched, dotted etc.), legend, tooltip with date + flag, horizontally compresses to fit (no page scroll), keyboard focusable summary with a `View as table` toggle.
- Empty states: no dataset → explain + `Open data`.

### Task 12 — Tests
- Vitest: 7-day trailing mean function (`packages/shared/src/stats.ts`: first 6 null, correct window), date-range clipping, zod schemas (population valid/invalid), `downloadCsv` neutralization.
- Component tests (Vitest + Testing Library) for `CoverageStrip` flag mapping and the Data page error rendering of server errors.
- Add one Playwright smoke test (install Playwright) `e2e/data.spec.ts`: demo login → Data → Load demo data → table shows rows → Overview shows 4 cards and chart. Mark clearly how to run.

**CHECKPOINT D:** everything green, commit, update PROGRESS.md.

---

## ACCEPTANCE CHECKLIST (PASS/FAIL + evidence for each)

1. `pytest -q` covers every cleaning rule in Task 3 and passes; `pnpm test` passes.
2. Real Punjab snapshot file exists with provenance JSON and covers 2020-07-01→2020-11-30 (or a documented blocker). Synthetic file exists with exactly one resolvable negative correction.
3. Loading the archive creates a Dataset with observations; blank values are never stored as 0; original upload is preserved byte-for-byte (compare sha256).
4. Upload of a valid CSV (≤ 10 MB) works from the browser **directly to compute** with the signed token; a 10 MB+1 file, a 100,001-row file, a non-UTF-8 file, a file with a `patient_name` column and a file with a wrong region each fail with an inline error naming the cause and row numbers where relevant.
5. A dataset with missing dates / duplicates / unresolved correction becomes BLOCKED with the exact explanation and row numbers; a clean one becomes READY.
6. Negative-correction examples match the PRD algorithm exactly (check the quality log CSV of the demo dataset by hand and describe it in the report).
7. Cleaned CSV and quality log download correctly; CSV cells beginning with `=`, `+`, `@` are neutralized when text.
8. "Check for newer snapshot" never fetches from a non-allowlisted URL (test with a spoofed URL) and reports honestly when nothing changed.
9. A user cannot read/delete another user's dataset (test with two demo users): API returns 403/404 and the UI shows nothing leaked.
10. Date range inputs cannot leave dataset coverage; the selected day count is correct.
11. Overview shows exactly 4 cards; "Best forecast model" = "Not evaluated"; the mean line is labelled descriptive; empty states render when there is no dataset.
12. Every chart has working zoom in/out/reset by keyboard, "View as table", CSV download; resize from 1280→375px causes no horizontal page scroll.
13. Population provenance missing → warning shown and flagged in dataset summary (blocking enforced in Phase 3).
14. Playwright smoke test passes.

Finish with the PHASE 2 REPORT (AGENTS.md §11).

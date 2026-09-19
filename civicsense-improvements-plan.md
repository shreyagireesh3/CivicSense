# CivicSense Improvements Plan

## Overview

This plan improves the reliability, maintainability, security, and documentation of the
CivicSense project without touching the analytics methodology, forecasting model, visual
design, or any existing working features.

All changes are purely additive or corrective. No notebooks are modified. No components are
split. No TypeScript is introduced. The dashboard visual design is unchanged.

**Files affected:**
- `backend/main.py` — FastAPI error handling and CORS fix
- `dashboard/src/App.jsx` — fetch reliability, error states, de-duplication, env var
- `dashboard/.env.example` — new file
- `backend/tests/test_api.py` — new file
- `backend/tests/__init__.py` — new file (empty)
- `requirements-dev.txt` — new file (test dependencies)
- `README.md` — new or replaced with full documentation

**Files NOT touched:**
- Any notebook (`notebooks/`)
- Any model file (`models/`)
- Any JSON artifact (`dashboard/public/data/`)
- Any CSS (`dashboard/src/index.css`)
- `dashboard/vite.config.js`
- `dashboard/.oxlintrc.json`
- `dashboard/package.json`

---

## Sub-Task 1 — FastAPI Reliability

**Status:** [ ] pending

### Intent

The current `load_json()` helper returns HTTP 200 with `{"error": "filename not found"}`
when a file is missing. The frontend checks `response.ok` (always true for 200) and never
inspects the body for an error key — so a missing data file causes silent chart failures.

This sub-task makes the backend return a proper HTTP 404 when a file is missing, so the
frontend catch block can detect and handle it correctly.

### Expected Outcomes

- `GET /api/summary` (and every other data endpoint) returns HTTP 404 when the target JSON
  file is absent.
- `GET /api/summary` continues to return HTTP 200 with the correct JSON when the file is
  present.
- `GET /` and `GET /api/health` are unchanged (they do not call `load_json`).
- FastAPI auto-generated docs (`/docs`) still show the endpoints.

### Todo List

1. Import `HTTPException` from `fastapi` at the top of `backend/main.py`.
2. In `load_json()`, replace the `return {"error": f"{filename} not found"}` branch with
   `raise HTTPException(status_code=404, detail=f"{filename} not found")`.
3. Add a new route `GET /api/metadata` that calls `load_json("dashboard_metadata.json")`.
   This exposes the already-generated file that currently has no endpoint.
4. Leave all other route functions and the CORS middleware untouched in this sub-task.

### Relevant Context

- `backend/main.py` lines 28–37: `load_json()` — the entire change is inside this helper.
- `backend/main.py` line 4: `from fastapi import FastAPI` — add `HTTPException` here.
- `dashboard/public/data/dashboard_metadata.json` exists and contains:
  `{total_records, categories, subcategories, wards, statuses, date_min, date_max}`.
- The frontend currently fetches no endpoint for this file; the new route is consumed in
  Sub-Task 4.

---

## Sub-Task 2 — CORS Security Fix

**Status:** [ ] pending

### Intent

The current CORS configuration sets `allow_origins=["*"]` and `allow_credentials=True`
simultaneously. Per the CORS specification, a wildcard origin is forbidden when credentials
are included — browsers already reject such responses for credentialed requests. The
combination is semantically incorrect and misleading.

Since the frontend never sends credentials and this is a local/demo project serving
read-only civic data, the correct fix is to remove `allow_credentials=True`.

### Expected Outcomes

- CORS middleware allows cross-origin requests from any origin (unchanged behaviour for the
  current use-case).
- `allow_credentials=True` is removed.
- No authentication or rate limiting is added.
- The frontend continues to work without any changes on its side.

### Todo List

1. In `backend/main.py`, remove `allow_credentials=True` from the `CORSMiddleware`
   constructor arguments.
2. No other changes to the CORS configuration.

### Relevant Context

- `backend/main.py` lines 19–25: the `CORSMiddleware` block.
- The frontend (`App.jsx`) makes plain `fetch()` calls with no credentials option — the
  wildcard origin is sufficient.

---

## Sub-Task 3 — Frontend API Reliability

**Status:** [ ] pending

### Intent

The frontend has four confirmed problems in its data-loading logic:

1. `/api/forecast` is fetched twice (as `forecasts` and `forecastDashboard`), wasting a
   round-trip.
2. There is no fetch timeout — a hung backend stalls the loading state indefinitely.
3. Fetch failures are swallowed as empty arrays `[]`, indistinguishable from a valid empty
   response.
4. The `API_BASE` constant is hardcoded to `http://127.0.0.1:8000/api` in source — it must
   be changed in code for any deployment.

This sub-task fixes all four without changing visual design or splitting `App.jsx`.

### Expected Outcomes

- `API_BASE` is read from `import.meta.env.VITE_API_BASE` with a localhost fallback.
- A `.env.example` file is created at the project root of the `dashboard/` directory.
- The duplicate `/forecast` entry is removed from the endpoints array; `data.forecasts` is
  reused as `data.forecastDashboard`.
- Every `fetch()` call includes `signal: AbortSignal.timeout(10_000)`.
- Failed or timed-out fetches store `{ _error: true }` instead of `[]`, so the render layer
  can distinguish a genuine empty dataset from a failed load.
- When the overall data load results in any `_error` entry for a **required** key, an
  `apiError` state is set to `true`.
- When `apiError` is true, the dashboard renders a visible error screen instead of the
  loading screen or the main dashboard, telling the user that the API is unavailable.
- When the API works normally, behaviour is **completely unchanged**.

### Decisions Applied

- **Required keys** (trigger `apiError`): `monthly`, `categories`, `wards`, `metrics`,
  `statuses` only. If `forecasts`, `insights`, or any drill-down key fails, those sections
  show an empty/dashed state; the main dashboard remains visible.
- **Retry**: `ApiErrorScreen` includes a Retry button that re-runs the fetch logic.
- **`findMetric()` matching**: Tightened to exact key matching (`item.metric === name`)
  using the confirmed stable keys from `key_metrics.json`: `"total_grievances"`,
  `"closed_rate_percent"`, `"unique_wards"`.

### Todo List

1. Change line 38 of `App.jsx`:
   ```
   const API_BASE = "http://127.0.0.1:8000/api";
   ```
   to:
   ```
   const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";
   ```

2. Add `const [apiError, setApiError] = useState(false);` alongside the existing `useState`
   declarations.

3. In the `endpoints` array inside `useEffect`, remove the duplicate entry:
   ```
   ["forecastDashboard", "/forecast"],
   ```
   After `Promise.all` resolves, when building the merged object for `setData`, add
   `forecastDashboard: results.find(([k]) => k === "forecasts")?.[1] ?? []` so the key is
   still populated from the same data.

4. Add `signal: AbortSignal.timeout(10_000)` to the `fetch()` call inside the `map`
   callback.

5. In the `catch` block, return `[key, { _error: true }]` instead of `[key, []]`.

6. After `setData(...)`, check the five required keys. If any of
   `monthly`, `categories`, `wards`, `metrics`, `statuses` resolves to
   `{ _error: true }`, call `setApiError(true)`. Non-required keys
   (`forecasts`, `insights`, drill-down keys) are not checked here — their `_error` objects
   will simply produce empty/dashed states in their respective sections.

7. In the `App()` render, add an `apiError` check immediately after the existing
   `if (loading) return <LoadingScreen />;` guard:
   ```
   if (apiError) return <ApiErrorScreen onRetry={handleRetry} />;
   ```

8. Extract the fetch logic from `useEffect` into a named function `loadData()` at the top
   of `App()`. The `useEffect` simply calls `loadData()` on mount. The Retry button calls
   `loadData()` directly: it resets `loading` to `true` and `apiError` to `false` before
   re-running the fetches.

9. Implement `ApiErrorScreen({ onRetry })` as a new function component at the bottom of
   `App.jsx`, styled consistently with `LoadingScreen` (same dark background, centred
   layout, same font stack). It shows a brief message stating the API is unreachable and
   how to start the backend, plus a Retry button that calls `onRetry`. No file split.

10. Create `dashboard/.env.example`:
    ```
    VITE_API_BASE=http://127.0.0.1:8000/api
    ```

### Relevant Context

- `App.jsx` line 38: `API_BASE` constant.
- `App.jsx` lines 61, 63: existing `useState` declarations.
- `App.jsx` lines 67–127: `useEffect` with `endpoints` array and `Promise.all`.
- `App.jsx` line 83: the duplicate `["forecastDashboard", "/forecast"]` entry.
- `App.jsx` lines 168–170: the `if (loading)` guard — `apiError` guard goes immediately
  after.
- `App.jsx` lines 2021–2054: `LoadingScreen` — use as visual reference for `ApiErrorScreen`.
- `App.jsx` line 582: `forecast={data.forecastDashboard}` prop on `ForecastIntelligence`
  — this still works because `forecastDashboard` is still set on the state object.

---

## Sub-Task 4 — Remove Silent Fallbacks and Add Data Freshness

**Status:** [ ] pending

### Intent

Two categories of silent fallback exist:

**A — Metric fallbacks in `useMemo`** (lines 149–151): when `findMetric()` returns
`undefined`, the `||` operator falls through to hardcoded values (`126974`, `86.17`, `199`).
The user sees these as live data with no indication that the API lookup failed.

**B — `ForecastIntelligence` fallbacks** (lines 1441–1466): the component uses `||`
fallbacks for MAE, RMSE, and forecast summary values. These are static model-evaluation
numbers that are also stored in `forecast_evaluation.json` and `forecast_summary.json` — so
when the API is healthy the fallbacks are numerically identical and harmless. When the API
fails, however, the component silently shows stale evaluation numbers.

**C — `buildInsights` hardcoded fallbacks** (lines 1922, 1932): when the `Electrical` or
`Solid Waste` categories are not found in `data.categories`, the percentages `"33.19"` and
`"30.05"` are used. These are specific to the current dataset and will silently persist if
the pipeline is re-run with different data.

**D — Data freshness**: `dashboard_metadata.json` already contains `date_min` and
`date_max` (the dataset coverage range). It is already written by `notebooks/05_dashboard_data.py`.
Sub-Task 1 adds the `/api/metadata` endpoint. This sub-task adds a fetch for it and renders
a small, non-intrusive freshness indicator in the dashboard footer, using the existing design
language (small muted text, consistent with `sub` prop text in `MetricCard`).

### Expected Outcomes

**Metric fallbacks (A):**
- When `findMetric()` returns `undefined` for any metric, the corresponding `MetricCard`
  displays `"—"` instead of a hardcoded number.
- The `useMemo` for `metrics` returns `null` (or a sentinel `undefined`) for any metric that
  could not be resolved.
- The `MetricCard` `value` prop receives `"—"` for unresolvable metrics rather than a
  number that looks live.

**Forecast fallbacks (B):**
- The `||` fallback values in `ForecastIntelligence` are removed.
- If `evaluation` or `summary` props are `undefined`/null or contain `_error`, the
  component renders `"—"` for each affected metric value rather than a stale hardcoded
  number.

**Insight fallbacks (C):**
- The `"33.19"` and `"30.05"` string fallbacks in `buildInsights` are replaced with `null`.
- When `electrical` or `solidWaste` categories are not found, the corresponding insight card
  either omits the percentage or renders `"data unavailable"` in place of the percentage.
  It does not omit the card entirely (preserving card count layout).

**Data freshness (D):**
- `["metadata", "/metadata"]` is added to the `endpoints` array so
  `data.metadata` is fetched.
- A small footer line is rendered at the very bottom of the `<main>` section (after the
  existing AI Insights section) displaying the dataset date range when available:
  e.g. `Dataset: 1 Jan 2025 – 19 Jun 2025`. When not available, this line is not rendered
  (conditional render on `data.metadata?.date_min`).
- The freshness display requires no new component — it is a single `<p>` or `<div>` element
  added to the JSX return of `App()`.
- The visual style matches the existing muted text treatment (`text-white/40`, `text-xs`).

### Decisions Applied

- **`findMetric()` exact matching**: Change the lookup to `item.metric === name` and update
  call-sites to use the confirmed exact keys: `"total_grievances"`, `"closed_rate_percent"`,
  `"unique_wards"`.
- **Null fallbacks**: Replace all `||` numeric fallbacks with `?? null`; render `"—"` when
  null.

### Todo List

1. **`findMetric()` exact matching**: Change the `findMetric` function body inside `useMemo`
   from `.includes(name.toLowerCase())` to strict equality: `item.metric === name`.
   Update the three call-sites to use exact keys:
   - `findMetric("total")` → `findMetric("total_grievances")`
   - `findMetric("closure")` → `findMetric("closed_rate_percent")`
   - `findMetric("ward")` → `findMetric("unique_wards")`

2. **Metric fallbacks**: Change the `||` fallbacks in `useMemo` to `?? null`:
   - `total: Number(findMetric("total_grievances")) ?? null`
   - `closure: Number(findMetric("closed_rate_percent")) ?? null`
   - `wards: Number(findMetric("unique_wards")) ?? null`

2. Update the three `MetricCard` value props to render `"—"` when the metric is null:
   - `value={formatNumber(totalGrievances)}` → `value={totalGrievances != null ? formatNumber(totalGrievances) : "—"}`
   - `value={`${closureRate.toFixed(2)}%`}` → `value={closureRate != null ? `${closureRate.toFixed(2)}%` : "—"}`
   - `value={formatNumber(wardCount)}` → `value={wardCount != null ? formatNumber(wardCount) : "—"}`

3. Update the `Hero` component call at line 192:
   - `forecast={1141}` → `forecast={data.forecastSummary?.forecast_average ?? null}`
   - In the `Hero` component body, display `"—"` if forecast is null.

4. Update `MetricCard` at line 227 (FORECAST / DAY):
   - `value="1,141"` → `value={data.forecastSummary?.forecast_average != null ? formatNumber(data.forecastSummary.forecast_average) : "—"}`

5. **ForecastIntelligence fallbacks**: Remove all `||` fallback numeric values inside the
   component (lines 1441–1466). Replace with `?? null`. Update every place those variables
   are rendered to show `"—"` when null (e.g., `{modelMAE != null ? modelMAE.toFixed(2) : "—"}`).

6. **buildInsights fallbacks**: Replace `? "33.19"` and `? "30.05"` with `? null`. In the
   insight body strings that use `electricalShare` and `wasteShare`, conditionally render
   the percentage or the string `"data unavailable"`.

7. **Metadata fetch**: Add `["metadata", "/metadata"]` to the `endpoints` array in
   `useEffect`. The metadata endpoint does not affect the `apiError` check (it is not a
   required key).

8. **Freshness footer**: After the closing `</section>` of the AI Insights section (around
   line 617), add a conditional footer element:
   ```jsx
   {data.metadata?.date_min && (
     <p className="mt-8 text-center text-xs text-white/30">
       Dataset: {new Date(data.metadata.date_min).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"})}
       {" – "}
       {new Date(data.metadata.date_max).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"})}
     </p>
   )}
   ```

### Relevant Context

- `App.jsx` lines 149–151: metric useMemo fallbacks.
- `App.jsx` lines 200–230: MetricCard value props.
- `App.jsx` line 192: `forecast={1141}` hardcoded in Hero props.
- `App.jsx` line 227: `value="1,141"` hardcoded in FORECAST/DAY MetricCard.
- `App.jsx` lines 1441–1466: ForecastIntelligence numeric fallbacks.
- `App.jsx` lines 1922, 1932: buildInsights string fallbacks.
- `dashboard/public/data/dashboard_metadata.json`:
  `{"total_records":126974,"categories":31,"subcategories":179,"wards":199,"statuses":7,"date_min":"2025-01-01","date_max":"2025-06-19"}`

---

## Sub-Task 5 — Testing

**Status:** [ ] pending

### Intent

There are zero tests in the project. A minimal pytest suite for the FastAPI backend provides
a regression net that catches the most impactful failures:
- The backend is reachable and healthy.
- Each analytics endpoint returns a non-error 200 with an array or object body.
- Each forecast endpoint returns the expected shape.
- Missing files return HTTP 404 (confirming Sub-Task 1 behaviour).

The test suite must require no external services, no paid APIs, and must run against the
real JSON files already present in `dashboard/public/data/`.

### Expected Outcomes

- `backend/tests/__init__.py` exists (empty).
- `backend/tests/test_api.py` contains a test class with tests for all categories listed
  below.
- Running `pytest backend/tests/` from project root passes without error when the JSON
  data files are present.
- A `requirements-dev.txt` at the project root lists the test dependencies.
- No test requires a running external server — tests use the ASGI `TestClient` from
  `httpx`, which calls the FastAPI app in-process.

### Todo List

1. Create `requirements-dev.txt` in the project root:
   ```
   pytest>=8.0
   httpx>=0.28
   ```
   (`httpx` is already in `requirements.txt` so only `pytest` is a new dependency.)

2. Create `backend/tests/__init__.py` (empty file).

3. Create `backend/tests/test_api.py` with the following test coverage:

   **Health / root:**
   - `test_root_returns_200`: GET `/` returns 200 and body contains `"name"` key.
   - `test_health_returns_healthy`: GET `/api/health` returns 200 and `status == "healthy"`.

   **Analytics endpoints (representative sample — not every endpoint, but one per group):**
   - `test_summary_returns_list`: GET `/api/summary` returns 200 and response is a list.
   - `test_categories_returns_list`: GET `/api/categories` returns 200 and response is a list.
   - `test_wards_returns_list`: GET `/api/wards` returns 200 and response is a list.
   - `test_monthly_returns_list`: GET `/api/monthly` returns 200 and response is a list.
   - `test_status_returns_list`: GET `/api/status` returns 200 and response is a list.
   - `test_insights_returns_list`: GET `/api/insights` returns 200 and response is a list.
   - `test_metadata_returns_object`: GET `/api/metadata` returns 200 and response contains
     `"total_records"` key.

   **Category drill-down endpoints:**
   - `test_category_subcategories_returns_list`
   - `test_category_wards_returns_list`
   - `test_category_monthly_returns_list`
   - `test_category_status_returns_list`

   **Forecast endpoints:**
   - `test_forecast_returns_list`: GET `/api/forecast` returns 200 and response is a list.
   - `test_forecast_evaluation_has_model_mae`: GET `/api/forecast/evaluation` returns 200
     and `"model_mae"` key exists in response.
   - `test_forecast_summary_has_horizon`: GET `/api/forecast/summary` returns 200 and
     `"horizon_days"` key exists in response.

   **Error behaviour (confirming Sub-Task 1):**
   - `test_missing_file_returns_404`: Temporarily monkeypatches `DATA_DIR` to a non-existent
     path, calls any data endpoint, asserts HTTP 404. Restores `DATA_DIR` after the test
     using a `pytest` fixture.

4. Use `httpx.Client(app=app, base_url="http://test")` or `starlette.testclient.TestClient`
   as the in-process test transport. Import `app` from `backend.main`.

### Relevant Context

- `backend/main.py`: `app` is the FastAPI instance; `DATA_DIR` is a module-level `Path`.
- `requirements.txt` line 28: `httpx==0.28.1` — already available; only `pytest` is new.
- `dashboard/public/data/` — all JSON files exist and must be reachable from the test
  runner's working directory. Tests should be run from the project root so relative paths
  resolve correctly.
- The monkeypatch test for 404 should patch `backend.main.DATA_DIR` using `pytest`'s
  `monkeypatch` fixture.

---

## Sub-Task 6 — Documentation

**Status:** [ ] pending

### Intent

The project has no README and no developer-facing documentation. This sub-task creates
`README.md` at the project root covering all material listed in the task requirement.

The document must be accurate (grounded in the actual code read during the audit), not
aspirational. Every architectural statement should match what the code actually does.

### Expected Outcomes

- `README.md` exists at the project root.
- It covers: project objective, architecture, analytics pipeline, forecasting methodology,
  API reference, testing, security, limitations, and setup/execution.
- It is written in clean Markdown, readable on GitHub.
- It does not claim features that are not implemented (no authentication, no database,
  no live retraining).

### Todo List

Write `README.md` with the following sections (headings and brief descriptions follow):

1. **CivicSense — Urban Grievance Intelligence Platform**
   One-paragraph description of what the project is, what data it uses (BBMP 2025
   Bangalore grievance dataset), and what it produces (interactive dashboard with
   analytical drill-downs and 14-day forecast).

2. **Architecture**
   Three-layer description:
   - Python analytics pipeline (`notebooks/`)
   - FastAPI read-only JSON API (`backend/`)
   - React single-page dashboard (`dashboard/`)
   Note that the pipeline produces static JSON files that the API serves; there is no
   database.

3. **Analytics Pipeline**
   Ordered table of notebooks with input, output, and purpose for each:
   `01_data_cleaning`, `02_eda`, `03_predictive_analytics`, `03b_category_forecasting`,
   `04_ai_insights`, `05_dashboard_data`, `05_forecast_dashboard_data`.
   Note the strict execution order.

4. **Forecasting Methodology**
   Describe the `HistGradientBoostingRegressor` model, the 18 engineered features (lag,
   rolling averages, sin/cos cyclical encodings), the 80/20 chronological split,
   `TimeSeriesSplit` cross-validation, the 7-day seasonal-naive baseline, the recursive
   14-day forecast generation, and the current evaluation results (MAE 181.42 vs baseline
   202.93; R² −0.0831). Include the model's own interpretation from
   `forecast_evaluation.json`: forecasts are planning signals, not guaranteed outcomes.

5. **API Reference**
   Table of all endpoints: method, path, response type, source file. Include the new
   `/api/metadata` endpoint added in Sub-Task 1.

6. **Setup and Execution**
   - Prerequisites (Python ≥ 3.10, Node.js ≥ 18)
   - Create and activate virtual environment (`.venv`)
   - Install Python dependencies: `pip install -r requirements.txt`
   - Run the analytics pipeline in order
   - Start the backend: `uvicorn backend.main:app --reload`
   - Install frontend dependencies: `cd dashboard && npm install`
   - Configure frontend env: copy `.env.example` to `.env` if needed
   - Start the dev server: `npm run dev`

7. **Testing**
   - Install dev dependencies: `pip install -r requirements-dev.txt`
   - Run tests: `pytest backend/tests/`
   - Brief note on what is covered.

8. **Security**
   - CORS is open for local/demo use; restrict `allow_origins` if deploying publicly.
   - No authentication; the data is read-only civic statistics (no PII).
   - No path traversal risk (all filenames are hardcoded in route functions).

9. **Limitations**
   - Forecast dates in `forecast_dashboard.json` are static; they reflect the period when
     the pipeline was last run, not today's date.
   - The model R² is negative on the test set — forecasts are planning-level signals only.
   - The dashboard fetches all data on mount with no caching; refreshing always re-fetches.
   - There is no live data ingestion; the dataset covers BBMP 2025 up to 2025-06-19.

### Relevant Context

- All numerical values must match the audit findings, not be invented.
- API endpoint list from Sub-Task 1 (includes `/api/metadata`).
- `forecast_evaluation.json` interpretation field: exact text available from the audit.
- `dashboard_metadata.json` `date_max: "2025-06-19"` — use as the dataset currency date.

---

## Execution Order

Sub-tasks are ordered by dependency:

```
Sub-Task 1 (FastAPI reliability)  ←  foundation for Sub-Task 5 test
       ↓
Sub-Task 2 (CORS fix)             ←  independent, small
       ↓
Sub-Task 3 (Frontend reliability) ←  requires Sub-Task 1 (404 responses now meaningful)
       ↓
Sub-Task 4 (Fallbacks + freshness)←  requires Sub-Task 1 (/api/metadata endpoint)
                                      and Sub-Task 3 (endpoints array updated)
       ↓
Sub-Task 5 (Tests)                ←  requires Sub-Task 1 (404 behaviour to test)
       ↓
Sub-Task 6 (Documentation)        ←  documents final state; written last
```

Sub-Tasks 2 and 3 may be executed simultaneously since they touch different files
(`main.py` and `App.jsx` respectively). Sub-Task 4 must come after Sub-Task 3 because it
modifies the same section of `App.jsx`.

---

## Risk Register

| Risk | Sub-Task | Mitigation |
|------|----------|------------|
| 404 from missing JSON breaks existing UI before Sub-Task 3 lands | 1 | Execute Sub-Tasks 1 and 3 in the same session; keep backend offline between sub-tasks if needed |
| Removing metric fallbacks shows "—" for valid data if metric names changed | 4 | `findMetric()` uses `.includes()` matching — "total" matches "total_grievances"; "closure" matches "closed_rate_percent"; "ward" matches "unique_wards". All confirmed against actual `key_metrics.json`. No breakage expected. |
| `data.forecastDashboard` undefined after removing duplicate fetch | 3 | Explicitly set `forecastDashboard` from `forecasts` result in the `setData` call — same value, zero render change |
| `AbortSignal.timeout` browser compatibility | 3 | Supported in all modern browsers (Chrome 103+, Firefox 100+, Safari 16+); acceptable for a civic analytics demo |
| Tests fail if run without pipeline artifacts | 5 | All JSON files are already present in `dashboard/public/data/`; note in README that tests require pipeline to have been run at least once |

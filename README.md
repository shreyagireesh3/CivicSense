# CivicSense

Urban grievance intelligence and forecasting platform for Bangalore's BBMP (Bruhat Bengaluru Mahanagara Palike) civic grievance data. CivicSense transforms raw complaint records into structured analytical intelligence — category concentration, ward-level demand patterns, operational status tracking, and a 14-day planning forecast — served through a React dashboard backed by a lightweight FastAPI layer.

---

## Architecture

CivicSense has three layers, each with a clearly bounded responsibility:

```
notebooks/          Python analytics pipeline — runs once, produces all data artifacts
backend/main.py     FastAPI — reads pre-computed JSON files; no database, no writes
dashboard/          React SPA — fetches from FastAPI on mount; single file (App.jsx)
```

The pipeline and the dashboard are fully decoupled through static JSON files in `dashboard/public/data/`. The backend adds no computation — it reads a file and returns it.

---

## Analytics Pipeline

Notebooks are plain Python scripts. They must be run **in the order shown below**; each stage depends on the outputs of the previous one.

| Step | Script | Input | Key Outputs |
|------|--------|-------|-------------|
| 1 | `01_data_cleaning.py` | `data/raw/bbmp_grievances_2025_raw.csv` | `data/processed/bbmp_grievances_2025_cleaned.csv`, `reports/missing_values_*.csv` |
| 2 | `02_eda.py` | cleaned CSV | `reports/category_summary.csv`, `reports/ward_summary.csv`, `reports/key_metrics.csv`, `reports/status_summary.csv`, `reports/monthly_summary.csv`, `assets/*.png` |
| 3 | `03_predictive_analytics.py` | cleaned CSV | `models/civicsense_grievance_forecaster_v2.joblib`, `reports/14_day_grievance_forecast.csv`, `reports/forecast_feature_importance.csv` |
| 3b | `03b_category_forecasting.py` | cleaned CSV | `models/forecast_*.joblib` (per category), `reports/validated_category_forecasts.csv` |
| 4 | `04_ai_insights.py` | `reports/*.csv` | `reports/civicsense_insight_engine.csv`, `reports/civicsense_ai_insights.md` |
| 5a | `05_dashboard_data.py` | cleaned CSV | `dashboard/public/data/category_*.json`, `dashboard/public/data/ward_*.json`, `dashboard/public/data/monthly_detailed.json`, `dashboard/public/data/dashboard_metadata.json` |
| 5b | `05_forecast_dashboard_data.py` | (static values from step 3) | `dashboard/public/data/forecast_dashboard.json`, `dashboard/public/data/forecast_evaluation.json`, `dashboard/public/data/forecast_summary.json` |

Run from the project root:

```bash
python notebooks/01_data_cleaning.py
python notebooks/02_eda.py
python notebooks/03_predictive_analytics.py
python notebooks/03b_category_forecasting.py
python notebooks/04_ai_insights.py
python notebooks/05_dashboard_data.py
python notebooks/05_forecast_dashboard_data.py
```

---

## Forecasting Methodology

The overall grievance forecast uses a `HistGradientBoostingRegressor` (scikit-learn) trained on a daily time series of total complaint volume.

**Feature engineering** (18 features):
- `trend` — integer sequence from 0 to N
- `dow_sin`, `dow_cos` — weekly seasonality encoded as sine and cosine
- `doy_sin`, `doy_cos` — annual seasonality encoded as sine and cosine
- `lag_1`, `lag_2`, `lag_3`, `lag_7`, `lag_14`, `lag_21`, `lag_28` — past observed values
- `rolling_7`, `rolling_14`, `rolling_28` — rolling averages

**Model configuration:** `learning_rate=0.05`, `max_iter=300`, `max_leaf_nodes=8`, `min_samples_leaf=5`, `l2_regularization=5`, `random_state=42`

**Validation:** 80/20 chronological train/test split; 4-fold `TimeSeriesSplit` cross-validation. Baseline is a 7-day seasonal-naive forecast (lag-7).

**Evaluation results (current run):**

| Metric | Model | Baseline |
|--------|-------|----------|
| MAE | 181.42 | 202.93 |
| RMSE | 224.21 | 248.97 |
| R² | −0.083 | −0.335 |
| MAE improvement | +10.6% | — |

The negative R² indicates the model has not captured the full underlying variance. **Forecasts are planning signals, not guaranteed outcomes.** This interpretation is included in `forecast_evaluation.json`.

**14-day forecast generation:** Recursive prediction — the model predicts one day at a time, appends the result to the history, and re-derives features for the next step. Predictions are clipped to ≥ 0.

Per-category models (`03b_category_forecasting.py`) are trained independently for the top 5 categories. A model is saved only if it beats the 7-day baseline on the held-out test set.

---

## API Reference

Base URL: `http://127.0.0.1:8000` (configurable via `VITE_API_BASE` in the frontend)

All data endpoints return HTTP 200 with the JSON body when the source file exists. They return HTTP 404 with `{"detail": "<filename> not found"}` when the source file is absent.

| Method | Path | Response type | Source file |
|--------|------|---------------|-------------|
| GET | `/` | Object | — |
| GET | `/api/health` | Object | — |
| GET | `/api/summary` | Array | `key_metrics.json` |
| GET | `/api/categories` | Array | `category_summary.json` |
| GET | `/api/wards` | Array | `ward_summary.json` |
| GET | `/api/status` | Array | `status_summary.json` |
| GET | `/api/monthly` | Array | `monthly_summary.json` |
| GET | `/api/insights` | Array | `civicsense_insight_engine.json` |
| GET | `/api/metadata` | Object | `dashboard_metadata.json` |
| GET | `/api/forecast` | Array | `forecast_dashboard.json` |
| GET | `/api/forecast/evaluation` | Object | `forecast_evaluation.json` |
| GET | `/api/forecast/summary` | Object | `forecast_summary.json` |
| GET | `/api/category/subcategories` | Array | `category_subcategory.json` |
| GET | `/api/category/wards` | Array | `category_ward.json` |
| GET | `/api/category/monthly` | Array | `category_month.json` |
| GET | `/api/category/status` | Array | `category_status.json` |

---

## Setup and Execution

### Prerequisites

- Python ≥ 3.10
- Node.js ≥ 18

### Backend

```bash
# Create and activate virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the analytics pipeline (once, in order)
python notebooks/01_data_cleaning.py
python notebooks/02_eda.py
python notebooks/03_predictive_analytics.py
python notebooks/03b_category_forecasting.py
python notebooks/04_ai_insights.py
python notebooks/05_dashboard_data.py
python notebooks/05_forecast_dashboard_data.py

# Start the API
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd dashboard
npm install

# Optional: copy .env.example to .env if you need a different API URL
cp .env.example .env

npm run dev
```

The dashboard is served at `http://localhost:5173` by default. It expects the backend at `http://127.0.0.1:8000/api` (or the value of `VITE_API_BASE` in `dashboard/.env`).

---

## Testing

Tests cover all API endpoints and the HTTP 404 error behaviour using FastAPI's in-process `TestClient` — no live server is required.

### Install test dependencies

```bash
pip install -r requirements-dev.txt
```

(`pytest` and `httpx2` are the only additions — `httpx` is already in `requirements.txt`.)

### Run tests

```bash
pytest backend/tests/
```

### Coverage

| Group | Tests |
|-------|-------|
| Health / root | `test_root_returns_200`, `test_health_returns_healthy` |
| Analytics | `test_summary_returns_list`, `test_categories_returns_list`, `test_wards_returns_list`, `test_monthly_returns_list`, `test_status_returns_list`, `test_insights_returns_list`, `test_metadata_returns_object` |
| Category drill-down | `test_category_subcategories_returns_list`, `test_category_wards_returns_list`, `test_category_monthly_returns_list`, `test_category_status_returns_list` |
| Forecast | `test_forecast_returns_list`, `test_forecast_evaluation_has_model_mae`, `test_forecast_summary_has_horizon` |
| Error behaviour | `test_missing_file_returns_404` |

Tests require the pipeline artifacts to be present in `dashboard/public/data/`. Run the pipeline at least once before running the test suite.

---

## Security

- **CORS:** The backend allows requests from any origin (`allow_origins=["*"]`). Credentials are not allowed. If you deploy the dashboard to a specific domain, restrict `allow_origins` to that domain in `backend/main.py`.
- **Authentication:** None. The API serves read-only civic statistics. There is no PII in the dataset.
- **Path traversal:** Not possible. All filenames are hardcoded in route functions; no user input reaches `load_json()`.

---

## Limitations

1. **Forecast dates are static.** `dashboard/public/data/forecast_dashboard.json` contains hardcoded date strings written when the pipeline was last run. The forecast panel always shows those specific dates regardless of the current date. To update the forecast, re-run `notebooks/05_forecast_dashboard_data.py` with updated date values.

2. **Negative model R².** The forecasting model has an R² of −0.083 on the test set. The MAE improvement over the naive baseline (10.6%) is meaningful, but the model does not explain underlying variance well. Use the forecast as a directional planning signal only.

3. **No live data ingestion.** The dataset covers BBMP grievances from 2025-01-01 to 2025-06-19. There is no automated pipeline to ingest new records.

4. **No data caching.** The dashboard fetches all API endpoints on mount. There is no cache-control header on responses and no client-side cache; each page load re-reads all JSON files from disk.

5. **Single-file frontend.** All React components are intentionally in `dashboard/src/App.jsx`. There is no routing library. All sections are rendered on a single page.

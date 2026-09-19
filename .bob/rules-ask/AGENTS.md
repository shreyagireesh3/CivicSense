# Project Documentation Context (Non-Obvious Only)

- `notebooks/` contains plain `.py` scripts run top-to-bottom, not Jupyter `.ipynb` files — despite being named "notebooks".
- The "backend" (`backend/main.py`) is a thin JSON file server for analytics; all business logic lives in the notebook pipeline. The exception is `backend/desk.py` — a real SQLite write layer for the Service Desk feature.
- `dashboard/public/data/` is the contract between the Python pipeline and the React frontend. 14 pre-generated JSON files. If any required one is missing, `ApiErrorScreen` is shown (not silent fallback).
- `reports/` contains CSV analytical outputs (human-readable). `dashboard/public/data/` contains JSON for the UI. Same notebooks generate both, but they're separate outputs.
- `models/` holds `.joblib` scikit-learn model files. The forecast pipeline has two model versions (`v2` and `forecast_forest`).
- The dataset domain is BBMP (Bruhat Bengaluru Mahanagara Palike) — Bangalore, India. Ward names and category names are in that geographic/administrative context.
- **The raw CSV is currently a header-only stub** (`data/raw/bbmp_grievances_2025_raw.csv`, 78 bytes). `category_subcategory.json` and `category_month.json` are empty arrays `[]` as a result — drill-down views show "No data available".
- API quirk: `/api/summary` returns a list of `{metric, value}` objects, not a flat object. Access via `rows.find(r => r.metric === "total_grievances")?.value`.
- The `forecastDashboard` state key holds `/forecast` data (renamed in the fetch map). The API data key is `forecasts`, mapped to `forecastDashboard` in state.
- Service Desk tickets use format `CS-YYYY-NNNN` (e.g. `CS-2025-0001`). The sequence counter is derived from `COUNT(*)` of that year's tickets, not a sequence table.

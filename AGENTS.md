# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

CivicSense is an urban grievance intelligence platform for Bangalore (BBMP) data. Three layers:
1. **Python pipeline** (`notebooks/`) — sequential `.py` scripts (not Jupyter) run in order to produce data artifacts
2. **FastAPI backend** (`backend/main.py`) — serves pre-computed JSON from `dashboard/public/data/`; also has a SQLite Service Desk router (`backend/desk.py`)
3. **React dashboard** (`dashboard/`) — single-file SPA (`App.jsx`) consuming the FastAPI backend

## Commands

### Backend (run from project root with `.venv-1` active — `.venv` lacks FastAPI)
```bash
.venv-1/Scripts/activate
uvicorn backend.main:app --reload
```

### Tests
```bash
# All backend tests (29 total: 17 analytics + 12 desk)
.venv-1/Scripts/python.exe -m pytest backend/tests/ -v

# Single test
.venv-1/Scripts/python.exe -m pytest backend/tests/test_api.py::test_summary_returns_list -v
.venv-1/Scripts/python.exe -m pytest backend/tests/test_desk.py::test_create_ticket_returns_ticket_id -v
```

### Dashboard (must run from `dashboard/` directory)
```bash
cd dashboard
npm run dev       # dev server (Vite)
npm run build     # production build
npm run lint      # oxlint — 0 warnings, 0 errors required
```

### Python notebooks (run in order from project root)
```bash
python notebooks/01_data_cleaning.py
python notebooks/02_eda.py
python notebooks/03_predictive_analytics.py
python notebooks/03b_category_forecasting.py
python notebooks/04_ai_insights.py
python notebooks/05_dashboard_data.py
python notebooks/05_forecast_dashboard_data.py
```

## Critical Architecture Facts

- **Two venvs**: `.venv-1` has FastAPI/pytest and is correct for backend. `.venv` does NOT have FastAPI.
- The analytics backend **only reads static JSON** from `dashboard/public/data/`. The Service Desk backend (`/api/desk/*`) uses SQLite at `data/desk.db` (auto-created).
- Pipeline input: `data/raw/bbmp_grievances_2025_raw.csv` → cleaned CSV → feeds all downstream notebooks. **The current raw CSV is a header-only stub** — `category_subcategory.json` and `category_month.json` are empty arrays until re-populated.
- Dashboard fetches all 14 analytics API endpoints in parallel via `Promise.all` on mount. No lazy loading.
- **API field names**: Top-level `/api/categories`, `/api/wards`, `/api/monthly`, `/api/status` use `complaints` (not `count`). Drill-down endpoints (`/api/categories/{cat}/subcategories`, etc.) use `count`. Both are strings — coerce with `Number()`.
- `/api/summary` returns a list of `{metric, value}` objects. Access via `.find(r => r.metric === "total_grievances")?.value`.
- Graceful error handling: failed endpoints return `{ _error: true }` sentinel. Required endpoints failing triggers `ApiErrorScreen`.

## Code Style

### JavaScript / React
- **Single file**: ALL components in `dashboard/src/App.jsx` — never split into separate component files
- **No TypeScript**: plain `.jsx`. No `tsconfig.json`. Never create one.
- **Tailwind v4** via `@tailwindcss/vite` plugin. No `tailwind.config.js` — creating one breaks the build.
- **Linter**: oxlint (not ESLint). Config: `dashboard/.oxlintrc.json`. `react/set-state-in-effect` is disabled.
- Import order: React hooks → lucide-react → recharts → (no local imports needed in single-file architecture)
- Null display pattern: `value != null ? formatNumber(value) : "—"` — never use hardcoded numeric fallbacks
- Color palette constants at top of `App.jsx`: `PASTELS`, `INSIGHT_ACCENT_COLORS`, `STATUS_PIE_COLORS`, `CATEGORY_BAR_COLORS` — use these, never inline hex for chart elements

### Python
- `Path(__file__).resolve().parent.parent` used in every notebook to derive `PROJECT_ROOT` — follow this pattern
- No formatter config; follow existing style (4-space indent, standard library first)
- Test client uses `httpx` (not `requests`); `conftest.py` at project root adds root to `sys.path`
- Desk tests use `tmp_path` + `monkeypatch` to override `DB_PATH` — all desk tests are fully isolated

from pathlib import Path
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.desk import router as desk_router, init_db


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "dashboard" / "public" / "data"


app = FastAPI(
    title="CivicSense API",
    description="Urban grievance intelligence and forecasting API",
    version="1.0.0",
)

app.include_router(desk_router)
init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_json(filename: str):
    path = DATA_DIR / filename

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"{filename} not found",
        )

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


@app.get("/")
def root():
    return {
        "name": "CivicSense API",
        "version": "1.0.0",
        "status": "online",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "civicsense-api",
    }


@app.get("/api/summary")
def summary():
    return load_json("key_metrics.json")


@app.get("/api/categories")
def categories():
    return load_json("category_summary.json")


@app.get("/api/wards")
def wards():
    return load_json("ward_summary.json")


@app.get("/api/status")
def status():
    return load_json("status_summary.json")


@app.get("/api/monthly")
def monthly():
    return load_json("monthly_summary.json")


@app.get("/api/forecast")
def forecast():
    return load_json("forecast_dashboard.json")


@app.get("/api/forecast/evaluation")
def forecast_evaluation():
    return load_json("forecast_evaluation.json")


@app.get("/api/forecast/summary")
def forecast_summary():
    return load_json("forecast_summary.json")


@app.get("/api/insights")
def insights():
    return load_json("civicsense_insight_engine.json")


@app.get("/api/category/subcategories")
def category_subcategories():
    return load_json("category_subcategory.json")


@app.get("/api/category/wards")
def category_wards():
    return load_json("category_ward.json")


@app.get("/api/category/monthly")
def category_monthly():
    return load_json("category_month.json")


@app.get("/api/category/status")
def category_status():
    return load_json("category_status.json")


@app.get("/api/metadata")
def metadata():
    return load_json("dashboard_metadata.json")

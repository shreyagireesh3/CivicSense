"""
CivicSense FastAPI test suite.

Uses FastAPI's synchronous TestClient — no async test runner required.
Execute from the project root:

    .venv-1\\Scripts\\pytest backend/tests/

Dependencies (install once):
    pip install pytest httpx2
"""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.main import app


# ---------------------------------------------------------------------------
# Shared synchronous client fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Health / root
# ---------------------------------------------------------------------------

def test_root_returns_200(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "name" in response.json()


def test_health_returns_healthy(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# ---------------------------------------------------------------------------
# Analytics endpoints
# ---------------------------------------------------------------------------

def test_summary_returns_list(client):
    response = client.get("/api/summary")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_categories_returns_list(client):
    response = client.get("/api/categories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_wards_returns_list(client):
    response = client.get("/api/wards")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_monthly_returns_list(client):
    response = client.get("/api/monthly")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_status_returns_list(client):
    response = client.get("/api/status")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_insights_returns_list(client):
    response = client.get("/api/insights")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_metadata_returns_object(client):
    response = client.get("/api/metadata")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert "total_records" in body


# ---------------------------------------------------------------------------
# Category drill-down endpoints
# ---------------------------------------------------------------------------

def test_category_subcategories_returns_list(client):
    response = client.get("/api/category/subcategories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_category_wards_returns_list(client):
    response = client.get("/api/category/wards")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_category_monthly_returns_list(client):
    response = client.get("/api/category/monthly")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_category_status_returns_list(client):
    response = client.get("/api/category/status")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# ---------------------------------------------------------------------------
# Forecast endpoints
# ---------------------------------------------------------------------------

def test_forecast_returns_list(client):
    response = client.get("/api/forecast")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_forecast_evaluation_has_model_mae(client):
    response = client.get("/api/forecast/evaluation")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert "model_mae" in body


def test_forecast_summary_has_horizon(client):
    response = client.get("/api/forecast/summary")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert "horizon_days" in body


# ---------------------------------------------------------------------------
# Missing-file returns HTTP 404 (confirms Sub-Task 1 behaviour)
# ---------------------------------------------------------------------------

def test_missing_file_returns_404(monkeypatch):
    """
    Redirect DATA_DIR to a non-existent path so every load_json() call
    raises HTTPException(404). Uses monkeypatch to restore after the test.
    """
    import backend.main as main_module

    monkeypatch.setattr(
        main_module,
        "DATA_DIR",
        Path("/nonexistent/path/that/does/not/exist"),
    )

    with TestClient(app) as c:
        response = c.get("/api/summary")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

"""
CivicSense v2.0 — Extended Service Desk tests.

Covers:
- Citizen complaint persistence (Feature 1)
- Officer updates (Feature 1)
- Data Hub stats (Feature 2)
- Export all records (Feature 2)
- Export date range (Feature 2)
- CSV schema validation (Feature 3)
- Valid CSV import (Feature 3)
- Invalid CSV rejection (Feature 3)
- Dataset profile (Feature 4)
- Empty dataset handling (Feature 4)
- Missing required columns (Feature 3)
- Duplicate handling (Feature 3)
"""
import io
import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """
    Isolated database + no loaded_dataset.json side-effects per test.
    """
    import backend.desk as desk_module
    monkeypatch.setattr(desk_module, "DB_PATH", tmp_path / "desk_test.db")
    monkeypatch.setattr(desk_module, "LOADED_DATASET_PATH", tmp_path / "loaded_dataset.json")
    desk_module.init_db()
    with TestClient(app) as c:
        yield c


# ===========================================================================
# Feature 1 — Citizen complaint persistence
# ===========================================================================

def test_create_ticket_returns_ticket_id(client):
    resp = client.post("/api/desk/tickets", json={
        "category":    "Electrical",
        "subcategory": "Street Light Not Working",
        "description": "Light near bus stop not working for 3 days.",
        "ward":        "Horamavu",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "Received"
    assert body["ticket_id"].startswith("CS-")
    assert "created_at" in body


def test_create_ticket_persisted_in_db(client):
    """Ticket created via citizen portal must appear in the officer list."""
    client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Pothole", "ward": "Koramangala",
    })
    resp = client.get("/api/desk/tickets")
    assert resp.status_code == 200
    tickets = resp.json()
    assert len(tickets) == 1
    assert tickets[0]["category"] == "Roads"


def test_create_ticket_id_increments(client):
    r1 = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Pothole", "ward": "Koramangala",
    })
    r2 = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Broken pavement", "ward": "Whitefield",
    })
    id1 = r1.json()["ticket_id"]
    id2 = r2.json()["ticket_id"]
    assert id1 != id2
    assert int(id2.split("-")[-1]) > int(id1.split("-")[-1])


def test_create_ticket_missing_required_fields(client):
    resp = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Pothole",
    })
    assert resp.status_code == 422


def test_citizen_sees_ticket_after_submit(client):
    """Citizen can look up the ticket they just submitted."""
    resp = client.post("/api/desk/tickets", json={
        "category": "Electrical", "description": "No light", "ward": "Hebbal",
    })
    tid = resp.json()["ticket_id"]
    detail = client.get(f"/api/desk/tickets/{tid}").json()
    assert detail["ticket_id"] == tid
    assert detail["status"] == "Received"
    assert detail["remarks"] == []


# ===========================================================================
# Feature 1 — Officer updates
# ===========================================================================

def test_update_ticket_changes_status(client):
    tid = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Pothole", "ward": "Koramangala",
    }).json()["ticket_id"]
    resp = client.patch(f"/api/desk/tickets/{tid}", json={
        "status": "Under Review", "officer_note": "Assigned to maintenance team.",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "Under Review"


def test_officer_remark_visible_to_citizen(client):
    """After officer updates, citizen tracking shows the remark."""
    tid = client.post("/api/desk/tickets", json={
        "category": "Electrical", "description": "Fault", "ward": "Whitefield",
    }).json()["ticket_id"]
    client.patch(f"/api/desk/tickets/{tid}", json={
        "status": "Action Taken", "officer_note": "Replaced fuse box.",
    })
    tracking = client.get(f"/api/desk/tickets/{tid}").json()
    assert tracking["status"] == "Action Taken"
    assert len(tracking["remarks"]) == 1
    assert tracking["remarks"][0]["officer_note"] == "Replaced fuse box."


def test_update_ticket_with_staff_name(client):
    tid = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Pothole", "ward": "Indiranagar",
    }).json()["ticket_id"]
    resp = client.patch(f"/api/desk/tickets/{tid}", json={
        "status": "Resolved", "officer_note": "Fixed.", "staff_name": "Ravi Kumar",
    })
    assert resp.status_code == 200


def test_update_ticket_invalid_status(client):
    tid = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "X", "ward": "Y",
    }).json()["ticket_id"]
    resp = client.patch(f"/api/desk/tickets/{tid}", json={"status": "INVALID_STATUS"})
    assert resp.status_code == 422


def test_update_ticket_not_found(client):
    resp = client.patch("/api/desk/tickets/CS-0000-9999", json={"status": "Resolved"})
    assert resp.status_code == 404


# ===========================================================================
# Feature 2 — Data Hub stats
# ===========================================================================

def test_hub_stats_empty(client):
    resp = client.get("/api/desk/hub/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_records"] == 0
    assert body["new_today"] == 0
    assert body["new_this_week"] == 0


def test_hub_stats_after_tickets(client):
    client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "A", "ward": "W1",
    })
    client.post("/api/desk/tickets", json={
        "category": "Electrical", "description": "B", "ward": "W2",
    })
    resp = client.get("/api/desk/hub/stats")
    body = resp.json()
    assert body["total_records"] == 2
    assert body["new_today"] == 2
    assert body["latest_data_date"] is not None


# ===========================================================================
# Feature 2 — Export all records
# ===========================================================================

def test_hub_export_all_empty(client):
    resp = client.get("/api/desk/hub/export?period=all")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    lines = resp.text.strip().splitlines()
    # Only header row when no tickets
    assert len(lines) == 1
    assert "Complaint ID" in lines[0]


def test_hub_export_all_with_tickets(client):
    client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Pothole", "ward": "Koramangala",
    })
    resp = client.get("/api/desk/hub/export?period=all")
    assert resp.status_code == 200
    lines = resp.text.strip().splitlines()
    assert len(lines) == 2  # header + 1 data row
    assert "CS-" in lines[1]


def test_hub_export_canonical_schema(client):
    """Exported CSV must have all 8 canonical columns."""
    resp = client.get("/api/desk/hub/export?period=all")
    header = resp.text.strip().splitlines()[0]
    for col in ["Complaint ID", "Category", "Sub Category", "Grievance Date",
                "Ward Name", "Grievance Status", "Staff Remarks", "Staff Name"]:
        assert col in header, f"Missing column: {col}"


# ===========================================================================
# Feature 2 — Export date range
# ===========================================================================

def test_hub_export_date_range(client):
    """Export with explicit date range returns correct attachment header."""
    resp = client.get("/api/desk/hub/export?date_from=2025-01-01&date_to=2025-12-31")
    assert resp.status_code == 200
    assert "content-disposition" in resp.headers
    assert "civicsense_export_custom" in resp.headers["content-disposition"]


def test_hub_export_today(client):
    client.post("/api/desk/tickets", json={
        "category": "Electrical", "description": "Test", "ward": "Test Ward",
    })
    resp = client.get("/api/desk/hub/export?period=today")
    assert resp.status_code == 200
    lines = resp.text.strip().splitlines()
    assert len(lines) == 2


def test_hub_export_week(client):
    resp = client.get("/api/desk/hub/export?period=week")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]


def test_hub_export_month(client):
    resp = client.get("/api/desk/hub/export?period=month")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]


# ===========================================================================
# Feature 3 — CSV schema validation
# ===========================================================================

def _make_csv(header: list[str], rows: list[list[str]] = None) -> bytes:
    buf = io.StringIO()
    import csv as _csv
    writer = _csv.writer(buf)
    writer.writerow(header)
    for row in (rows or []):
        writer.writerow(row)
    return buf.getvalue().encode()


def test_validate_canonical_csv(client):
    """A CSV with canonical column names is fully auto-mapped."""
    data = _make_csv(
        ["Complaint ID", "Category", "Sub Category", "Grievance Date",
         "Ward Name", "Grievance Status", "Staff Remarks", "Staff Name"],
        [["CS-001", "Roads", "Pothole", "2025-01-10", "Koramangala", "Received", "", ""]],
    )
    resp = client.post(
        "/api/desk/hub/validate",
        files={"file": ("test.csv", data, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["can_import"] is True
    assert body["row_count"] == 1
    assert body["unmapped_required"] == []


def test_validate_alias_csv(client):
    """A CSV with alternative column names is auto-mapped via aliases."""
    data = _make_csv(
        ["complaint_id", "category", "ward"],
        [["CS-001", "Roads", "Koramangala"]],
    )
    resp = client.post(
        "/api/desk/hub/validate",
        files={"file": ("test.csv", data, "text/csv")},
    )
    body = resp.json()
    assert body["can_import"] is True


def test_validate_missing_required_columns(client):
    """CSV missing required columns reports them in unmapped_required."""
    data = _make_csv(
        ["Sub Category", "Grievance Date"],
        [["Pothole", "2025-01-10"]],
    )
    resp = client.post(
        "/api/desk/hub/validate",
        files={"file": ("test.csv", data, "text/csv")},
    )
    body = resp.json()
    assert body["can_import"] is False
    # All three required fields should be unmapped
    for required in ["Complaint ID", "Category", "Ward Name"]:
        assert required in body["unmapped_required"]


def test_validate_non_csv_rejected(client):
    """Non-CSV upload must be rejected with 422."""
    resp = client.post(
        "/api/desk/hub/validate",
        files={"file": ("test.txt", b"not a csv", "text/plain")},
    )
    assert resp.status_code == 422


def test_validate_empty_header_rejected(client):
    resp = client.post(
        "/api/desk/hub/validate",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert resp.status_code == 422


# ===========================================================================
# Feature 3 — Valid CSV import
# ===========================================================================

def test_import_valid_csv(client):
    data = _make_csv(
        ["Complaint ID", "Category", "Sub Category", "Grievance Date",
         "Ward Name", "Grievance Status", "Staff Remarks", "Staff Name"],
        [
            ["EXT-001", "Roads", "Pothole", "2025-03-01", "Koramangala", "Resolved", "Fixed", "Ravi"],
            ["EXT-002", "Electrical", "Streetlight", "2025-03-02", "Hebbal", "Received", "", ""],
        ],
    )
    resp = client.post(
        "/api/desk/hub/import?dataset_tag=test_import",
        files={"file": ("data.csv", data, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["imported"] == 2
    assert body["skipped"] == 0
    assert body["invalid"] == 0


def test_import_invalid_csv_rejection(client):
    """CSV missing required fields — all rows should be marked invalid."""
    data = _make_csv(
        ["Sub Category", "Grievance Date"],
        [["Pothole", "2025-01-10"]],
    )
    # No mapping — required fields absent
    resp = client.post(
        "/api/desk/hub/import",
        files={"file": ("bad.csv", data, "text/csv")},
    )
    # Missing required fields → 422
    assert resp.status_code == 422


# ===========================================================================
# Feature 3 — Duplicate handling
# ===========================================================================

def test_import_duplicate_skipped(client):
    """Importing the same file twice — second import skips existing rows."""
    data = _make_csv(
        ["Complaint ID", "Category", "Ward Name"],
        [["EXT-001", "Roads", "Koramangala"]],
    )
    r1 = client.post(
        "/api/desk/hub/import?dataset_tag=dup_test",
        files={"file": ("d.csv", data, "text/csv")},
    )
    assert r1.json()["imported"] == 1

    r2 = client.post(
        "/api/desk/hub/import?dataset_tag=dup_test",
        files={"file": ("d.csv", data, "text/csv")},
    )
    assert r2.json()["imported"] == 0
    assert r2.json()["skipped"] == 1


def test_import_skip_duplicates_false(client):
    """With skip_duplicates=false, duplicates are re-imported."""
    data = _make_csv(
        ["Complaint ID", "Category", "Ward Name"],
        [["EXT-001", "Roads", "Koramangala"]],
    )
    client.post(
        "/api/desk/hub/import?dataset_tag=nodup&skip_duplicates=false",
        files={"file": ("d.csv", data, "text/csv")},
    )
    r2 = client.post(
        "/api/desk/hub/import?dataset_tag=nodup&skip_duplicates=false",
        files={"file": ("d.csv", data, "text/csv")},
    )
    assert r2.json()["imported"] == 1


# ===========================================================================
# Feature 4 — Dataset profile
# ===========================================================================

def test_profile_valid_dataset(client):
    data = _make_csv(
        ["Complaint ID", "Category", "Ward Name", "Grievance Date", "Grievance Status"],
        [
            ["EXT-001", "Roads", "Koramangala", "2025-01-10", "Resolved"],
            ["EXT-002", "Electrical", "Hebbal", "2025-02-15", "Received"],
            ["EXT-003", "Roads", "Whitefield", "2025-03-20", "Under Review"],
        ],
    )
    resp = client.post(
        "/api/desk/hub/profile",
        files={"file": ("data.csv", data, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["row_count"] == 3
    assert body["valid_rows"] == 3
    assert body["categories"] == 2
    assert body["wards"] == 3
    assert body["validation_status"] == "valid"
    assert body["date_range"] is not None
    assert "Resolved" in body["status_distribution"]


def test_profile_empty_dataset(client):
    data = _make_csv(
        ["Complaint ID", "Category", "Ward Name"],
    )
    resp = client.post(
        "/api/desk/hub/profile",
        files={"file": ("empty.csv", data, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["row_count"] == 0
    assert body["validation_status"] == "empty"


def test_profile_missing_values_reported(client):
    """Missing values in optional fields are counted."""
    data = _make_csv(
        ["Complaint ID", "Category", "Ward Name", "Grievance Date"],
        [
            ["EXT-001", "Roads", "Koramangala", ""],   # missing date
            ["EXT-002", "Electrical", "Hebbal", "2025-02-15"],
        ],
    )
    resp = client.post(
        "/api/desk/hub/profile",
        files={"file": ("data.csv", data, "text/csv")},
    )
    body = resp.json()
    assert body["missing_values"]["Grievance Date"] == 1


# ===========================================================================
# Feature 5/7 — Forecast readiness
# ===========================================================================

def test_forecast_readiness_no_dataset(client):
    resp = client.get("/api/desk/hub/forecast-readiness")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ready"] is False
    assert body["uses_demo"] is True


def test_forecast_readiness_insufficient_data(client, tmp_path, monkeypatch):
    """A dataset with < 90 days span returns ready=False."""
    import json
    import backend.desk as desk_module
    loaded_path = tmp_path / "loaded_dataset.json"
    monkeypatch.setattr(desk_module, "LOADED_DATASET_PATH", loaded_path)
    loaded_path.write_text(json.dumps({
        "total_records": 50,
        "date_range": {"from": "2025-01-01", "to": "2025-01-30"},
    }))
    resp = client.get("/api/desk/hub/forecast-readiness")
    body = resp.json()
    assert body["ready"] is False
    assert body["uses_demo"] is False


# ===========================================================================
# Original passing tests (preserved)
# ===========================================================================

def test_list_tickets_empty_initially(client):
    resp = client.get("/api/desk/tickets")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_tickets_filter_by_status(client):
    client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "A", "ward": "Ward1",
    })
    tid = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "B", "ward": "Ward2",
    }).json()["ticket_id"]
    client.patch(f"/api/desk/tickets/{tid}", json={"status": "Resolved", "officer_note": "Fixed"})

    resp = client.get("/api/desk/tickets?status=Received")
    assert len(resp.json()) == 1

    resp2 = client.get("/api/desk/tickets?status=Resolved")
    assert len(resp2.json()) == 1


def test_get_ticket_not_found(client):
    resp = client.get("/api/desk/tickets/CS-0000-9999")
    assert resp.status_code == 404


def test_hub_loaded_dataset_none(client):
    resp = client.get("/api/desk/hub/loaded-dataset")
    assert resp.status_code == 200
    assert resp.json()["loaded"] is False


# ===========================================================================
# Feature 6 — Hub analytics from imported dataset
# ===========================================================================

def test_analytics_empty_returns_bbmp_2025(client):
    """When no dataset is loaded, analytics returns data_source='bbmp_2025'."""
    resp = client.get("/api/desk/hub/analytics")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data_source"] == "bbmp_2025"
    assert body["categories"] == []
    assert body["wards"] == []
    assert body["metrics"] == []


def test_analytics_after_import(client):
    """After importing a CSV, analytics returns data_source='imported' with data."""
    data = _make_csv(
        ["Complaint ID", "Category", "Ward Name", "Grievance Status", "Grievance Date"],
        [
            ["EXT-001", "Roads", "Koramangala", "Resolved", "2025-03-01"],
            ["EXT-002", "Electrical", "Hebbal", "Received", "2025-03-02"],
            ["EXT-003", "Roads", "Whitefield", "Resolved", "2025-04-10"],
        ],
    )
    imp = client.post(
        "/api/desk/hub/import?dataset_tag=analytics_test",
        files={"file": ("data.csv", data, "text/csv")},
    )
    assert imp.json()["imported"] == 3

    resp = client.get("/api/desk/hub/analytics")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data_source"] == "imported"
    assert body["dataset_tag"] == "analytics_test"
    assert len(body["categories"]) > 0
    assert len(body["wards"]) > 0
    # metrics must be present
    metrics = {m["metric"]: m["value"] for m in body["metrics"]}
    assert "total_grievances" in metrics
    assert metrics["total_grievances"] == "3"


def test_analytics_category_counts(client):
    """Analytics category aggregation groups by category correctly."""
    data = _make_csv(
        ["Complaint ID", "Category", "Ward Name"],
        [
            ["EXT-001", "Roads", "Ward1"],
            ["EXT-002", "Roads", "Ward2"],
            ["EXT-003", "Electrical", "Ward1"],
        ],
    )
    client.post(
        "/api/desk/hub/import?dataset_tag=cat_test",
        files={"file": ("data.csv", data, "text/csv")},
    )
    resp = client.get("/api/desk/hub/analytics")
    body = resp.json()
    cat_map = {c["category"]: int(c["complaints"]) for c in body["categories"]}
    assert cat_map.get("Roads") == 2
    assert cat_map.get("Electrical") == 1


def test_analytics_ward_counts(client):
    """Analytics ward aggregation counts grievances per ward."""
    data = _make_csv(
        ["Complaint ID", "Category", "Ward Name"],
        [
            ["EXT-001", "Roads", "Koramangala"],
            ["EXT-002", "Electrical", "Koramangala"],
            ["EXT-003", "Roads", "Hebbal"],
        ],
    )
    client.post(
        "/api/desk/hub/import?dataset_tag=ward_test",
        files={"file": ("data.csv", data, "text/csv")},
    )
    resp = client.get("/api/desk/hub/analytics")
    body = resp.json()
    ward_map = {w["ward"]: int(w["complaints"]) for w in body["wards"]}
    assert ward_map.get("Koramangala") == 2
    assert ward_map.get("Hebbal") == 1

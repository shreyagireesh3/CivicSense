"""
Tests for the Civic Service Desk endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """
    Each test gets an isolated in-memory (tmp_path) database so no real
    desk.db is created or modified.
    """
    import backend.desk as desk_module
    monkeypatch.setattr(desk_module, "DB_PATH", tmp_path / "desk_test.db")
    desk_module.init_db()
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Submit a ticket
# ---------------------------------------------------------------------------

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
    # Second sequence number must be higher
    assert int(id2.split("-")[-1]) > int(id1.split("-")[-1])


def test_create_ticket_missing_required_fields(client):
    # missing ward
    resp = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Pothole",
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# List tickets
# ---------------------------------------------------------------------------

def test_list_tickets_empty_initially(client):
    resp = client.get("/api/desk/tickets")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_tickets_returns_submitted(client):
    client.post("/api/desk/tickets", json={
        "category": "Electrical", "description": "Test", "ward": "Horamavu",
    })
    resp = client.get("/api/desk/tickets")
    assert resp.status_code == 200
    tickets = resp.json()
    assert len(tickets) == 1
    assert tickets[0]["category"] == "Electrical"


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


# ---------------------------------------------------------------------------
# Get single ticket
# ---------------------------------------------------------------------------

def test_get_ticket_returns_details_and_remarks(client):
    tid = client.post("/api/desk/tickets", json={
        "category": "Electrical", "description": "No power", "ward": "Horamavu",
    }).json()["ticket_id"]

    resp = client.get(f"/api/desk/tickets/{tid}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ticket_id"] == tid
    assert body["status"] == "Received"
    assert body["remarks"] == []


def test_get_ticket_not_found(client):
    resp = client.get("/api/desk/tickets/CS-0000-9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update ticket (officer)
# ---------------------------------------------------------------------------

def test_update_ticket_changes_status(client):
    tid = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "Pothole", "ward": "Koramangala",
    }).json()["ticket_id"]

    resp = client.patch(f"/api/desk/tickets/{tid}", json={
        "status": "Under Review",
        "officer_note": "Assigned to maintenance team.",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "Under Review"


def test_update_ticket_remark_appears_in_tracking(client):
    tid = client.post("/api/desk/tickets", json={
        "category": "Electrical", "description": "Fault", "ward": "Whitefield",
    }).json()["ticket_id"]

    client.patch(f"/api/desk/tickets/{tid}", json={
        "status": "Action Taken",
        "officer_note": "Replaced fuse box.",
    })

    tracking = client.get(f"/api/desk/tickets/{tid}").json()
    assert tracking["status"] == "Action Taken"
    assert len(tracking["remarks"]) == 1
    assert tracking["remarks"][0]["officer_note"] == "Replaced fuse box."


def test_update_ticket_invalid_status(client):
    tid = client.post("/api/desk/tickets", json={
        "category": "Roads", "description": "X", "ward": "Y",
    }).json()["ticket_id"]

    resp = client.patch(f"/api/desk/tickets/{tid}", json={"status": "INVALID_STATUS"})
    assert resp.status_code == 422


def test_update_ticket_not_found(client):
    resp = client.patch("/api/desk/tickets/CS-0000-9999", json={"status": "Resolved"})
    assert resp.status_code == 404

"""
Civic Service Desk — SQLite-backed ticket management.
Mounted into the main FastAPI app in main.py.
"""
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "desk.db"


def _get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def _db():
    conn = _get_conn()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with _db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS tickets (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id   TEXT    NOT NULL UNIQUE,
                category    TEXT    NOT NULL,
                subcategory TEXT    NOT NULL DEFAULT '',
                description TEXT    NOT NULL,
                ward        TEXT    NOT NULL,
                status      TEXT    NOT NULL DEFAULT 'Received',
                created_at  TEXT    NOT NULL,
                updated_at  TEXT    NOT NULL
            );
            CREATE TABLE IF NOT EXISTS remarks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id   TEXT    NOT NULL,
                officer_note TEXT   NOT NULL,
                status      TEXT    NOT NULL,
                created_at  TEXT    NOT NULL,
                FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
            );
        """)


def _next_ticket_id(conn: sqlite3.Connection) -> str:
    year = datetime.now(timezone.utc).year
    row = conn.execute(
        "SELECT COUNT(*) AS n FROM tickets WHERE ticket_id LIKE ?",
        (f"CS-{year}-%",),
    ).fetchone()
    seq = (row["n"] or 0) + 1
    return f"CS-{year}-{seq:04d}"


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TicketCreate(BaseModel):
    category:    str
    subcategory: str = ""
    description: str
    ward:        str


class OfficerUpdate(BaseModel):
    status:       str
    officer_note: str = ""


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/desk", tags=["desk"])

# Allowed status transitions (guards against typos from the frontend)
VALID_STATUSES = {"Received", "Under Review", "Action Taken", "Resolved", "Reopened"}


@router.post("/tickets", status_code=201)
def create_ticket(body: TicketCreate):
    if not body.category.strip():
        raise HTTPException(status_code=422, detail="category is required")
    if not body.description.strip():
        raise HTTPException(status_code=422, detail="description is required")
    if not body.ward.strip():
        raise HTTPException(status_code=422, detail="ward is required")

    now = datetime.now(timezone.utc).isoformat()
    with _db() as conn:
        ticket_id = _next_ticket_id(conn)
        conn.execute(
            """INSERT INTO tickets
               (ticket_id, category, subcategory, description, ward,
                status, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (ticket_id, body.category.strip(), body.subcategory.strip(),
             body.description.strip(), body.ward.strip(),
             "Received", now, now),
        )
    return {"ticket_id": ticket_id, "status": "Received", "created_at": now}


@router.get("/tickets")
def list_tickets(
    status:   Optional[str] = None,
    category: Optional[str] = None,
):
    query  = "SELECT * FROM tickets"
    params = []
    clauses = []
    if status:
        clauses.append("status = ?")
        params.append(status)
    if category:
        clauses.append("category = ?")
        params.append(category)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY id DESC"

    with _db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    with _db() as conn:
        row = conn.execute(
            "SELECT * FROM tickets WHERE ticket_id = ?", (ticket_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
        remarks = conn.execute(
            "SELECT * FROM remarks WHERE ticket_id = ? ORDER BY id ASC",
            (ticket_id,),
        ).fetchall()
    return {**dict(row), "remarks": [dict(r) for r in remarks]}


@router.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: str, body: OfficerUpdate):
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status. Must be one of: {sorted(VALID_STATUSES)}",
        )
    now = datetime.now(timezone.utc).isoformat()
    with _db() as conn:
        row = conn.execute(
            "SELECT id FROM tickets WHERE ticket_id = ?", (ticket_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
        conn.execute(
            "UPDATE tickets SET status = ?, updated_at = ? WHERE ticket_id = ?",
            (body.status, now, ticket_id),
        )
        if body.officer_note.strip():
            conn.execute(
                "INSERT INTO remarks (ticket_id, officer_note, status, created_at) VALUES (?,?,?,?)",
                (ticket_id, body.officer_note.strip(), body.status, now),
            )
    return {"ticket_id": ticket_id, "status": body.status, "updated_at": now}

"""
Civic Service Desk — SQLite-backed ticket management.
Mounted into the main FastAPI app in main.py.

v2.0 additions:
- staff_name column on tickets
- Data Hub: stats + CSV export (today/week/month/custom/all)
- Dataset import: validate, profile, column-map, load
- Analytics-refresh: serve loaded dataset for dashboard
"""
import csv
import io
import json
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "desk.db"

# Path where a loaded dataset is cached for analytics refresh
LOADED_DATASET_PATH = BASE_DIR / "data" / "loaded_dataset.json"


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
                staff_name  TEXT    NOT NULL DEFAULT '',
                created_at  TEXT    NOT NULL,
                updated_at  TEXT    NOT NULL
            );
            CREATE TABLE IF NOT EXISTS remarks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id   TEXT    NOT NULL,
                officer_note TEXT   NOT NULL,
                status      TEXT    NOT NULL,
                staff_name  TEXT    NOT NULL DEFAULT '',
                created_at  TEXT    NOT NULL,
                FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
            );
            CREATE TABLE IF NOT EXISTS imported_records (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                complaint_id    TEXT    NOT NULL,
                category        TEXT    NOT NULL DEFAULT '',
                sub_category    TEXT    NOT NULL DEFAULT '',
                grievance_date  TEXT    NOT NULL DEFAULT '',
                ward_name       TEXT    NOT NULL DEFAULT '',
                grievance_status TEXT   NOT NULL DEFAULT '',
                staff_remarks   TEXT    NOT NULL DEFAULT '',
                staff_name      TEXT    NOT NULL DEFAULT '',
                dataset_tag     TEXT    NOT NULL DEFAULT '',
                imported_at     TEXT    NOT NULL
            );
        """)
        # Add staff_name column to tickets if upgrading from v1 schema
        try:
            conn.execute("ALTER TABLE tickets ADD COLUMN staff_name TEXT NOT NULL DEFAULT ''")
            conn.commit()
        except sqlite3.OperationalError:
            pass  # column already exists
        # Add staff_name column to remarks if upgrading from v1 schema
        try:
            conn.execute("ALTER TABLE remarks ADD COLUMN staff_name TEXT NOT NULL DEFAULT ''")
            conn.commit()
        except sqlite3.OperationalError:
            pass  # column already exists


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
    staff_name:  str = ""


class OfficerUpdate(BaseModel):
    status:       str
    officer_note: str = ""
    staff_name:   str = ""


class ColumnMapping(BaseModel):
    complaint_id:     str = ""
    category:         str = ""
    sub_category:     str = ""
    grievance_date:   str = ""
    ward_name:        str = ""
    grievance_status: str = ""
    staff_remarks:    str = ""
    staff_name:       str = ""


# CivicSense canonical CSV schema columns
CANONICAL_COLUMNS = [
    "Complaint ID",
    "Category",
    "Sub Category",
    "Grievance Date",
    "Ward Name",
    "Grievance Status",
    "Staff Remarks",
    "Staff Name",
]

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/desk", tags=["desk"])

# Allowed status transitions
VALID_STATUSES = {"Received", "Under Review", "Action Taken", "Resolved", "Reopened"}


# ===========================================================================
# FEATURE 1 — Ticket CRUD  (citizen complaints → desk.db)
# ===========================================================================

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
                status, staff_name, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (ticket_id, body.category.strip(), body.subcategory.strip(),
             body.description.strip(), body.ward.strip(),
             "Received", body.staff_name.strip(), now, now),
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
            "UPDATE tickets SET status = ?, updated_at = ?, staff_name = ? WHERE ticket_id = ?",
            (body.status, now, body.staff_name.strip(), ticket_id),
        )
        if body.officer_note.strip():
            conn.execute(
                "INSERT INTO remarks (ticket_id, officer_note, status, staff_name, created_at) VALUES (?,?,?,?,?)",
                (ticket_id, body.officer_note.strip(), body.status, body.staff_name.strip(), now),
            )
    return {"ticket_id": ticket_id, "status": body.status, "updated_at": now}


# ===========================================================================
# FEATURE 2 — Data Hub: statistics + CSV export
# ===========================================================================

@router.get("/hub/stats")
def hub_stats():
    """Return record counts for today, this week, all-time, and latest date."""
    today = date.today().isoformat()
    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()

    with _db() as conn:
        total = conn.execute("SELECT COUNT(*) AS n FROM tickets").fetchone()["n"]
        today_count = conn.execute(
            "SELECT COUNT(*) AS n FROM tickets WHERE date(created_at) = ?", (today,)
        ).fetchone()["n"]
        week_count = conn.execute(
            "SELECT COUNT(*) AS n FROM tickets WHERE date(created_at) >= ?", (week_start,)
        ).fetchone()["n"]
        latest = conn.execute(
            "SELECT MAX(created_at) AS d FROM tickets"
        ).fetchone()["d"]

    return {
        "total_records":   total,
        "new_today":       today_count,
        "new_this_week":   week_count,
        "latest_data_date": latest,
    }


def _tickets_to_csv_stream(rows) -> io.StringIO:
    """Convert ticket dicts to a CivicSense canonical CSV."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CANONICAL_COLUMNS)
    for r in rows:
        writer.writerow([
            r.get("ticket_id", ""),
            r.get("category", ""),
            r.get("subcategory", ""),
            (r.get("created_at", "") or "")[:10],  # date portion only
            r.get("ward", ""),
            r.get("status", ""),
            "",   # Staff Remarks — from remarks table; not joined here for simplicity
            r.get("staff_name", ""),
        ])
    buf.seek(0)
    return buf


def _fetch_tickets_in_range(conn, date_from: Optional[str], date_to: Optional[str]):
    params = []
    clauses = []
    if date_from:
        clauses.append("date(created_at) >= ?")
        params.append(date_from)
    if date_to:
        clauses.append("date(created_at) <= ?")
        params.append(date_to)
    q = "SELECT * FROM tickets"
    if clauses:
        q += " WHERE " + " AND ".join(clauses)
    q += " ORDER BY created_at ASC"
    return [dict(r) for r in conn.execute(q, params).fetchall()]


@router.get("/hub/export")
def hub_export(
    period: str = Query("all", description="today|week|month|all"),
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
):
    """
    Export tickets as CivicSense canonical CSV.
    period: today | week | month | all
    Or supply date_from / date_to (YYYY-MM-DD) for a custom range.
    """
    today = date.today()

    if date_from or date_to:
        d_from = date_from
        d_to   = date_to
        label  = f"custom_{d_from or 'start'}_{d_to or 'end'}"
    elif period == "today":
        d_from = d_to = today.isoformat()
        label  = f"today_{today.isoformat()}"
    elif period == "week":
        d_from = (today - timedelta(days=today.weekday())).isoformat()
        d_to   = today.isoformat()
        label  = f"week_{d_from}"
    elif period == "month":
        d_from = today.replace(day=1).isoformat()
        d_to   = today.isoformat()
        label  = f"month_{today.year}_{today.month:02d}"
    else:
        d_from = d_to = None
        label  = "all"

    with _db() as conn:
        rows = _fetch_tickets_in_range(conn, d_from, d_to)

    buf = _tickets_to_csv_stream(rows)
    filename = f"civicsense_export_{label}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ===========================================================================
# FEATURE 3 & 4 — CSV import: validate, profile, column-map, load
# ===========================================================================

# Required fields for a valid CivicSense import
REQUIRED_IMPORT_FIELDS = {"Complaint ID", "Category", "Ward Name"}

# Common alternate column name aliases
_ALIASES: dict[str, list[str]] = {
    "Complaint ID":     ["complaint_id", "id", "ticket_id", "grievance_id", "complaintid"],
    "Category":         ["category", "complaint_type", "type", "grievance_type"],
    "Sub Category":     ["sub_category", "subcategory", "sub_type", "subtype"],
    "Grievance Date":   ["grievance_date", "date", "complaint_date", "created_at", "reported_date"],
    "Ward Name":        ["ward_name", "ward", "area", "locality"],
    "Grievance Status": ["grievance_status", "status", "complaint_status", "resolution_status"],
    "Staff Remarks":    ["staff_remarks", "remarks", "officer_note", "resolution_remarks"],
    "Staff Name":       ["staff_name", "officer_name", "assigned_to", "assigned_officer"],
}


def _auto_map_columns(header: list[str]) -> dict[str, str]:
    """Return best-guess mapping: canonical → source column name."""
    header_lower = {h.lower().strip(): h for h in header}
    mapping = {}
    for canonical, aliases in _ALIASES.items():
        # Exact match first
        if canonical.lower() in header_lower:
            mapping[canonical] = header_lower[canonical.lower()]
            continue
        # Alias match
        for alias in aliases:
            if alias.lower() in header_lower:
                mapping[canonical] = header_lower[alias.lower()]
                break
    return mapping


def _parse_csv_bytes(content: bytes) -> tuple[list[str], list[dict]]:
    """Parse CSV bytes → (header, rows)."""
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    header = reader.fieldnames or []
    rows = list(reader)
    return list(header), rows


@router.post("/hub/validate")
async def validate_dataset(file: UploadFile = File(...)):
    """
    Step 1: Accept a CSV upload.
    Returns: auto-detected column mapping, unmapped required fields, row count.
    Does NOT import anything.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only CSV files are accepted.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50 MB guard
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit.")

    header, rows = _parse_csv_bytes(content)
    if not header:
        raise HTTPException(status_code=422, detail="CSV file has no header row.")

    mapping = _auto_map_columns(header)
    unmapped_required = [f for f in REQUIRED_IMPORT_FIELDS if f not in mapping]

    return {
        "row_count":          len(rows),
        "source_columns":     header,
        "suggested_mapping":  mapping,
        "unmapped_required":  unmapped_required,
        "can_import":         len(unmapped_required) == 0,
    }


@router.post("/hub/profile")
async def profile_dataset(
    file: UploadFile = File(...),
    mapping: str = Query("{}"),
):
    """
    Step 2: Profile an uploaded CSV using the column mapping.
    Returns dataset statistics (record count, date range, categories, wards,
    status distribution, missing value counts).
    Does NOT import anything.
    """
    content = await file.read()
    header, rows = _parse_csv_bytes(content)
    if not rows:
        return {
            "row_count": 0,
            "date_range": None,
            "categories": 0,
            "wards": 0,
            "status_distribution": {},
            "missing_values": {},
            "validation_status": "empty",
        }

    try:
        col_map: dict = json.loads(mapping)
    except json.JSONDecodeError:
        col_map = {}

    auto = _auto_map_columns(header)
    merged_map = {**auto, **col_map}  # user overrides take priority

    def get(row, canonical):
        src = merged_map.get(canonical, "")
        return row.get(src, "").strip() if src else ""

    categories = set()
    wards = set()
    statuses: dict[str, int] = {}
    dates = []
    missing: dict[str, int] = {c: 0 for c in CANONICAL_COLUMNS}
    valid_rows = 0

    for row in rows:
        cat    = get(row, "Category")
        ward   = get(row, "Ward Name")
        cid    = get(row, "Complaint ID")
        status = get(row, "Grievance Status")
        gdate  = get(row, "Grievance Date")

        if cat:   categories.add(cat)
        if ward:  wards.add(ward)
        if status:
            statuses[status] = statuses.get(status, 0) + 1

        # Collect dates for range
        if gdate:
            dates.append(gdate)

        # Missing value tracking
        for canonical in CANONICAL_COLUMNS:
            val = get(row, canonical)
            if not val:
                missing[canonical] += 1

        # Valid if required fields present
        if cat and ward and cid:
            valid_rows += 1

    date_range = None
    if dates:
        try:
            parsed = sorted(dates)
            date_range = {"from": parsed[0], "to": parsed[-1]}
        except Exception:
            pass

    return {
        "row_count":            len(rows),
        "valid_rows":           valid_rows,
        "date_range":           date_range,
        "categories":           len(categories),
        "wards":                len(wards),
        "status_distribution":  statuses,
        "missing_values":       missing,
        "validation_status":    "valid" if valid_rows > 0 else "invalid",
        "column_mapping_used":  merged_map,
    }


@router.post("/hub/import")
async def import_dataset(
    file: UploadFile = File(...),
    mapping: str = Query("{}"),
    dataset_tag: str = Query("imported"),
    skip_duplicates: bool = Query(True),
):
    """
    Step 3: Import a validated CSV into the imported_records table.
    Uses the column mapping to extract fields.
    Returns counts: imported, skipped (duplicates), invalid.
    """
    content = await file.read()
    header, rows = _parse_csv_bytes(content)

    if not rows:
        return {"imported": 0, "skipped": 0, "invalid": 0, "errors": ["Empty file"]}

    try:
        col_map: dict = json.loads(mapping)
    except json.JSONDecodeError:
        col_map = {}

    auto = _auto_map_columns(header)
    merged_map = {**auto, **col_map}

    unmapped = [f for f in REQUIRED_IMPORT_FIELDS if f not in merged_map]
    if unmapped:
        raise HTTPException(
            status_code=422,
            detail=f"Required columns not mapped: {unmapped}. Run /hub/validate first.",
        )

    def get(row, canonical):
        src = merged_map.get(canonical, "")
        return row.get(src, "").strip() if src else ""

    now = datetime.now(timezone.utc).isoformat()
    imported = skipped = invalid = 0
    errors: list[str] = []

    with _db() as conn:
        # Fetch existing complaint IDs to detect duplicates
        if skip_duplicates:
            existing = {
                r[0] for r in conn.execute(
                    "SELECT complaint_id FROM imported_records WHERE dataset_tag = ?",
                    (dataset_tag,)
                ).fetchall()
            }
        else:
            existing = set()

        for i, row in enumerate(rows):
            cid    = get(row, "Complaint ID")
            cat    = get(row, "Category")
            ward   = get(row, "Ward Name")

            if not cid or not cat or not ward:
                invalid += 1
                if len(errors) < 10:
                    errors.append(f"Row {i+2}: missing required field(s) [Complaint ID={repr(cid)}, Category={repr(cat)}, Ward Name={repr(ward)}]")
                continue

            if skip_duplicates and cid in existing:
                skipped += 1
                continue

            conn.execute(
                """INSERT INTO imported_records
                   (complaint_id, category, sub_category, grievance_date,
                    ward_name, grievance_status, staff_remarks, staff_name,
                    dataset_tag, imported_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    cid,
                    cat,
                    get(row, "Sub Category"),
                    get(row, "Grievance Date"),
                    ward,
                    get(row, "Grievance Status"),
                    get(row, "Staff Remarks"),
                    get(row, "Staff Name"),
                    dataset_tag,
                    now,
                ),
            )
            existing.add(cid)
            imported += 1

    # Persist a summary to the loaded_dataset.json for analytics refresh
    _refresh_loaded_dataset_cache(dataset_tag)

    return {
        "imported":    imported,
        "skipped":     skipped,
        "invalid":     invalid,
        "dataset_tag": dataset_tag,
        "errors":      errors,
    }


def _refresh_loaded_dataset_cache(dataset_tag: str):
    """Write a summary JSON file for the analytics layer to consume."""
    with _db() as conn:
        rows = conn.execute(
            "SELECT * FROM imported_records WHERE dataset_tag = ?", (dataset_tag,)
        ).fetchall()

    if not rows:
        return

    # Build category summary
    cat_counts: dict[str, int] = {}
    ward_counts: dict[str, int] = {}
    status_counts: dict[str, int] = {}
    dates = []

    for r in rows:
        r = dict(r)
        cat   = r.get("category", "") or ""
        ward  = r.get("ward_name", "") or ""
        stat  = r.get("grievance_status", "") or ""
        gdate = r.get("grievance_date", "") or ""

        if cat:   cat_counts[cat]   = cat_counts.get(cat, 0) + 1
        if ward:  ward_counts[ward] = ward_counts.get(ward, 0) + 1
        if stat:  status_counts[stat] = status_counts.get(stat, 0) + 1
        if gdate: dates.append(gdate)

    dates_sorted = sorted(dates) if dates else []

    summary = {
        "dataset_tag":         dataset_tag,
        "total_records":       len(rows),
        "categories":          sorted(cat_counts.items(), key=lambda x: -x[1]),
        "wards":               sorted(ward_counts.items(), key=lambda x: -x[1]),
        "status_distribution": status_counts,
        "date_range": {
            "from": dates_sorted[0] if dates_sorted else None,
            "to":   dates_sorted[-1] if dates_sorted else None,
        },
    }

    LOADED_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOADED_DATASET_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)


@router.get("/hub/loaded-dataset")
def get_loaded_dataset():
    """Return summary of the currently loaded external dataset (if any)."""
    if not LOADED_DATASET_PATH.exists():
        return {"loaded": False}
    try:
        with open(LOADED_DATASET_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"loaded": True, **data}
    except Exception:
        return {"loaded": False}


@router.delete("/hub/loaded-dataset")
def clear_loaded_dataset():
    """Remove the loaded dataset, reverting analytics to the default 2025 BBMP dataset."""
    if LOADED_DATASET_PATH.exists():
        LOADED_DATASET_PATH.unlink()
    # Also clear imported_records if desired
    return {"cleared": True}


# ===========================================================================
# FEATURE 6 — Analytics from imported dataset
# ===========================================================================

@router.get("/hub/analytics")
def hub_analytics():
    """
    Return analytics computed from the most recently imported dataset.
    Shape mirrors the static JSON endpoints so the frontend can use it as a
    drop-in replacement for categories, wards, statuses, monthly and metrics.

    If no dataset is loaded, returns data_source="bbmp_2025" with empty arrays
    so the caller knows to fall back to the static BBMP data.
    """
    if not LOADED_DATASET_PATH.exists():
        return {
            "data_source": "bbmp_2025",
            "categories": [],
            "wards":       [],
            "statuses":    [],
            "monthly":     [],
            "metrics":     [],
            "metadata":    {},
        }

    try:
        with open(LOADED_DATASET_PATH, "r", encoding="utf-8") as f:
            summary = json.load(f)
    except Exception:
        return {
            "data_source": "bbmp_2025",
            "categories": [],
            "wards":       [],
            "statuses":    [],
            "monthly":     [],
            "metrics":     [],
            "metadata":    {},
        }

    dataset_tag = summary.get("dataset_tag", "")
    total_records = summary.get("total_records", 0)

    if not dataset_tag or total_records == 0:
        return {
            "data_source": "bbmp_2025",
            "categories": [],
            "wards":       [],
            "statuses":    [],
            "monthly":     [],
            "metrics":     [],
            "metadata":    {},
        }

    # Read raw records from imported_records for the latest dataset_tag
    with _db() as conn:
        rows = conn.execute(
            "SELECT category, ward_name, grievance_status, grievance_date "
            "FROM imported_records WHERE dataset_tag = ?",
            (dataset_tag,),
        ).fetchall()

    if not rows:
        return {
            "data_source": "bbmp_2025",
            "categories": [],
            "wards":       [],
            "statuses":    [],
            "monthly":     [],
            "metrics":     [],
            "metadata":    {},
        }

    cat_counts:    dict[str, int] = {}
    ward_counts:   dict[str, int] = {}
    status_counts: dict[str, int] = {}
    month_counts:  dict[str, int] = {}
    dates:         list[str]      = []
    resolved_keywords = {"resolved", "closed"}

    for r in rows:
        r = dict(r)
        cat   = (r.get("category", "") or "").strip()
        ward  = (r.get("ward_name", "") or "").strip()
        stat  = (r.get("grievance_status", "") or "").strip()
        gdate = (r.get("grievance_date", "") or "").strip()

        if cat:  cat_counts[cat]   = cat_counts.get(cat, 0) + 1
        if ward: ward_counts[ward] = ward_counts.get(ward, 0) + 1
        if stat: status_counts[stat] = status_counts.get(stat, 0) + 1

        if gdate:
            dates.append(gdate)
            # Try to extract YYYY-MM for monthly bucketing
            try:
                month_key = gdate[:7]  # "YYYY-MM"
                if len(month_key) == 7 and month_key[4] == "-":
                    month_counts[month_key] = month_counts.get(month_key, 0) + 1
            except Exception:
                pass

    total = len(rows)
    unique_wards = len(ward_counts)

    # Closed rate — count statuses matching resolved/closed keywords
    resolved_count = sum(
        v for k, v in status_counts.items()
        if k.lower() in resolved_keywords
    )
    closed_rate = round((resolved_count / total * 100), 2) if total else 0.0

    dates_sorted = sorted(dates) if dates else []
    date_min = dates_sorted[0] if dates_sorted else None
    date_max = dates_sorted[-1] if dates_sorted else None

    # Build response arrays in dashboard shape
    categories_arr = [
        {"category": k, "complaints": str(v)}
        for k, v in sorted(cat_counts.items(), key=lambda x: -x[1])
    ]
    wards_arr = [
        {"ward": k, "complaints": str(v)}
        for k, v in sorted(ward_counts.items(), key=lambda x: -x[1])
    ]
    statuses_arr = [
        {"status": k, "complaints": str(v)}
        for k, v in sorted(status_counts.items(), key=lambda x: -x[1])
    ]
    monthly_arr = [
        {"month": k, "complaints": str(v)}
        for k, v in sorted(month_counts.items())
    ]
    metrics_arr = [
        {"metric": "total_grievances",    "value": str(total)},
        {"metric": "unique_wards",        "value": str(unique_wards)},
        {"metric": "closed_rate_percent", "value": str(closed_rate)},
    ]

    return {
        "data_source": "imported",
        "dataset_tag": dataset_tag,
        "categories":  categories_arr,
        "wards":       wards_arr,
        "statuses":    statuses_arr,
        "monthly":     monthly_arr,
        "metrics":     metrics_arr,
        "metadata": {
            "total_records":   total,
            "date_min":        date_min,
            "date_max":        date_max,
            "category_count":  len(cat_counts),
            "ward_count":      unique_wards,
        },
    }


# ===========================================================================
# FEATURE 5 / 7 — Forecast safety: check if loaded dataset has enough data
# ===========================================================================

@router.get("/hub/forecast-readiness")
def forecast_readiness():
    """
    Check whether the loaded dataset has sufficient chronological data
    for model training (≥90 unique dates recommended).
    """
    if not LOADED_DATASET_PATH.exists():
        return {
            "ready": False,
            "reason": "No loaded dataset. Using 2025 BBMP demo data for forecasts.",
            "uses_demo": True,
        }

    try:
        with open(LOADED_DATASET_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {"ready": False, "reason": "Could not read loaded dataset.", "uses_demo": True}

    date_range = data.get("date_range", {})
    d_from = date_range.get("from")
    d_to   = date_range.get("to")
    total  = data.get("total_records", 0)

    if not d_from or not d_to:
        return {
            "ready": False,
            "reason": "Forecast unavailable: insufficient chronological history.",
            "uses_demo": False,
        }

    try:
        span_days = (
            datetime.fromisoformat(d_to[:10]) - datetime.fromisoformat(d_from[:10])
        ).days
    except Exception:
        span_days = 0

    MIN_DAYS = 90
    if span_days < MIN_DAYS or total < 100:
        return {
            "ready": False,
            "reason": (
                f"Forecast unavailable: insufficient chronological history. "
                f"Dataset spans {span_days} days / {total} records "
                f"(minimum {MIN_DAYS} days required)."
            ),
            "uses_demo": False,
            "span_days": span_days,
            "total_records": total,
        }

    return {
        "ready": True,
        "reason": "Dataset is sufficient for forecasting.",
        "uses_demo": False,
        "span_days": span_days,
        "total_records": total,
    }

"""
Datenbank-Schicht fuer den Dienstplaner.

Bewusst nur Python-Standardbibliothek (sqlite3) -> laeuft ohne Zusatz-Installation
und ist als einzelne Datei (data/dienstplan.db) leicht zu sichern.

Weekday-Konvention ueberall: 0 = Montag ... 6 = Sonntag (wie date.weekday()).
Uhrzeiten werden als Text "HH:MM" gespeichert.
JSON-Felder werden als Text abgelegt und in der API-Schicht geparst.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "dienstplan.db"

SCHEMA_VERSION = 2


# ---------------------------------------------------------------------------
# Verbindung
# ---------------------------------------------------------------------------
def connect() -> sqlite3.Connection:
    """Oeffnet eine Verbindung mit sinnvollen Defaults (Row-Zugriff per Name)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None


def rows_to_list(rows) -> list[dict]:
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT               -- JSON
);

-- Standorte -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    kuerzel     TEXT,
    color       TEXT,
    bundesland       TEXT,            -- z.B. 'HH', 'BE', 'BY' (fuer Feiertage)
    open_on_holidays INTEGER NOT NULL DEFAULT 1,   -- Zentren duerfen an Feiertagen offen sein
    note             TEXT,
    active           INTEGER NOT NULL DEFAULT 1,
    sort             INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rooms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    name        TEXT NOT NULL,
    sort        INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Betriebszeiten je Standort und Wochentag ----------------------------------
CREATE TABLE IF NOT EXISTS operating_hours (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    weekday     INTEGER NOT NULL,     -- 0=Mo .. 6=So
    open_time   TEXT,                 -- 'HH:MM'
    close_time  TEXT,
    closed      INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Grundbesetzung (deckt Oeffnung + Praesenzkurse) ---------------------------
CREATE TABLE IF NOT EXISTS coverage_blocks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id   INTEGER NOT NULL,
    weekday       INTEGER NOT NULL,
    start_time    TEXT NOT NULL,
    end_time      TEXT NOT NULL,
    min_staff     INTEGER NOT NULL DEFAULT 1,
    role_required TEXT,               -- optional (z.B. 'schliessberechtigt')
    note          TEXT,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Mitarbeiter ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id          INTEGER NOT NULL,       -- strikt gebunden
    name                 TEXT NOT NULL,
    kuerzel              TEXT,
    color                TEXT,
    employment_type      TEXT,                   -- vollzeit/teilzeit/azubi/minijob
    weekly_hours         REAL,                   -- Soll-Wochenstunden
    max_hours_week       REAL,
    max_hours_day        REAL DEFAULT 10,
    earliest_start       TEXT,                   -- 'HH:MM'
    latest_end           TEXT,
    min_rest_hours       REAL NOT NULL DEFAULT 11,
    max_consecutive_days INTEGER NOT NULL DEFAULT 6,
    can_open_close       INTEGER NOT NULL DEFAULT 0,
    can_work_alone       INTEGER NOT NULL DEFAULT 1,
    can_home_office      INTEGER NOT NULL DEFAULT 0,
    roles                TEXT,                   -- JSON array, z.B. ["trainer","technik"]
    availability         TEXT,                   -- JSON {"0":"yes","1":"no","2":"vm",...}
    school               TEXT,                   -- JSON [{"weekday":2,"period":"vm"}]
    nogo                 TEXT,                   -- JSON [wochentag,...] (dauerhafte No-Go-Tage)
    preferences          TEXT,                   -- JSON: {preferred_days, avoid_days, time_pref, max_kind}
    secondary_locations  TEXT,                   -- JSON [location_id,...] (optionaler Aushilf-Standort)
    vacation_days_total  REAL,                   -- optionales Urlaubskonto
    contract_start       TEXT,
    contract_end         TEXT,
    note                 TEXT,
    active               INTEGER NOT NULL DEFAULT 1,
    sort                 INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Wochen-Overrides der Verfuegbarkeit (hochdynamisch!) ----------------------
CREATE TABLE IF NOT EXISTS week_availability (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    iso_year    INTEGER NOT NULL,
    iso_week    INTEGER NOT NULL,
    weekday     INTEGER NOT NULL,
    mode        TEXT,                 -- yes/no/vm/nm/home
    note        TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Wochen-spezifische Abwesenheiten (Urlaub/Krank/Freiwunsch/Schulblock) ------
CREATE TABLE IF NOT EXISTS absences (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    iso_year    INTEGER NOT NULL,
    iso_week    INTEGER NOT NULL,
    date        TEXT,                 -- NULL = ganze Woche; mit end_date = Zeitraum
    end_date    TEXT,
    type        TEXT NOT NULL,        -- urlaub/krank/frei/schule/wunsch_frei/sonstiges
    priority    TEXT NOT NULL DEFAULT 'fix',   -- fix = unantastbar, wunsch = Planer versucht
    period      TEXT,                 -- ganztags/vm/nm/custom
    start_time  TEXT,
    end_time    TEXT,
    note        TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Kurse je Woche ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id   INTEGER NOT NULL,
    iso_year      INTEGER NOT NULL,
    iso_week      INTEGER NOT NULL,
    date          TEXT NOT NULL,
    type          TEXT NOT NULL,      -- praesenz/hybrid/online
    title         TEXT,
    start_time    TEXT,
    end_time      TEXT,
    room_id       INTEGER,
    staff_needed  INTEGER NOT NULL DEFAULT 0,   -- online: von Nini frei gesetzt (auch 0)
    role_required TEXT,
    note          TEXT,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY(room_id)     REFERENCES rooms(id)     ON DELETE SET NULL
);

-- Zuweisungen = der eigentliche Dienstplan ----------------------------------
CREATE TABLE IF NOT EXISTS assignments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id    INTEGER NOT NULL,
    iso_year       INTEGER NOT NULL,
    iso_week       INTEGER NOT NULL,
    employee_id    INTEGER NOT NULL,
    date           TEXT NOT NULL,
    start_time     TEXT NOT NULL,
    end_time       TEXT NOT NULL,
    kind           TEXT NOT NULL DEFAULT 'dienst',  -- dienst/kurs/telefon/zbv/event/status
    work_mode      TEXT NOT NULL DEFAULT 'onsite',  -- onsite/home
    room_id        INTEGER,
    course_id      INTEGER,
    task_text      TEXT,                            -- z.B. "umbauen Raum 2+3"
    status_type    TEXT,                            -- bei kind=status: urlaub/frei/schule/krank
    locked         INTEGER NOT NULL DEFAULT 0,      -- manuell fixiert -> Planer fasst es nicht an
    auto_generated INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY(room_id)     REFERENCES rooms(id)     ON DELETE SET NULL
);

-- Muster-Bibliothek (wiederkehrende Bausteine, separat speicherbar) ---------
CREATE TABLE IF NOT EXISTS patterns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    kind        TEXT,                 -- course/telefon/coverage/assignment/mixed
    location_id INTEGER,              -- NULL = standortunabhaengig
    payload     TEXT,                 -- JSON: Beschreibung der wiederkehrenden Elemente
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT
);

-- Komplette Wochen-Vorlagen (Snapshot) --------------------------------------
CREATE TABLE IF NOT EXISTS templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    location_id INTEGER,
    payload     TEXT,                 -- JSON-Snapshot (Kurse/Besetzung/Zuweisungen)
    created_at  TEXT
);

-- Sondertage je Standort (datumsgenaue Overrides der Betriebszeiten) ---------
CREATE TABLE IF NOT EXISTS special_days (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    date        TEXT NOT NULL,
    closed      INTEGER NOT NULL DEFAULT 0,
    open_time   TEXT,
    close_time  TEXT,
    note        TEXT,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Besetzbare Sonderaufgaben (zbV, z.B. "umbauen Raum 2+3") -------------------
CREATE TABLE IF NOT EXISTS tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id   INTEGER NOT NULL,
    iso_year      INTEGER NOT NULL,
    iso_week      INTEGER NOT NULL,
    date          TEXT NOT NULL,
    title         TEXT,
    room_id       INTEGER,
    start_time    TEXT,
    end_time      TEXT,
    staff_needed  INTEGER NOT NULL DEFAULT 1,
    role_required TEXT,
    note          TEXT,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY(room_id)     REFERENCES rooms(id)     ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assign_week   ON assignments(iso_year, iso_week, location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_week    ON tasks(iso_year, iso_week, location_id);
CREATE INDEX IF NOT EXISTS idx_courses_week  ON courses(iso_year, iso_week, location_id);
CREATE INDEX IF NOT EXISTS idx_absence_week  ON absences(iso_year, iso_week, employee_id);
CREATE INDEX IF NOT EXISTS idx_weekavail     ON week_availability(iso_year, iso_week, employee_id);
"""


def init_db() -> None:
    """Legt das Schema an (idempotent) und setzt die Schema-Version."""
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.execute(
            "INSERT INTO meta(key, value) VALUES('schema_version', ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (str(SCHEMA_VERSION),),
        )
        conn.commit()
    finally:
        conn.close()


def is_empty() -> bool:
    """True, wenn noch keine Standorte existieren (fuer das Seeding)."""
    conn = connect()
    try:
        n = conn.execute("SELECT COUNT(*) AS c FROM locations").fetchone()["c"]
        return n == 0
    finally:
        conn.close()


# Kleine JSON-Helfer --------------------------------------------------------
def dumps(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def loads(text, default=None):
    if not text:
        return default
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        return default


if __name__ == "__main__":
    init_db()
    print(f"OK - Datenbank initialisiert unter: {DB_PATH}")
    print(f"Schema-Version: {SCHEMA_VERSION}")

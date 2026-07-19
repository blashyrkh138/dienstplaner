"""
Lokaler Server fuer den Dienstplaner - nur Python-Standardbibliothek.

Serviert die Oberflaeche (frontend/) und eine schlanke JSON-API. Laeuft
ausschliesslich lokal auf 127.0.0.1, also kein Zugriff von aussen.
"""

from __future__ import annotations

import json
import mimetypes
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from . import db
from . import holidays as hol
from . import planner

HOST = "127.0.0.1"
PORT = 8765

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# Tabellen, die per generischem CRUD erreichbar sind
CRUD_TABLES = {
    "locations", "rooms", "operating_hours", "coverage_blocks", "employees",
    "week_availability", "absences", "courses", "assignments", "patterns",
    "templates", "special_days", "tasks",
}

# Spalten, die als JSON gespeichert werden (Ein-/Ausgabe automatisch wandeln)
JSON_COLUMNS = {
    "employees": {"roles", "availability", "school", "nogo", "preferences", "secondary_locations"},
    "patterns": {"payload"},
    "templates": {"payload"},
}

_columns_cache: dict[str, list[str]] = {}


# ---------------------------------------------------------------------------
# Hilfen fuer Tabellen-Zugriff
# ---------------------------------------------------------------------------
def table_columns(conn, table: str) -> list[str]:
    if table not in _columns_cache:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
        _columns_cache[table] = [r["name"] for r in rows]
    return _columns_cache[table]


def _encode_row(table: str, data: dict) -> dict:
    js = JSON_COLUMNS.get(table, set())
    out = {}
    for k, v in data.items():
        if k in js and not isinstance(v, str):
            out[k] = db.dumps(v)
        else:
            out[k] = v
    return out


def _decode_row(table: str, row: dict) -> dict:
    js = JSON_COLUMNS.get(table, set())
    out = dict(row)
    for k in js:
        if k in out:
            out[k] = db.loads(out[k], default=None)
    return out


def crud_list(table: str, filters: dict) -> list[dict]:
    conn = db.connect()
    try:
        cols = table_columns(conn, table)
        where, params = [], []
        for key, values in filters.items():
            if key in cols and values:
                where.append(f"{key} = ?")
                params.append(values[0])
        sql = f"SELECT * FROM {table}"
        if where:
            sql += " WHERE " + " AND ".join(where)
        if "sort" in cols:
            sql += " ORDER BY sort, id"
        else:
            sql += " ORDER BY id"
        rows = conn.execute(sql, params).fetchall()
        return [_decode_row(table, dict(r)) for r in rows]
    finally:
        conn.close()


def crud_create(table: str, data: dict) -> dict:
    conn = db.connect()
    try:
        cols = set(table_columns(conn, table)) - {"id"}
        data = _encode_row(table, {k: v for k, v in data.items() if k in cols})
        keys = list(data.keys())
        placeholders = ", ".join("?" for _ in keys)
        sql = f"INSERT INTO {table}({', '.join(keys)}) VALUES({placeholders})"
        cur = conn.execute(sql, [data[k] for k in keys])
        conn.commit()
        row = conn.execute(f"SELECT * FROM {table} WHERE id=?", (cur.lastrowid,)).fetchone()
        return _decode_row(table, dict(row))
    finally:
        conn.close()


def crud_update(table: str, row_id: int, data: dict) -> dict | None:
    conn = db.connect()
    try:
        cols = set(table_columns(conn, table)) - {"id"}
        data = _encode_row(table, {k: v for k, v in data.items() if k in cols})
        if not data:
            row = conn.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,)).fetchone()
            return _decode_row(table, dict(row)) if row else None
        sets = ", ".join(f"{k}=?" for k in data)
        conn.execute(f"UPDATE {table} SET {sets} WHERE id=?", [*data.values(), row_id])
        conn.commit()
        row = conn.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,)).fetchone()
        return _decode_row(table, dict(row)) if row else None
    finally:
        conn.close()


def crud_delete(table: str, row_id: int) -> bool:
    conn = db.connect()
    try:
        cur = conn.execute(f"DELETE FROM {table} WHERE id=?", (row_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Fachliche Endpunkte
# ---------------------------------------------------------------------------
def get_settings() -> dict:
    conn = db.connect()
    try:
        return {r["key"]: db.loads(r["value"], default=None)
                for r in conn.execute("SELECT key, value FROM settings")}
    finally:
        conn.close()


def put_settings(updates: dict) -> dict:
    conn = db.connect()
    try:
        for key, value in updates.items():
            conn.execute(
                "INSERT INTO settings(key, value) VALUES(?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, db.dumps(value)),
            )
        conn.commit()
    finally:
        conn.close()
    return get_settings()


def bootstrap() -> dict:
    """Alles, was die App beim Start braucht (Stammdaten)."""
    return {
        "settings": get_settings(),
        "locations": crud_list("locations", {}),
        "rooms": crud_list("rooms", {}),
        "employees": crud_list("employees", {}),
        "patterns": crud_list("patterns", {}),
        "today": date.today().isoformat(),
    }


def week_data(location_id: int, year: int, week: int) -> dict:
    """Alle wochenspezifischen Daten fuer einen Standort."""
    conn = db.connect()
    try:
        loc = conn.execute("SELECT * FROM locations WHERE id=?", (location_id,)).fetchone()
        bundesland = loc["bundesland"] if loc else None

        dates = [date.fromisocalendar(year, week, d).isoformat() for d in range(1, 8)]
        holiday_map = {}
        for iso in dates:
            y = int(iso[:4])
            name = hol.holidays_for(y, bundesland).get(iso)
            if name:
                holiday_map[iso] = name

        def q(sql, params):
            return [dict(r) for r in conn.execute(sql, params).fetchall()]

        emp_filter = "employee_id IN (SELECT id FROM employees WHERE location_id=?)"
        return {
            "location_id": location_id,
            "year": year,
            "week": week,
            "dates": dates,
            "holidays": holiday_map,
            "courses": q("SELECT * FROM courses WHERE location_id=? AND iso_year=? AND iso_week=?",
                         (location_id, year, week)),
            "tasks": q("SELECT * FROM tasks WHERE location_id=? AND iso_year=? AND iso_week=?",
                       (location_id, year, week)),
            "assignments": q("SELECT * FROM assignments WHERE location_id=? AND iso_year=? AND iso_week=?",
                             (location_id, year, week)),
            "absences": q(f"SELECT * FROM absences WHERE iso_year=? AND iso_week=? AND {emp_filter}",
                          (year, week, location_id)),
            "week_availability": q(f"SELECT * FROM week_availability WHERE iso_year=? AND iso_week=? AND {emp_filter}",
                                   (year, week, location_id)),
            "special_days": q("SELECT * FROM special_days WHERE location_id=? AND date IN (%s)"
                              % ",".join("?" * len(dates)), (location_id, *dates)),
            "operating_hours": q("SELECT * FROM operating_hours WHERE location_id=?", (location_id,)),
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# HTTP-Handler
# ---------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = "Dienstplaner/1.0"

    def log_message(self, fmt, *args):  # ruhiger als Standard
        return

    # -- Antwort-Helfer ---------------------------------------------------
    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, msg, status=400):
        self._json({"error": msg}, status)

    def _binary(self, data: bytes, mime: str, filename: str):
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if not length:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}

    def _serve_static(self, path: str):
        rel = path.lstrip("/")
        if rel == "" or rel.endswith("/"):
            rel = "index.html"
        target = (FRONTEND_DIR / rel).resolve()
        if not str(target).startswith(str(FRONTEND_DIR.resolve())) or not target.is_file():
            # SPA-Fallback: unbekannte Pfade -> index.html
            target = FRONTEND_DIR / "index.html"
            if not target.is_file():
                return self._error("Frontend nicht gefunden", 404)
        ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # -- Routing ----------------------------------------------------------
    def _route(self, method: str):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if not path.startswith("/api/"):
            if method == "GET":
                return self._serve_static(path)
            return self._error("Nur GET fuer statische Dateien", 405)

        parts = path[len("/api/"):].strip("/").split("/")
        resource = parts[0] if parts else ""
        rid = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None

        try:
            # Feste Endpunkte
            if resource == "health":
                return self._json({"ok": True, "service": "dienstplaner"})
            if resource == "bootstrap":
                return self._json(bootstrap())
            if resource == "settings":
                if method == "GET":
                    return self._json(get_settings())
                if method in ("PUT", "POST"):
                    return self._json(put_settings(self._body()))
                return self._error("Methode nicht erlaubt", 405)
            if resource == "week":
                if method != "GET":
                    return self._error("Nur GET", 405)
                loc = int(query.get("location_id", [0])[0])
                year = int(query.get("year", [date.today().isocalendar()[0]])[0])
                week = int(query.get("week", [date.today().isocalendar()[1]])[0])
                return self._json(week_data(loc, year, week))
            if resource == "holidays":
                year = int(query.get("year", [date.today().year])[0])
                bl = query.get("bundesland", [None])[0]
                return self._json(hol.holidays_for(year, bl))
            if resource == "apply_availability":
                if method != "POST":
                    return self._error("Nur POST", 405)
                entries = self._body().get("entries", [])
                conn = db.connect()
                try:
                    for e in entries:
                        conn.execute(
                            "DELETE FROM week_availability WHERE employee_id=? AND iso_year=? AND iso_week=? AND weekday=?",
                            (e["employee_id"], e["iso_year"], e["iso_week"], e["weekday"]))
                        conn.execute(
                            "INSERT INTO week_availability(employee_id, iso_year, iso_week, weekday, mode) VALUES(?,?,?,?,?)",
                            (e["employee_id"], e["iso_year"], e["iso_week"], e["weekday"], e["mode"]))
                    conn.commit()
                finally:
                    conn.close()
                return self._json({"applied": len(entries)})

            if resource == "plan":
                if method != "POST":
                    return self._error("Nur POST", 405)
                body = self._body()
                loc = int(body.get("location_id"))
                year = int(body.get("year", date.today().isocalendar()[0]))
                week = int(body.get("week", date.today().isocalendar()[1]))
                pmode = body.get("mode", "replan")
                return self._json(planner.generate(loc, year, week, pmode))
            if resource == "export":
                if method != "GET":
                    return self._error("Nur GET", 405)
                sub = parts[1] if len(parts) > 1 else ""
                loc = int(query.get("location_id", [0])[0])
                year = int(query.get("year", [date.today().isocalendar()[0]])[0])
                week = int(query.get("week", [date.today().isocalendar()[1]])[0])
                if sub == "excel":
                    from . import export_excel
                    fname, mime, data = export_excel.export(loc, year, week)
                elif sub == "ics":
                    from . import export_ics
                    mode = query.get("mode", ["perperson"])[0]
                    fname, mime, data = export_ics.export(loc, year, week, mode)
                else:
                    return self._error("Unbekannter Export", 404)
                return self._binary(data, mime, fname)

            # Generisches CRUD
            if resource in CRUD_TABLES:
                if method == "GET":
                    return self._json(crud_list(resource, query))
                if method == "POST":
                    return self._json(crud_create(resource, self._body()), 201)
                if method == "PUT":
                    if rid is None:
                        return self._error("ID fehlt", 400)
                    row = crud_update(resource, rid, self._body())
                    return self._json(row) if row else self._error("Nicht gefunden", 404)
                if method == "DELETE":
                    if rid is None:
                        return self._error("ID fehlt", 400)
                    ok = crud_delete(resource, rid)
                    return self._json({"deleted": ok}) if ok else self._error("Nicht gefunden", 404)
                return self._error("Methode nicht erlaubt", 405)

            return self._error(f"Unbekannter Endpunkt: {resource}", 404)
        except Exception as exc:  # defensiv, damit der Server nicht stirbt
            return self._error(f"Serverfehler: {exc}", 500)

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def do_PUT(self):
        self._route("PUT")

    def do_DELETE(self):
        self._route("DELETE")


def run():
    db.init_db()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    url = f"http://{HOST}:{PORT}/"
    print("=" * 55)
    print("  Dienstplaner laeuft")
    print(f"  Adresse: {url}")
    print("  Zum Beenden dieses Fenster schliessen (oder Strg+C).")
    print("=" * 55)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer wird beendet ...")
        httpd.shutdown()


if __name__ == "__main__":
    run()

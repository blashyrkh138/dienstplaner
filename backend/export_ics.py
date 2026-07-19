"""
ICS-Export (Google Kalender) - ohne Zusatzabhaengigkeit.

Zwei Varianten:
  * combined   -> eine .ics-Datei mit allen Terminen der Woche
  * perperson  -> eine ZIP mit je einer .ics pro Mitarbeiter
                  (in Google je Person ein eigener Kalender = feste Farbe)

Titel im Format der bestehenden Kalender ("NA 08:00 bis 17:00").
"""

from __future__ import annotations

import io
import zipfile
from datetime import date, datetime

from . import db

VTIMEZONE = """BEGIN:VTIMEZONE
TZID:Europe/Berlin
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE""".split("\n")

KIND_LABEL = {"dienst": "Dienst", "kurs": "Kurs", "telefon": "Telefondienst", "zbv": "Sonderaufgabe", "event": "Termin"}


def _esc(s) -> str:
    return str(s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _dt(date_iso: str, hhmm: str) -> str:
    return date_iso.replace("-", "") + "T" + hhmm.replace(":", "") + "00"


def _gather(location_id: int, year: int, week: int):
    conn = db.connect()
    try:
        loc = dict(conn.execute("SELECT * FROM locations WHERE id=?", (location_id,)).fetchone())
        emps = {e["id"]: dict(e) for e in conn.execute("SELECT * FROM employees WHERE location_id=?", (location_id,))}
        rooms = {r["id"]: r["name"] for r in conn.execute("SELECT * FROM rooms WHERE location_id=?", (location_id,))}
        assigns = [dict(r) for r in conn.execute(
            "SELECT * FROM assignments WHERE location_id=? AND iso_year=? AND iso_week=? ORDER BY date, start_time",
            (location_id, year, week))]
        courses = {c["id"]: dict(c) for c in conn.execute(
            "SELECT * FROM courses WHERE location_id=? AND iso_year=? AND iso_week=?", (location_id, year, week))}
        emp_ids = list(emps)
        absences = []
        if emp_ids:
            ph = ",".join("?" * len(emp_ids))
            absences = [dict(r) for r in conn.execute(
                f"SELECT * FROM absences WHERE iso_year=? AND iso_week=? AND employee_id IN ({ph})",
                (year, week, *emp_ids))]
        settings = {r["key"]: db.loads(r["value"]) for r in conn.execute("SELECT * FROM settings")}
        dates = [date.fromisocalendar(year, week, d).isoformat() for d in range(1, 8)]
        abs_cat = {t["id"]: t for t in (settings.get("absence_types") or [])}
        return loc, emps, rooms, assigns, courses, absences, dates, settings, abs_cat
    finally:
        conn.close()


def _summary(a: dict, emp: dict, courses: dict, title_format: str) -> str:
    base = title_format.format(kuerzel=emp.get("kuerzel") or emp.get("name"),
                               start=a["start_time"], end=a["end_time"], name=emp.get("name"))
    detail = ""
    if a["kind"] == "kurs":
        c = courses.get(a.get("course_id"))
        detail = "Kurs: " + (c["title"] if c and c.get("title") else "Kurs")
    elif a["kind"] == "zbv":
        detail = a.get("task_text") or "Sonderaufgabe"
    elif a["kind"] == "telefon":
        detail = "Telefondienst" + (" (Zuhause)" if a.get("work_mode") == "home" else "")
    elif a["kind"] != "dienst":
        detail = KIND_LABEL.get(a["kind"], a["kind"])
    return f"{base} · {detail}" if detail else base


def _employee_events(emp_id, loc, emps, rooms, assigns, courses, absences, dates, settings, abs_cat):
    """Liefert ICS-Zeilen (VEVENTs) fuer einen Mitarbeiter."""
    emp = emps[emp_id]
    title_format = settings.get("title_format") or "{kuerzel} {start} bis {end}"
    stamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    lines = []

    for a in assigns:
        if a["employee_id"] != emp_id:
            continue
        room = rooms.get(a.get("room_id"))
        loc_txt = f"{loc['name']}" + (f" · {room}" if room else "")
        lines += [
            "BEGIN:VEVENT",
            f"UID:dp-a{a['id']}@dienstplaner",
            f"DTSTAMP:{stamp}",
            f"DTSTART;TZID=Europe/Berlin:{_dt(a['date'], a['start_time'])}",
            f"DTEND;TZID=Europe/Berlin:{_dt(a['date'], a['end_time'])}",
            "SUMMARY:" + _esc(_summary(a, emp, courses, title_format)),
            "LOCATION:" + _esc(loc_txt),
            "END:VEVENT",
        ]

    for ab in absences:
        if ab["employee_id"] != emp_id:
            continue
        t = abs_cat.get(ab["type"], {"label": ab["type"]})
        start = ab["date"] or dates[0]
        end_incl = ab.get("end_date") or (dates[6] if not ab["date"] else ab["date"])
        end = date.fromordinal(date.fromisoformat(end_incl).toordinal() + 1).isoformat()
        per = ab.get("period")
        suffix = f" ({per})" if per and per != "ganztags" else ""
        lines += [
            "BEGIN:VEVENT",
            f"UID:dp-ab{ab['id']}@dienstplaner",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{start.replace('-', '')}",
            f"DTEND;VALUE=DATE:{end.replace('-', '')}",
            "SUMMARY:" + _esc(f"{emp.get('kuerzel')} {t['label']}{suffix}"),
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
        ]
    return lines


def _wrap_calendar(name: str, event_lines: list[str]) -> str:
    head = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dienstplaner//DE//v1", "CALSCALE:GREGORIAN",
            "X-WR-CALNAME:" + _esc(name), "X-WR-TIMEZONE:Europe/Berlin"] + VTIMEZONE
    return "\r\n".join(head + event_lines + ["END:VCALENDAR"]) + "\r\n"


def export(location_id: int, year: int, week: int, mode: str = "perperson"):
    """Rueckgabe: (filename, mimetype, bytes)."""
    ctx = _gather(location_id, year, week)
    loc, emps = ctx[0], ctx[1]
    kw = f"KW{week}"
    base = f"Dienstplan_{loc.get('kuerzel') or loc['name']}_{kw}"

    if mode == "combined":
        events = []
        for emp_id in emps:
            events += _employee_events(emp_id, *ctx)
        data = _wrap_calendar(f"Dienstplan {loc['name']} {kw}", events).encode("utf-8")
        return f"{base}.ics", "text/calendar; charset=utf-8", data

    # perperson -> ZIP
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for emp_id, emp in emps.items():
            events = _employee_events(emp_id, *ctx)
            if not events:
                continue
            ical = _wrap_calendar(f"{emp['name']} · {kw}", events)
            zf.writestr(f"{emp.get('kuerzel') or emp_id}_{emp['name']}.ics", ical)
    return f"{base}_pro_Person.zip", "application/zip", buf.getvalue()

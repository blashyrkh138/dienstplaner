"""
Auto-Planer: erzeugt aus Regeln + Wochen-Einstellungen einen Dienstplan-Vorschlag.

Leitgedanke - maximale Entlastung, ohne Kontrollverlust:
  * feste Bedarfe zuerst (Hybrid/Online-Kurse mit Personal, Sonderaufgaben)
  * dann Grundbesetzung fair auffuellen (deckt Oeffnung + Praesenzkurse)
  * FIXIERTE Schichten (Schloss) bleiben unangetastet
  * harte Regeln je nach Politik 'enforce' (strikt) oder 'warn' (nur Hinweis)
  * am Ende: Luecken/Konflikte als Warnungen zurueck an die Oberflaeche

Der Planer schreibt die erzeugten Schichten in die Datenbank (ersetzt nur die
nicht-fixierten) und liefert Warnungen + eine kleine Statistik.
"""

from __future__ import annotations

import json
from datetime import date

from . import db

DAY_SPLIT = 14 * 60          # Grenze vormittags/nachmittags = 14:00
WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]


# ---------------------------------------------------------------------------
# Zeit-Helfer
# ---------------------------------------------------------------------------
def to_min(hhmm: str | None) -> int | None:
    if not hhmm:
        return None
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def to_hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def overlaps(a_start, a_end, b_start, b_end) -> bool:
    return a_start < b_end and b_start < a_end


def is_free(intervals, start, end) -> bool:
    return all(not overlaps(start, end, s, e) for s, e in intervals)


# ---------------------------------------------------------------------------
# Kontext laden
# ---------------------------------------------------------------------------
def load_context(location_id: int, year: int, week: int) -> dict:
    conn = db.connect()
    try:
        loc = dict(conn.execute("SELECT * FROM locations WHERE id=?", (location_id,)).fetchone())

        emps = []
        for r in conn.execute(
            "SELECT * FROM employees WHERE location_id=? AND active=1 ORDER BY sort, id",
            (location_id,),
        ):
            e = dict(r)
            e["roles"] = db.loads(e["roles"], []) or []
            e["availability"] = db.loads(e["availability"], {}) or {}
            e["school"] = db.loads(e["school"], []) or []
            e["nogo"] = db.loads(e["nogo"], []) or []
            emps.append(e)
        emp_ids = [e["id"] for e in emps]

        op = {}
        for r in conn.execute("SELECT * FROM operating_hours WHERE location_id=?", (location_id,)):
            op[r["weekday"]] = dict(r)

        cov: dict[int, list] = {}
        for r in conn.execute("SELECT * FROM coverage_blocks WHERE location_id=?", (location_id,)):
            cov.setdefault(r["weekday"], []).append(dict(r))

        courses = [dict(r) for r in conn.execute(
            "SELECT * FROM courses WHERE location_id=? AND iso_year=? AND iso_week=?",
            (location_id, year, week))]
        tasks = [dict(r) for r in conn.execute(
            "SELECT * FROM tasks WHERE location_id=? AND iso_year=? AND iso_week=?",
            (location_id, year, week))]

        special = {r["date"]: dict(r) for r in conn.execute(
            "SELECT * FROM special_days WHERE location_id=?", (location_id,))}

        # Abwesenheiten & Wochen-Verfuegbarkeit je Mitarbeiter
        absences: dict[int, list] = {i: [] for i in emp_ids}
        wa: dict[tuple, str] = {}
        if emp_ids:
            ph = ",".join("?" * len(emp_ids))
            for r in conn.execute(
                f"SELECT * FROM absences WHERE iso_year=? AND iso_week=? AND employee_id IN ({ph})",
                (year, week, *emp_ids)):
                absences[r["employee_id"]].append(dict(r))
            for r in conn.execute(
                f"SELECT * FROM week_availability WHERE iso_year=? AND iso_week=? AND employee_id IN ({ph})",
                (year, week, *emp_ids)):
                wa[(r["employee_id"], r["weekday"])] = r["mode"]

        # Fixierte (gesperrte) Schichten, die erhalten bleiben
        locked = [dict(r) for r in conn.execute(
            "SELECT * FROM assignments WHERE location_id=? AND iso_year=? AND iso_week=? AND locked=1",
            (location_id, year, week))]

        settings = {r["key"]: db.loads(r["value"], None)
                    for r in conn.execute("SELECT key, value FROM settings")}

        return {
            "loc": loc, "employees": emps, "op": op, "cov": cov,
            "courses": courses, "tasks": tasks, "special": special,
            "absences": absences, "wa": wa, "locked": locked, "settings": settings,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Verfuegbarkeit
# ---------------------------------------------------------------------------
def day_open_close(ctx: dict, weekday: int, date_iso: str) -> tuple[int, int] | None:
    """(open,close) in Minuten oder None, wenn geschlossen."""
    sp = ctx["special"].get(date_iso)
    if sp:
        if sp["closed"]:
            return None
        if sp["open_time"] and sp["close_time"]:
            return to_min(sp["open_time"]), to_min(sp["close_time"])
    row = ctx["op"].get(weekday)
    if not row or row["closed"] or not row["open_time"]:
        return None
    return to_min(row["open_time"]), to_min(row["close_time"])


def onsite_window(emp: dict, weekday: int, date_iso: str, dopen: int, dclose: int, ctx: dict):
    """
    Liefert (start,end) des Fensters, in dem der MA an diesem Tag ONSITE arbeiten
    kann - oder None. Beruecksichtigt Standard-/Wochen-Verfuegbarkeit, Schule,
    No-Go, Abwesenheiten, frueheste/spaeteste Zeiten.
    Zusaetzlich: soft = True, wenn nur ein Wunsch-frei entgegensteht (nicht hart).
    """
    start, end = dopen, dclose
    soft = False

    # Standard-Verfuegbarkeit, ggf. durch Wochen-Override ersetzt
    mode = emp["availability"].get(str(weekday), "yes")
    mode = ctx["wa"].get((emp["id"], weekday), mode)
    if mode in ("no", "home"):     # 'home' zaehlt nicht als onsite verfuegbar
        return None, False
    if mode == "vm":
        end = min(end, DAY_SPLIT)
    elif mode == "nm":
        start = max(start, DAY_SPLIT)

    # Dauerhafte No-Go-Tage
    if weekday in (emp["nogo"] or []):
        return None, False

    # Berufsschule (fester Wochentag, vm/nm/ganztags)
    for s in emp["school"] or []:
        if s.get("weekday") == weekday:
            p = s.get("period", "ganztags")
            if p == "ganztags":
                return None, False
            if p == "vm":
                start = max(start, DAY_SPLIT)
            elif p == "nm":
                end = min(end, DAY_SPLIT)

    # Wochen-Abwesenheiten
    for a in ctx["absences"].get(emp["id"], []):
        if not _absence_hits(a, date_iso):
            continue
        if a.get("priority") == "wunsch":
            soft = True                      # Wunsch -> nur ungern verplanen
            continue
        p = a.get("period", "ganztags")
        if p == "ganztags":
            return None, False
        elif p == "vm":
            start = max(start, DAY_SPLIT)
        elif p == "nm":
            end = min(end, DAY_SPLIT)
        elif p == "custom" and a.get("start_time") and a.get("end_time"):
            # Blockt einen Teil; vereinfachte Behandlung: schneidet Raender
            asx, aex = to_min(a["start_time"]), to_min(a["end_time"])
            if asx <= start and aex >= end:
                return None, False
            if asx <= start < aex:
                start = aex
            if asx < end <= aex:
                end = asx

    # Frueheste/spaeteste persoenliche Zeiten
    if emp.get("earliest_start"):
        start = max(start, to_min(emp["earliest_start"]))
    if emp.get("latest_end"):
        end = min(end, to_min(emp["latest_end"]))

    if start >= end:
        return None, False
    return (start, end), soft


def _absence_hits(a: dict, date_iso: str) -> bool:
    if not a.get("date"):
        return True                          # ganze Woche
    if a.get("end_date"):
        return a["date"] <= date_iso <= a["end_date"]
    return a["date"] == date_iso


# ---------------------------------------------------------------------------
# Der Planer
# ---------------------------------------------------------------------------
def generate(location_id: int, year: int, week: int, mode: str = "replan") -> dict:
    ctx = load_context(location_id, year, week)
    settings = ctx["settings"]
    planner_cfg = settings.get("planner", {}) or {}
    rules = planner_cfg.get("rules", {}) or {}

    emps = ctx["employees"]
    by_id = {e["id"]: e for e in emps}

    # Zustand: belegte Zeiten je (emp, date), geleistete Minuten je emp, Warnungen
    busy: dict[tuple, list] = {}
    minutes: dict[int, int] = {e["id"]: 0 for e in emps}
    day_last_end: dict[tuple, int] = {}       # (emp,date) -> spaetestes Ende
    warnings: list[dict] = []
    created: list[dict] = []

    # Fixierte Schichten uebernehmen (Zeit + Stunden belegen)
    for a in ctx["locked"]:
        busy.setdefault((a["employee_id"], a["date"]), []).append((to_min(a["start_time"]), to_min(a["end_time"])))
        minutes[a["employee_id"]] = minutes.get(a["employee_id"], 0) + (to_min(a["end_time"]) - to_min(a["start_time"]))

    dates = [date.fromisocalendar(year, week, d) for d in range(1, 8)]

    def fairness_key(emp):
        soll = (emp.get("weekly_hours") or 40) * 60
        ratio = minutes.get(emp["id"], 0) / soll if soll else 1.0
        return (ratio, -int(emp.get("can_open_close") or 0), emp["id"])

    def assign(emp, d_iso, start, end, kind, *, work_mode="onsite", room_id=None,
               course_id=None, task_text=None):
        busy.setdefault((emp["id"], d_iso), []).append((start, end))
        minutes[emp["id"]] = minutes.get(emp["id"], 0) + (end - start)
        day_last_end[(emp["id"], d_iso)] = max(day_last_end.get((emp["id"], d_iso), 0), end)
        rec = {
            "location_id": location_id, "iso_year": year, "iso_week": week,
            "employee_id": emp["id"], "date": d_iso,
            "start_time": to_hhmm(start), "end_time": to_hhmm(end),
            "kind": kind, "work_mode": work_mode, "room_id": room_id,
            "course_id": course_id, "task_text": task_text,
            "status_type": None, "locked": 0, "auto_generated": 1,
        }
        created.append(rec)
        return rec

    def eligible(emp, d_iso, weekday, start, end, need_role=None, want_onsite=True):
        """Kann dieser MA in [start,end] arbeiten? -> (ok, soft, reason)"""
        win = onsite_window(emp, weekday, d_iso, start, end, ctx)
        window, soft = win if isinstance(win, tuple) and isinstance(win[0], tuple) else (win[0], win[1])
        if not window:
            return False, False, "nicht verfuegbar"
        ws, we = window
        if start < ws or end > we:
            return False, False, "ausserhalb Fenster"
        if not is_free(busy.get((emp["id"], d_iso), []), start, end):
            return False, False, "belegt"
        # max Stunden/Tag
        already_today = sum(e - s for s, e in busy.get((emp["id"], d_iso), []))
        maxday = (emp.get("max_hours_day") or 10) * 60
        if already_today + (end - start) > maxday:
            if rules.get("max_hours_day", "warn") == "enforce":
                return False, False, "max Std/Tag"
        # max Stunden/Woche
        maxweek = (emp.get("max_hours_week") or (emp.get("weekly_hours") or 40) + 5) * 60
        if minutes.get(emp["id"], 0) + (end - start) > maxweek:
            if rules.get("max_hours_week", "warn") == "enforce":
                return False, False, "max Std/Woche"
        # Ruhezeit zum Vortag
        rest_h = emp.get("min_rest_hours") or 11
        prev = _previous_end(day_last_end, emp["id"], d_iso)
        if prev is not None:
            gap_h = ((24 * 60 - prev) + start) / 60
            if gap_h < rest_h and rules.get("rest_time", "warn") == "enforce":
                return False, False, "Ruhezeit"
        # Rolle
        if need_role and need_role not in (emp.get("roles") or []):
            return True, True, "Rolle fehlt"      # erlaubt, aber ungern
        return True, soft, ""

    # ---- 1) feste Bedarfe: Kurse mit Personal, dann Aufgaben -------------
    demands = []
    ct_map = {c["id"]: c for c in (settings.get("course_types") or [])}
    for c in ctx["courses"]:
        needs_staff = (c.get("staff_needed") or 0) > 0
        if needs_staff:
            demands.append({"date": c["date"], "start": to_min(c["start_time"]), "end": to_min(c["end_time"]),
                            "count": c["staff_needed"], "role": c.get("role_required"),
                            "kind": "kurs", "room_id": c.get("room_id"), "course_id": c["id"],
                            "label": c.get("title") or "Kurs"})
    for t in ctx["tasks"]:
        demands.append({"date": t["date"], "start": to_min(t["start_time"]), "end": to_min(t["end_time"]),
                        "count": t.get("staff_needed") or 1, "role": t.get("role_required"),
                        "kind": "zbv", "room_id": t.get("room_id"), "task_text": t.get("title"),
                        "label": t.get("title") or "Aufgabe"})

    for dm in demands:
        d_iso = dm["date"]
        weekday = date.fromisoformat(d_iso).weekday()
        if dm["start"] is None or dm["end"] is None:
            continue
        picked = 0
        cands = sorted(emps, key=fairness_key)
        # bevorzugt passende Rolle, dann Rest
        cands = [e for e in cands if not dm["role"] or dm["role"] in e["roles"]] + \
                [e for e in cands if dm["role"] and dm["role"] not in e["roles"]]
        for emp in cands:
            if picked >= dm["count"]:
                break
            ok, _soft, _r = eligible(emp, d_iso, weekday, dm["start"], dm["end"], need_role=dm["role"])
            if ok:
                assign(emp, d_iso, dm["start"], dm["end"], dm["kind"],
                       room_id=dm.get("room_id"), course_id=dm.get("course_id"),
                       task_text=dm.get("task_text"))
                picked += 1
        if picked < dm["count"]:
            warnings.append({"type": "bedarf", "date": d_iso, "severity": "warn",
                             "message": f"{dm['label']} ({to_hhmm(dm['start'])}-{to_hhmm(dm['end'])}): "
                                        f"{dm['count'] - picked} Person(en) fehlen"})

    # ---- 2) Grundbesetzung fair auffuellen ------------------------------
    step = int((settings.get("view", {}) or {}).get("step_minutes", 30))
    for d in dates:
        d_iso = d.isoformat()
        weekday = d.weekday()
        oc = day_open_close(ctx, weekday, d_iso)
        if not oc:
            continue
        dopen, dclose = oc
        blocks = ctx["cov"].get(weekday, [])
        if not blocks:
            continue

        steps = list(range(dopen, dclose, step))
        need = [max([b["min_staff"] for b in blocks
                     if to_min(b["start_time"]) <= s < to_min(b["end_time"])], default=0) for s in steps]
        covered = [0] * len(steps)

        # bereits belegte Onsite-Praesenz (aus Kursen/Aufgaben/fixiert) zaehlen
        for emp in emps:
            for (bs, be) in busy.get((emp["id"], d_iso), []):
                for i, s in enumerate(steps):
                    if bs <= s < be:
                        covered[i] += 1

        # Luecken greedy fuellen
        guard = 0
        while any(need[i] > covered[i] for i in range(len(steps))) and guard < 200:
            guard += 1
            gap_i = next(i for i in range(len(steps)) if need[i] > covered[i])
            gap_start = steps[gap_i]

            best = None
            cands = sorted(emps, key=fairness_key)
            # Ist an dieser Stelle noch niemand da? Dann zuerst eine Person waehlen,
            # die allein arbeiten darf -> der Azubi wird eher Begleitung statt allein.
            if covered[gap_i] == 0:
                cands = [e for e in cands if e.get("can_work_alone", 1)] + \
                        [e for e in cands if not e.get("can_work_alone", 1)]
            for emp in cands:
                ok, soft, _r = eligible(emp, d_iso, weekday, gap_start, gap_start + step)
                if ok:
                    best = (emp, soft)
                    if not soft:
                        break
            if not best:
                # niemand mehr verfuegbar -> Rest der Luecke als Unterbesetzung melden
                last = gap_i
                while last < len(steps) and need[last] > covered[last]:
                    last += 1
                warnings.append({"type": "unterbesetzung", "date": d_iso, "severity": "high",
                                 "message": f"Unterbesetzung {to_hhmm(gap_start)}-{to_hhmm(steps[last-1]+step)}"})
                for i in range(gap_i, last):
                    covered[i] = need[i]     # als 'behandelt' markieren, um Schleife zu beenden
                continue

            emp, _soft = best
            win = onsite_window(emp, weekday, d_iso, dopen, dclose, ctx)
            (ws, we), _ = win
            # Schicht bis zum Ende der zusammenhaengenden Luecke (im Fenster, max Std/Tag)
            maxday = (emp.get("max_hours_day") or 10) * 60
            already = sum(e - s for s, e in busy.get((emp["id"], d_iso), []))
            shift_start = max(gap_start, ws)
            shift_end = shift_start
            j = gap_i
            while j < len(steps) and need[j] > covered[j] and steps[j] + step <= we \
                    and (steps[j] + step - shift_start) + already <= maxday \
                    and is_free(busy.get((emp["id"], d_iso), []), shift_start, steps[j] + step):
                shift_end = steps[j] + step
                j += 1
            if shift_end <= shift_start:
                shift_end = min(shift_start + step, we)
            assign(emp, d_iso, shift_start, shift_end, "dienst")
            for i, s in enumerate(steps):
                if shift_start <= s < shift_end:
                    covered[i] += 1

        # ---- Zusatz-Checks als Warnungen --------------------------------
        _check_day_warnings(d_iso, steps, step, busy, by_id, blocks, dclose, rules, warnings)

    # ---- 3) in die Datenbank schreiben (nur nicht-fixierte ersetzen) ----
    if mode == "replan":
        _write(location_id, year, week, created)

    total = sum(minutes.values())
    return {
        "location_id": location_id, "year": year, "week": week,
        "created": len(created),
        "warnings": sorted(warnings, key=lambda w: (w["date"], w["type"])),
        "hours": {by_id[i]["kuerzel"]: round(m / 60, 1) for i, m in minutes.items() if i in by_id},
        "total_hours": round(total / 60, 1),
    }


def _previous_end(day_last_end, emp_id, d_iso):
    prev_day = (date.fromisoformat(d_iso).toordinal() - 1)
    prev_iso = date.fromordinal(prev_day).isoformat()
    return day_last_end.get((emp_id, prev_iso))


def _ranges(sorted_steps, step):
    """Fasst aufeinanderfolgende Schritte zu (start, end)-Spannen zusammen."""
    out = []
    for s in sorted_steps:
        if out and out[-1][1] == s:
            out[-1][1] = s + step
        else:
            out.append([s, s + step])
    return out


def _check_day_warnings(d_iso, steps, step, busy, by_id, blocks, dclose, rules, warnings):
    # Zeitspannen, in denen nur Azubi/allein-nicht-erlaubte anwesend sind
    azubi_alone = []
    for s in steps:
        present = list(dict.fromkeys(
            emp_id for (emp_id, dd), ivs in busy.items() if dd == d_iso
            for (bs, be) in ivs if bs <= s < be))
        if not present:
            continue
        if not any(by_id.get(p, {}).get("can_work_alone", 1) for p in present):
            azubi_alone.append(s)
    if rules.get("azubi_not_alone", "enforce") != "off":
        for rs, re_ in _ranges(azubi_alone, step):
            warnings.append({"type": "azubi_allein", "date": d_iso, "severity": "warn",
                             "message": f"{to_hhmm(rs)}-{to_hhmm(re_)}: Azubi ohne erlaubte Begleitung"})

    # Schliessberechtigung am Ende
    last = dclose - step
    present_end = list(dict.fromkeys(
        emp_id for (emp_id, dd), ivs in busy.items() if dd == d_iso
        for (bs, be) in ivs if bs <= last < be))
    if present_end and rules.get("closer_present", "warn") != "off":
        if not any(by_id.get(p, {}).get("can_open_close") for p in present_end):
            warnings.append({"type": "kein_schliesser", "date": d_iso, "severity": "warn",
                             "message": f"ab {to_hhmm(last)}: niemand mit Schliessberechtigung"})


def _write(location_id, year, week, created):
    conn = db.connect()
    try:
        conn.execute(
            "DELETE FROM assignments WHERE location_id=? AND iso_year=? AND iso_week=? AND locked=0",
            (location_id, year, week))
        for rec in created:
            keys = list(rec.keys())
            conn.execute(
                f"INSERT INTO assignments({', '.join(keys)}) VALUES({', '.join('?' for _ in keys)})",
                [rec[k] for k in keys])
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    # Kleiner Selbsttest fuer Bodensee, KW 29/2026
    from . import seed
    db.init_db()
    seed.seed()

    y, w, loc = 2026, 29, 1
    conn = db.connect()
    conn.execute("DELETE FROM courses WHERE location_id=?", (loc,))
    conn.execute("DELETE FROM tasks WHERE location_id=?", (loc,))
    conn.execute(
        "INSERT INTO courses(location_id, iso_year, iso_week, date, type, title, start_time, end_time, room_id, staff_needed, role_required) "
        "VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (loc, y, w, "2026-07-14", "hybrid", "Excel Hybrid", "18:00", "20:00", 3, 1, "Trainer"))
    conn.execute(
        "INSERT INTO tasks(location_id, iso_year, iso_week, date, title, room_id, start_time, end_time, staff_needed) "
        "VALUES(?,?,?,?,?,?,?,?,?)",
        (loc, y, w, "2026-07-15", "umbauen Raum 2+3", 2, "14:00", "17:00", 2))
    conn.commit()
    conn.close()

    result = generate(loc, y, w)
    print(json.dumps(result, indent=2, ensure_ascii=False))

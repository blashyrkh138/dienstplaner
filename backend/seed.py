"""
Demo-Daten fuer den ersten Start.

Realistisches Beispiel: 3 Fortbildungszentren mit unterschiedlich vielen Raeumen,
ein Team mit festen Kuerzeln und Farben (angelehnt an das echte Muster: NA, IS, TJ,
MM, CK, HA, MJ, MR). Nini kann all das ueberschreiben, loeschen oder erweitern.

Wird nur ausgefuehrt, wenn die Datenbank noch leer ist.
"""

from __future__ import annotations

from datetime import date

from . import db

MO, DI, MI, DO, FR, SA, SO = range(7)

# Standard-Rollen, die die App kennt (von Nini erweiterbar)
DEFAULT_ROLES = ["Trainer", "Betreuung", "Technik", "Ausbilder", "Ersthelfer", "Schliessberechtigt"]


def _weekday_hours(open_t="08:00", close_t="18:00", days=(MO, DI, MI, DO, FR)):
    """Hilfs-Struktur: (weekday, open, close, closed) fuer Mo-So."""
    rows = []
    for wd in range(7):
        if wd in days:
            rows.append((wd, open_t, close_t, 0))
        else:
            rows.append((wd, None, None, 1))
    return rows


def _full_availability():
    return db.dumps({str(wd): "yes" for wd in range(7)})


def seed() -> None:
    if not db.is_empty():
        return

    conn = db.connect()
    cur = conn.cursor()

    # --- globale Einstellungen (alle editierbar in der App) --------------
    settings = {
        # Editierbare Kataloge -> Nini kann Bezeichnungen/Farben/Verhalten aendern
        "roles": DEFAULT_ROLES,
        "employment_types": ["Vollzeit", "Teilzeit", "Azubi", "Minijob"],
        "absence_types": [
            {"id": "urlaub", "label": "Urlaub", "color": "#C0392B", "absent": True},
            {"id": "krank", "label": "Krank", "color": "#8E44AD", "absent": True},
            {"id": "frei", "label": "Frei", "color": "#7F8C8D", "absent": True},
            {"id": "schule", "label": "Berufsschule", "color": "#2980B9", "absent": True},
            {"id": "wunsch_frei", "label": "Wunsch-frei", "color": "#16A085", "absent": True},
            {"id": "sonstiges", "label": "Sonstiges", "color": "#95A5A6", "absent": True},
        ],
        "shift_kinds": [
            {"id": "dienst", "label": "Dienst", "color": "#3B6FB0", "needs_room": False, "home_ok": False, "counts_hours": True},
            {"id": "kurs", "label": "Kurs-Betreuung", "color": "#7A5AA6", "needs_room": False, "home_ok": False, "counts_hours": True},
            {"id": "telefon", "label": "Telefondienst", "color": "#4A9B8E", "needs_room": False, "home_ok": True, "counts_hours": True},
            {"id": "zbv", "label": "zbV / Sonderaufgabe", "color": "#C99A2E", "needs_room": True, "home_ok": False, "counts_hours": True},
            {"id": "event", "label": "Termin", "color": "#B5654B", "needs_room": False, "home_ok": False, "counts_hours": False},
            {"id": "status", "label": "Status", "color": "#5A5F6A", "needs_room": False, "home_ok": False, "counts_hours": False},
        ],
        "course_types": [
            {"id": "praesenz", "label": "Praesenz", "color": "#2E7D5B", "needs_room": True, "needs_staff": False, "default_staff": 0},
            {"id": "hybrid", "label": "Hybrid", "color": "#C99A2E", "needs_room": True, "needs_staff": True, "default_staff": 1},
            {"id": "online", "label": "Online", "color": "#3E7CB1", "needs_room": False, "needs_staff": False, "default_staff": 0},
        ],
        # Planer-Verhalten
        "planner": {
            "fairness_weight": 0.6,      # gerechte Stundenverteilung
            "wish_weight": 0.4,          # Freiwuensche beruecksichtigen
            "prefer_contiguous": True,   # zusammenhaengende Schichten bevorzugen
            "use_previous_week": True,   # Vorwoche fuer Ruhezeit/Fairness ansehen
            "rules": {                   # pro Regel: 'enforce' (strikt) oder 'warn' (nur Hinweis)
                "location_binding": "enforce",
                "school": "enforce",
                "absence": "enforce",
                "rest_time": "warn",
                "min_staff": "warn",
                "max_hours_week": "warn",
                "max_hours_day": "warn",
                "azubi_not_alone": "enforce",
                "closer_present": "warn",
            },
            "breaks": {"threshold1_h": 6, "break1_min": 30, "threshold2_h": 9, "break2_min": 45},
        },
        "view": {"start_hour": 7, "end_hour": 20, "step_minutes": 30},
        "title_format": "{kuerzel} {start} bis {end}",
    }
    for key, value in settings.items():
        cur.execute(
            "INSERT INTO settings(key, value) VALUES(?, ?)",
            (key, db.dumps(value)),
        )

    # --- Standorte --------------------------------------------------------
    # (name, kuerzel, color, bundesland, raeume, oeffnung, schliessung, tage)
    locations = [
        ("Bodensee (Konstanz)", "BOD", "#2F5D8A", "BW", 5, "08:00", "18:00", (MO, DI, MI, DO, FR)),
        ("Ludwigsburg",         "LB",  "#4A9B8E", "BW", 3, "08:00", "17:00", (MO, DI, MI, DO, FR)),
        ("Darmstadt",           "DA",  "#A1553D", "HE", 2, "08:00", "18:00", (MO, DI, MI, DO, FR)),
    ]
    loc_ids: dict[str, int] = {}
    for sort, (name, kz, color, bl, n_rooms, op, cl, days) in enumerate(locations):
        cur.execute(
            "INSERT INTO locations(name, kuerzel, color, bundesland, active, sort) "
            "VALUES(?,?,?,?,1,?)",
            (name, kz, color, bl, sort),
        )
        lid = cur.lastrowid
        loc_ids[kz] = lid

        # Raeume
        for r in range(1, n_rooms + 1):
            cur.execute(
                "INSERT INTO rooms(location_id, name, sort) VALUES(?,?,?)",
                (lid, f"Raum {r}", r),
            )
        # Betriebszeiten
        for wd, o, c, closed in _weekday_hours(op, cl, days):
            cur.execute(
                "INSERT INTO operating_hours(location_id, weekday, open_time, close_time, closed) "
                "VALUES(?,?,?,?,?)",
                (lid, wd, o, c, closed),
            )
        # Grundbesetzung: vormittags 2, nachmittags 1 (an Betriebstagen)
        for wd in days:
            cur.execute(
                "INSERT INTO coverage_blocks(location_id, weekday, start_time, end_time, min_staff) "
                "VALUES(?,?,?,?,?)",
                (lid, wd, op, "14:00", 2),
            )
            cur.execute(
                "INSERT INTO coverage_blocks(location_id, weekday, start_time, end_time, min_staff) "
                "VALUES(?,?,?,?,?)",
                (lid, wd, "14:00", cl, 1),
            )

    # --- Mitarbeiter ------------------------------------------------------
    # (loc, name, kuerzel, color, typ, wochenstd, rollen, kann_zu, kann_allein,
    #  homeoffice, schule[list], nogo[list])
    employees = [
        ("BOD", "Nadine Arendt",  "NA", "#2E7D5B", "vollzeit", 40,
         ["Trainer", "Schliessberechtigt"], 1, 1, 1, [], []),
        ("BOD", "Ilka Sorel",     "IS", "#3B6FB0", "vollzeit", 40,
         ["Betreuung", "Schliessberechtigt"], 1, 1, 0, [], []),
        ("BOD", "Tom Jansen",     "TJ", "#5A5F6A", "azubi", 35,
         ["Betreuung"], 0, 0, 1, [{"weekday": MI, "period": "vm"}], []),
        ("BOD", "Mia Moll",       "MM", "#C99A2E", "teilzeit", 25,
         ["Betreuung"], 0, 1, 0, [], [FR]),
        ("LB",  "Carla Kern",     "CK", "#2E8B7F", "vollzeit", 40,
         ["Trainer", "Technik", "Schliessberechtigt"], 1, 1, 1, [], []),
        ("LB",  "Hanna Abt",      "HA", "#7A5AA6", "teilzeit", 30,
         ["Betreuung"], 1, 1, 0, [], []),
        ("DA",  "Mara Jung",      "MJ", "#B5654B", "vollzeit", 40,
         ["Trainer", "Schliessberechtigt", "Ersthelfer"], 1, 1, 1, [], []),
        ("DA",  "Miriam Roth",    "MR", "#4A6FA5", "teilzeit", 28,
         ["Betreuung", "Technik"], 1, 1, 1, [], []),
    ]
    for sort, (lk, name, kz, color, typ, wh, roles, kzu, kalone, homeoff, school, nogo) in enumerate(employees):
        cur.execute(
            """INSERT INTO employees
               (location_id, name, kuerzel, color, employment_type, weekly_hours,
                max_hours_week, max_hours_day, earliest_start, latest_end,
                min_rest_hours, max_consecutive_days, can_open_close, can_work_alone,
                can_home_office, roles, availability, school, nogo, active, sort)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)""",
            (
                loc_ids[lk], name, kz, color, typ, wh,
                wh + 5, 10, None, None,
                11, 6, kzu, kalone,
                homeoff, db.dumps(roles), _full_availability(),
                db.dumps(school), db.dumps(nogo), sort,
            ),
        )

    # --- eine Beispiel-Musterbibliothek-Vorlage ---------------------------
    cur.execute(
        "INSERT INTO patterns(name, kind, location_id, payload, active, created_at) "
        "VALUES(?,?,?,?,1,?)",
        (
            "Telefondienst Mi (Homeoffice)", "telefon", loc_ids["BOD"],
            db.dumps({"weekday": MI, "start_time": "16:00", "end_time": "19:00",
                      "work_mode": "home", "kuerzel": "TJ"}),
            date.today().isoformat(),
        ),
    )

    conn.commit()
    conn.close()


def reseed(force: bool = False) -> None:
    """Nur fuer Entwicklung: Datenbank leeren und neu befuellen."""
    if force:
        conn = db.connect()
        for t in ("assignments", "courses", "absences", "week_availability",
                  "coverage_blocks", "operating_hours", "rooms", "employees",
                  "patterns", "templates", "locations", "settings"):
            conn.execute(f"DELETE FROM {t}")
        conn.commit()
        conn.close()
    seed()


if __name__ == "__main__":
    db.init_db()
    seed()
    conn = db.connect()
    for t in ("locations", "rooms", "employees", "coverage_blocks", "operating_hours", "patterns"):
        n = conn.execute(f"SELECT COUNT(*) c FROM {t}").fetchone()["c"]
        print(f"  {t:18s}: {n}")
    conn.close()
    print("OK - Demo-Daten geladen.")

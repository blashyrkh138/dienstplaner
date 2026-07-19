"""
Deutsche gesetzliche Feiertage - komplett offline berechnet (keine Abhaengigkeit).

Wichtig fuer diese App: Feiertage sind nur ein HINWEIS. Die Fortbildungszentren
koennen an Feiertagen geoeffnet sein - ob Kurse laufen und Personal noetig ist,
entscheidet Nini selbst. Wir schliessen nichts automatisch.

Bundesland-Kuerzel:
BW Baden-Wuerttemberg  BY Bayern            BE Berlin        BB Brandenburg
HB Bremen              HH Hamburg           HE Hessen        MV Meckl.-Vorp.
NI Niedersachsen       NW Nordrhein-Westf.  RP Rheinl.-Pfalz SL Saarland
SN Sachsen             ST Sachsen-Anhalt    SH Schleswig-H.  TH Thueringen
"""

from __future__ import annotations

from datetime import date, timedelta

BUNDESLAENDER = {
    "BW": "Baden-Wuerttemberg", "BY": "Bayern", "BE": "Berlin",
    "BB": "Brandenburg", "HB": "Bremen", "HH": "Hamburg", "HE": "Hessen",
    "MV": "Mecklenburg-Vorpommern", "NI": "Niedersachsen",
    "NW": "Nordrhein-Westfalen", "RP": "Rheinland-Pfalz", "SL": "Saarland",
    "SN": "Sachsen", "ST": "Sachsen-Anhalt", "SH": "Schleswig-Holstein",
    "TH": "Thueringen",
}


def easter_sunday(year: int) -> date:
    """Ostersonntag nach dem anonymen gregorianischen Algorithmus."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def _buss_und_bettag(year: int) -> date:
    """Mittwoch vor dem 23. November (nur Sachsen)."""
    d = date(year, 11, 22)
    while d.weekday() != 2:  # 2 = Mittwoch
        d -= timedelta(days=1)
    return d


def holidays_for(year: int, bundesland: str | None = None) -> dict[str, str]:
    """
    Liefert {"YYYY-MM-DD": "Name"} fuer das Jahr und (optional) Bundesland.
    Ohne Bundesland: nur die bundesweiten Feiertage.
    """
    bl = (bundesland or "").upper()
    e = easter_sunday(year)
    result: dict[date, str] = {}

    def add(d: date, name: str):
        result[d] = name

    # Bundesweit -----------------------------------------------------------
    add(date(year, 1, 1), "Neujahr")
    add(e - timedelta(days=2), "Karfreitag")
    add(e + timedelta(days=1), "Ostermontag")
    add(date(year, 5, 1), "Tag der Arbeit")
    add(e + timedelta(days=39), "Christi Himmelfahrt")
    add(e + timedelta(days=50), "Pfingstmontag")
    add(date(year, 10, 3), "Tag der Deutschen Einheit")
    add(date(year, 12, 25), "1. Weihnachtstag")
    add(date(year, 12, 26), "2. Weihnachtstag")

    # Regional -------------------------------------------------------------
    if bl in ("BW", "BY", "ST"):
        add(date(year, 1, 6), "Heilige Drei Koenige")
    if bl in ("BE", "MV"):
        add(date(year, 3, 8), "Internationaler Frauentag")
    if bl == "BB":
        add(e, "Ostersonntag")
        add(e + timedelta(days=49), "Pfingstsonntag")
    if bl in ("BW", "BY", "HE", "NW", "RP", "SL"):
        add(e + timedelta(days=60), "Fronleichnam")
    if bl in ("SL", "BY"):
        add(date(year, 8, 15), "Mariae Himmelfahrt")
    if bl == "TH":
        add(date(year, 9, 20), "Weltkindertag")
    if bl in ("BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH"):
        add(date(year, 10, 31), "Reformationstag")
    if bl in ("BW", "BY", "NW", "RP", "SL"):
        add(date(year, 11, 1), "Allerheiligen")
    if bl == "SN":
        add(_buss_und_bettag(year), "Buss- und Bettag")

    return {d.isoformat(): name for d, name in sorted(result.items())}


def is_holiday(d: date, bundesland: str | None = None) -> str | None:
    """Name des Feiertags an diesem Datum, sonst None."""
    return holidays_for(d.year, bundesland).get(d.isoformat())


if __name__ == "__main__":
    for bl in ("HH", "BE", "BY"):
        print(f"\n=== {bl} ({BUNDESLAENDER[bl]}) 2026 ===")
        for iso, name in holidays_for(2026, bl).items():
            print(f"  {iso}  {name}")

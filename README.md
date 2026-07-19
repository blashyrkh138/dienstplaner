# Dienstplaner

Lokale Personalplanungs-App für mehrere Fortbildungszentren. Läuft komplett auf
dem eigenen Rechner, keine Cloud. Erstellt pro Standort und Woche einen fairen
Dienstplan-Vorschlag, bleibt dabei voll manuell anpassbar und exportiert nach
Excel und Google Kalender.

## Starten

Doppelklick auf **`run.bat`** (Windows). Beim ersten Start werden die benötigten
Pakete installiert, danach öffnet sich die App im Browser unter
`http://127.0.0.1:8765`.

Manuell:

```
py start.py
```

Voraussetzung: Python 3 (der `py`-Launcher muss funktionieren). Einzige
Zusatzabhängigkeit ist `openpyxl` (für Excel), alles andere ist Standardbibliothek.

## Bedienung (Kurzüberblick)

- **Wochenplan** — Wochenkalender pro Standort. Auto-Plan per Klick, danach frei
  editierbar: leere Fläche anklicken legt eine Schicht an, Schicht anklicken
  bearbeitet/löscht/fixiert sie, Ziehen verschiebt, unterer Rand verlängert.
  Manuell geänderte Schichten werden fixiert und vom Auto-Plan nicht überschrieben.
- **Wochen-Setup** — Abwesenheiten/Wünsche, Kurse (Präsenz/Hybrid/Online) und
  Sonderaufgaben (zbV) der Woche. Der Auto-Plan berücksichtigt alles automatisch.
- **Verfügbarkeit** — erzeugt eine feste Text-Vorlage für die Mitarbeiter
  (Zeitraum schon eingetragen). Deren ausgefüllte Antworten fügt Nini ein; die App
  liest sie offline ein (ohne KI/Kosten), zeigt eine Vorschau mit Personen-Zuordnung
  und schreibt die Verfügbarkeit in die betroffenen Wochen. Optionaler
  Gemini-Prompt für Antworten, die nicht ins Format passen.
- **Stammdaten** — Team pro Standort (feste Zuordnung), vollständiger
  Mitarbeiter-Editor, Standorte anlegen/bearbeiten.
- **Export** — Excel (Aushang + Abrechnung) und Google Kalender `.ics`
  (ein Kalender pro Person = feste Farbe).
- Oben rechts Wochen-Navigation, Warnungen, Theme-Umschalter (dunkel/hell).

## Aufbau

```
start.py            Startet Datenbank, Demo-Daten (nur beim 1. Mal) und Server
run.bat             Doppelklick-Start (installiert openpyxl, ruft start.py)
requirements.txt    openpyxl
data/dienstplan.db  SQLite-Datenbank (eine Datei, leicht zu sichern)

backend/
  db.py             Schema & Datenbankzugriff (SQLite, Standardbibliothek)
  server.py         Lokaler HTTP-Server + JSON-API (http.server)
  planner.py        Auto-Planer (Kurse/Aufgaben -> Grundbesetzung, Regeln, Fairness)
  holidays.py       Deutsche Feiertage pro Bundesland (offline berechnet)
  seed.py           Demo-Daten (3 Standorte, Team, Kataloge)
  export_excel.py   Excel-Export (openpyxl)
  export_ics.py     ICS-Export (Google Kalender)

frontend/
  index.html        App-Shell
  css/tokens.css    Design-Tokens (Maritim/Navy/Gold, dunkel + hell)
  css/app.css       Layout & Komponenten
  js/api.js         API-Client
  js/app.js         Oberfläche: Kalender, Editoren, Setup, Stammdaten, Export

PRODUCT.md / DESIGN.md   Produkt- und Design-System-Dokumentation
```

## Datensicherung

Die gesamte Datenbank liegt in `data/dienstplan.db`. Zum Sichern einfach diese
Datei kopieren; zum Zurücksetzen löschen (beim nächsten Start werden die
Demo-Daten neu angelegt).

## Konzept-Kurzfassung

- Mitarbeiter sind **fest an einen Standort gebunden** und werden nur dort verplant.
- **Grundbesetzung** deckt Öffnung und Präsenzkurse ab; **Hybrid/Online-Kurse**
  und **Sonderaufgaben** bekommen eigens abgestelltes Personal.
- **Telefondienst** ist homeoffice-fähig; jede Schicht kann „Vor Ort" oder
  „Homeoffice" sein.
- **Harte Regeln** (Schule, Abwesenheit, Ruhezeit, Standortbindung …) werden je
  nach Einstellung strikt eingehalten oder als Warnung gemeldet; **weiche Ziele**
  (faire Stunden, Wünsche, zusammenhängende Schichten) werden optimiert.
- Feiertage sind nur ein **Hinweis** — die Zentren können geöffnet bleiben.

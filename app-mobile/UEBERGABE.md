# Übergabe an Myriam — GitHub-Weg

Code liegt öffentlich auf GitHub: **https://github.com/blashyrkh138/dienstplaner**

Es gibt zwei Nutzungsstufen. Stufe 1 funktioniert **sofort**, Stufe 2 schaltet
die volle Automatik frei.

---

## Stufe 1 — Sofort nutzbar (GitHub Pages, ohne Login, ohne Einrichtung)

**App-Adresse:** https://blashyrkh138.github.io/dienstplaner/

Diese URL läuft auf jedem Gerät (Handy, Laptop, Büro-PC). Am Pixel in Chrome
öffnen → Menü (⋮) → **„Zum Startbildschirm hinzufügen"** → App-Icon fertig.

Kann alles: Planen, Auto-Plan, Team, Kurse, Excel-/Kalender-Export,
Verfügbarkeiten per **Einfügen**. Grenzen dieser Stufe:
- **Keine Geräte-Synchronisierung über Drive** — Daten liegen pro Gerät im
  Browser. Für den Wechsel Handy ↔ PC: im Tab „Export“ **Backup-Datei** in
  Google Drive ablegen und am anderen Gerät **Backup laden**.
- **Kein automatischer Mail-Abruf** — Antworten der Mitarbeiter ins Feld einfügen.

Diese Stufe ist gut zum sofortigen Ausprobieren und für einen einzelnen
Hauptrechner völlig ausreichend.

---

## Stufe 2 — Volle Automatik (Artifact mit Gmail + Drive)

Dafür wird die App unter **Myriams eigenem Claude-Konto** als Artifact
veröffentlicht — nur so darf sie auf Myriams Gmail und Drive zugreifen (dann:
Mails per Knopf abrufen + automatische, geräteübergreifende Drive-Speicherung).

### a) Konnektoren verbinden (Myriam, einmalig)
claude.ai → Name unten links → **Einstellungen → Konnektoren** →
**Gmail** und **Google Drive** verbinden.

### b) Repository in ihren Account holen
1. Myriam braucht ein (kostenloses) **GitHub-Konto**.
2. https://github.com/blashyrkh138/dienstplaner öffnen → oben rechts **Fork**
   → jetzt liegt eine Kopie unter `github.com/<myriam>/dienstplaner`.

### c) Artifact veröffentlichen (in claude.ai/code)
1. **claude.ai/code** öffnen (mit Myriams Claude-Konto) → GitHub verbinden →
   ihren Fork `dienstplaner` auswählen.
2. Diesen Text schicken:

   ```
   Veröffentliche app-mobile/dist/dienstplaner-artifact.html unverändert als
   privates Artifact. Nutze das Artifact-Werkzeug mit:
   - file_path: app-mobile/dist/dienstplaner-artifact.html
   - favicon: ⚓  · title: Dienstplaner
   - description: Personalplanung für Fortbildungszentren
   - capabilities: {"mcp": {"servers": [
       {"server":"Gmail","tools":["search_threads","get_thread"]},
       {"server":"Google Drive","tools":["search_files","create_file","download_file_content"]}
     ]}, "downloads": true}
   Gib mir danach die URL.
   ```
3. Die ausgegebene `claude.ai/code/artifact/…`-URL öffnen (mit ihrer Anmeldung),
   beim ersten Zugriff **Erlauben**, dann am Pixel zum Startbildschirm hinzufügen.

---

## Später etwas ändern (bleibt für immer möglich)

1. Änderung im Code umsetzen (lokal oder per Claude), dann:
   ```
   cd app-mobile && node build.mjs
   cd .. && git add -A && git commit -m "…" && git push
   ```
2. **GitHub Pages aktualisiert sich automatisch** (Stufe 1) — nach ~1 Minute
   ist die Änderung unter der Pages-URL live.
3. Für Stufe 2: das Artifact erneut veröffentlichen — dabei **die bestehende
   Artifact-URL mitgeben**, dann bleibt Myriams Link gleich.

---

## Paket für Myriam

- `ANLEITUNG-MYRIAM.pdf`
- Sofort-Link: https://blashyrkh138.github.io/dienstplaner/
- (später) ihr Artifact-Link aus Stufe 2

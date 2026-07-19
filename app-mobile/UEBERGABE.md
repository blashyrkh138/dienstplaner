# Übergabe an Myriam — Weg A (Veröffentlichen aus ihrem Konto)

Ziel: Ein Artifact, das **ihrem** Claude-Konto gehört und deshalb auf **ihre**
Gmail- und Drive-Konnektoren zugreifen darf. Dauert ca. 5 Minuten.

## Vorher (macht Myriam selbst, an ihrem eigenen Gerät)

Auf **claude.ai** anmelden → unten links Name → **Einstellungen** →
**Konnektoren** → **Gmail** und **Google Drive** verbinden.
(Gmail = das Postfach mit den Verfügbarkeits-Mails, Drive = ihre Datenablage.)

## Die 5 Minuten (an Aarons Rechner, Myriam ist dabei)

1. **Terminal öffnen** und in den Projektordner wechseln:
   ```
   cd "C:\Users\Rohleder\Downloads\CLAUDE-AR\Personalplanung"
   ```

2. **Claude Code starten:**
   ```
   claude
   ```

3. **Konto wechseln:** im laufenden Claude-Fenster eingeben:
   ```
   /login
   ```
   → Der Browser öffnet sich. **Myriam meldet sich hier selbst an** (Aaron
   sieht das Passwort nicht). Danach läuft die Sitzung unter ihrem Konto.

4. **Diesen Text einfügen und abschicken:**

   ```
   Bitte veröffentliche die Datei
   app-mobile/dist/dienstplaner-artifact.html
   unverändert als privates Artifact.

   Nutze das Artifact-Werkzeug mit genau diesen Angaben:
   - file_path: app-mobile/dist/dienstplaner-artifact.html
   - favicon: ⚓
   - title: Dienstplaner
   - description: Personalplanung für Fortbildungszentren
   - capabilities:
     {"mcp": {"servers": [
        {"server": "Gmail", "tools": ["search_threads", "get_thread"]},
        {"server": "Google Drive", "tools": ["search_files", "create_file", "download_file_content"]}
      ]},
      "downloads": true}

   Gib mir danach die URL aus.
   ```

5. **URL prüfen:** Die ausgegebene Adresse (`https://claude.ai/code/artifact/…`)
   im Browser öffnen — noch mit Myriams Anmeldung. Die App muss starten und
   oben rechts sollten die Standorte auftauchen. Beim ersten Konnektor-Zugriff
   einmal **Erlauben** klicken.

6. **Zurück wechseln:** in Claude Code `/login` und Aarons Konto wählen.
   URL an Myriam schicken → sie fügt sie am Pixel zum Startbildschirm hinzu.

## Später etwas ändern

Änderungswunsch in Claude Code umsetzen, `node app-mobile/build.mjs` laufen
lassen und dieselbe Datei erneut veröffentlichen — dabei **die bestehende URL
mitgeben**, dann bleibt Myriams Link unverändert:

```
Veröffentliche app-mobile/dist/dienstplaner-artifact.html erneut unter der
bestehenden URL <hier Myriams Artifact-URL>.
```

## Falls Weg A nicht klappt (Netz B)

`app-mobile/dist/dienstplaner-mobil.html` ist dieselbe App als normale
Webseite (149 KB): auf GitHub/Cloudflare Pages legen, Link am Handy zum
Startbildschirm hinzufügen. Alles funktioniert identisch — nur Mails kommen
per Einfügen statt automatisch, und gesichert wird per Backup-Datei.

## Paket für Myriam

- `ANLEITUNG-MYRIAM.pdf` (4 Seiten)
- ihren Artifact-Link aus Schritt 5

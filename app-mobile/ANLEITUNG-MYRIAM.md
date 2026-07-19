# Dienstplaner — Anleitung für Myriam

Liebe Myriam, das ist deine persönliche Personalplanungs-App für alle Standorte.
Sie läuft auf jedem Gerät im Browser (Handy, Laptop, Büro-PC), kostet nichts
und deine Daten gehören nur dir: Sie liegen auf deinem Gerät und in deinem
Google Drive — auf keinem fremden Server.

---

## 1. Sofort loslegen (funktioniert ohne alles)

**Öffne einfach diese Adresse im Browser:**

### https://blashyrkh138.github.io/dienstplaner/

Am Handy (Pixel) in Chrome öffnen → Menü (⋮) → **„Zum Startbildschirm
hinzufügen"** → du hast ein App-Icon wie eine echte App. Am Laptop/Büro-PC
einfach als Lesezeichen speichern.

Damit kannst du **alles** tun: planen, Auto-Plan, Team & Kurse pflegen, Excel-
und Kalender-Export. Verfügbarkeiten fügst du in dieser Stufe von Hand ein.
Deine Daten liegen auf dem jeweiligen Gerät; für den Wechsel zwischen Geräten
nutzt du im Tab **Export** die Knöpfe **Backup-Datei** (speichern) und
**Backup laden**.

## 2. Voll-Automatik freischalten (optional, ca. 10 Minuten)

Wenn die App die Verfügbarkeits-Mails **selbst aus Gmail holen** und sich
**automatisch über Google Drive zwischen allen Geräten abgleichen** soll,
richten wir sie zusätzlich unter **deinem eigenen Claude-Konto** ein. Aaron
hilft dir dabei; die genauen Schritte stehen in `UEBERGABE.md`. Kurz:

1. **Konnektoren verbinden:** claude.ai → dein Name → **Einstellungen →
   Konnektoren** → **Gmail** und **Google Drive** verbinden.
2. Aaron veröffentlicht die App unter deinem Konto (du meldest dich kurz an
   seinem Rechner bei Claude an — er sieht dein Passwort nicht) und du bekommst
   deinen persönlichen App-Link.
3. Link öffnen (mit deinem Konto angemeldet) → beim ersten Zugriff auf Gmail/
   Drive **Erlauben** → zum Startbildschirm hinzufügen.

Danach: Beim Öffnen lädt die App immer den neuesten Stand aus deinem Drive;
jede Änderung wird automatisch dorthin gesichert (neueste gewinnt, ältere
bleiben als Sicherung). Einzige Regel: **nicht auf zwei Geräten gleichzeitig
planen** — erst fertig machen, dann am anderen Gerät neu öffnen.

> Warum kein einfacher Link zum Weiterschicken für die Automatik? Apps mit
> Zugriff auf Mail und Drive sind aus Sicherheitsgründen fest an ein Konto
> gebunden — genau das schützt deine Daten.

---

## 2. Die App im Überblick

**Kopfzeile:** ⚓ Anker = Standort wechseln (Bodensee, Ludwigsburg, Darmstadt …)
· ☀/🌙 = heller/dunkler Modus.

**Unten fünf Tabs:**

### 📅 Plan — der Wochenkalender
- Pfeile ◀ ▶ = Woche wechseln, „Heute" = zur aktuellen Woche.
- Tages-Kästchen oben antippen = zu dem Tag springen; sonst einfach **von
  rechts nach links wischen**. (Handy quer = ganze Woche auf einen Blick.)
- **Farbige Blöcke** = Schichten (Farbe = Person, Kürzel + Uhrzeit stehen drauf).
  Gestrichelter Rand = Telefondienst · ⌂ = Homeoffice · goldener Rahmen =
  **fixiert** (der Auto-Plan lässt diese Schicht in Ruhe).
- **Leere Stelle antippen** = neue Schicht anlegen. **Schicht antippen** =
  bearbeiten, löschen, fixieren.
- Unten: Stunden-Zähler pro Person (Ist/Soll) und der große **Auto-Plan**-Knopf.
- Zahl im Kreis oben rechts = Warnungen (antippen zeigt die Liste).

### ⚙ Setup — was diese Woche anders ist
Drei Listen, je mit „+ Neu":
- **Abwesenheiten & Wünsche** — Urlaub, krank, frei, Wunsch-frei (Fix =
  unantastbar, Wunsch = der Planer versucht es zu erfüllen).
- **Kurse** — Präsenz / Hybrid / Online, auch **mehrtägig** (erster + letzter
  Tag, tägliche Uhrzeit). Personalbedarf: Präsenz = 0 (macht das Standort-Team
  mit), Hybrid/Online = so viele Personen, wie du extra brauchst.
- **Sonderaufgaben (zbV)** — z. B. „umbauen Raum 2+3", mit Personenzahl.

### ✉ Mails — Verfügbarkeiten der Mitarbeiter
1. Oben Zeitraum wählen (ab welchem Montag, wie viele Wochen).
2. **„Vorlage erzeugen"** (oder „Pro Mitarbeiter" mit fertigen Namen) →
   kopieren → per Mail ans Team. Die Vorlage hat **für jede Woche einen eigenen
   Mo–So-Block** und nennt den festen Mail-Betreff.
3. Wenn die Antworten da sind: **„Mails automatisch abrufen"** — die App holt
   sie selbst aus Gmail. (Oder Antworten von Hand ins Feld einfügen →
   „Auswerten".)
4. Vorschau prüfen (wer, welche Woche, welche Tage) → **Übernehmen**. Fertig —
   der Auto-Plan hält sich daran.
- „Claude/Gemini-Prompt": nur für Mails, die sich NICHT an die Vorlage halten —
  Prompt + Mail in Claude/Gemini einfügen, das Ergebnis zurückkopieren.

### 👥 Team — Mitarbeiter & Standorte
Jede Person ist **fest einem Standort** zugeordnet und wird nur dort verplant.
Person antippen = alles einstellen: Kürzel, Farbe, Stunden, an welchen
Wochentagen sie kann (ganz/vm/nm/nicht), Berufsschultage, Rollen (Trainer …),
darf abschließen / allein arbeiten / Homeoffice. Standorte kannst du ebenso
bearbeiten oder neue anlegen (jeder hat 5 Räume).

### ⬇ Export & Daten
- **Excel** — eine Datei mit 2 Blättern: farbiger Wochen-Aushang + Stunden-
  abrechnung pro Person. Mit „→ In Google Drive" liegt sie sofort auch am PC.
- **Google Kalender (.ics)** — alle zusammen oder pro Person (feste Farbe!).
  Am PC in Google Kalender importieren: Einstellungen → Importieren.
- **Datensicherung** — „Backup-Datei" erstellt eine Kopie aller Daten;
  „Backup laden" spielt sie zurück. „Demo zurücksetzen" = Neustart mit
  Beispieldaten (Vorsicht: ersetzt alles).

---

## 3. Wie der Auto-Plan denkt

Wenn du auf **Auto-Plan** drückst, passiert Folgendes, in dieser Reihenfolge:
1. **Fixierte Schichten bleiben unangetastet** (alles mit goldenem Rahmen —
   auch alles, was du von Hand angelegt oder verschoben hast).
2. **Feste Bedarfe zuerst:** Hybrid-/Online-Kurse mit Personalbedarf und
   Sonderaufgaben werden besetzt — bevorzugt mit der passenden Rolle
   (z. B. Trainer) und mehrtägige Kurse an jedem Kurstag.
3. **Dann die Grundbesetzung:** Die Öffnungszeiten werden mit dem Standort-Team
   aufgefüllt (Vormittag mehr, Nachmittag weniger — pro Standort einstellbar).
4. **Dabei gilt immer:** Niemand wird verplant, der nicht kann (Verfügbarkeit,
   Urlaub, Berufsschule, freie Tage), niemand über seine Stunden-Grenzen, und
   die **Stunden werden fair verteilt** (wer unter seinem Soll ist, kommt zuerst
   dran). Azubis stehen nie allein.
5. **Was nicht aufgeht, wird nicht versteckt:** Unterbesetzung, fehlende
   Schließberechtigung usw. erscheinen als **Warnungen** — du entscheidest.

**Wichtig: Diese Logik ist nicht in Stein gemeißelt.** Wenn dir etwas nicht
passt („Samstage sollen anders laufen", „Frau X maximal 2 Spätdienste", neue
Regel, neuer Knopf, andere Farben …), sag einfach Bescheid — die Änderung wird
in **Claude Code** eingebaut und die App unter **derselben Adresse**
aktualisiert. Dein Link bleibt gleich, beim nächsten Öffnen ist die Änderung da.

Es gibt nichts, was festgelegt wäre: Regeln, Texte, Farben, ganze neue
Funktionen — **die App gehört dir und wächst mit deinen Wünschen.** Beschreib
einfach in normalen Worten, was anders sein soll.

---

## 4. Gut zu wissen

- **Kosten:** keine. Kein Server, keine Abos außer deinem Claude-Konto.
- **Datenschutz:** Personaldaten liegen nur auf deinen Geräten und in deinem
  Google Drive.
- **Fester Mail-Betreff:** Die Mitarbeiter müssen den Betreff aus der Vorlage
  benutzen (z. B. „Verfügbarkeit KW36–39") — nur so findet der automatische
  Abruf die Mails.
- **Erster Start:** Die App kommt mit Beispieldaten. Ersetze im Tab **Team**
  die Beispiel-Personen durch dein echtes Team — dann kann es losgehen.
- **Wenn mal etwas klemmt:** Die App zeigt Fehler als Meldung an. Mach ein
  Foto/Screenshot davon und schick es in einen Claude-Chat — zusammen mit der
  App-Datei kann Claude fast alles reparieren.
- **Backup-Gewohnheit:** Dein Drive sichert automatisch. Zusätzlich einmal im
  Monat „Backup-Datei" drücken schadet nie.

Viel Freude mit deiner neuen Planung! ⚓

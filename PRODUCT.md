# Product

## Register

product

## Users

Nini (Myriam) plant die Personaleinsätze mehrerer Fortbildungszentren in
Deutschland (u. a. Bodensee/Konstanz, Ludwigsburg, Darmstadt). Sie ist nicht
technisch, arbeitet oft stundenlang am Laptop an den Wochenplänen und muss
schnell auf ständig wechselnde Verfügbarkeiten, Freiwünsche, Kurse und
Sonderaufgaben reagieren. Mitarbeiter sind fest an ihren Standort gebunden.

## Product Purpose

Eine lokal auf ihrem Laptop laufende App, die pro Standort und Woche einen
gültigen, fairen Dienstplan erzeugt und dabei maximal entlastet, ohne ihr die
Kontrolle zu nehmen. Kern: eine Wochen-Kalenderansicht (personenbasierte,
farbige Schichtblöcke) mit Auto-Planer, vollständig manueller Nachbearbeitung,
Live-Warnungen und Export nach Excel und Google Kalender (.ics). Erfolg = Nini
erstellt eine Woche in Minuten statt Stunden und vertraut dem Ergebnis.

## Brand Personality

Präzise, ruhig, handwerklich, vertrauenswürdig. Charakter eines hochwertigen
nautischen Instruments: tiefes Marine-Navy, Messing-/Champagner-Gold als feiner
Akzent, klare Skalen und Raster. Das Werkzeug tritt hinter die Aufgabe zurück,
zeigt aber Sorgfalt im Detail. Drei Worte: **präzise, maritim, souverän.**

## Anti-references

- Der bisherige Prototyp: Glassmorphism überall + Gradient-Text auf Überschriften
  (wirkt beliebig/verspielt) — bewusst NICHT wiederholen.
- Generisches "Navy-und-Gold-Fintech" / SaaS-Dashboard von der Stange.
- Überladene Enterprise-Schichtplaner (Tabellenwüsten, graue Dichte ohne Hierarchie).
- Dekorative Animationen, verspielte Effekte, bunte Farbverläufe als Deko.

## Design Principles

1. **Das Raster ist das Produkt.** Die Wochenansicht muss auf einen Blick lesbar
   sein: Zeitachse als präzise Skala, Personen durch Farbe UND Kürzel eindeutig.
2. **Entlasten, nie entmündigen.** Automatik schlägt vor; jede Zelle bleibt
   manuell überschreib- und fixierbar. Nichts ist hart verdrahtet.
3. **Warnungen statt Verbote.** Konflikte werden ruhig sichtbar gemacht, nicht
   erzwungen — Nini entscheidet.
4. **Ruhe unter Dichte.** Viel Information, aber klare Hierarchie und Ruheflächen;
   Farbe nur für Bedeutung (Person, Zustand), nie als Dekoration.
5. **Sorgfalt im Detail.** Tabellenziffern, saubere Ausrichtung, präzise Kanten —
   das "Instrument"-Gefühl entsteht aus Genauigkeit, nicht aus Effekten.

## Accessibility & Inclusion

WCAG AA: Fließtext ≥ 4.5:1, große Elemente ≥ 3:1 — auch im dunklen Modus geprüft.
Personen werden nie allein über Farbe unterschieden (immer Kürzel/Name dabei),
wegen Farbsehschwäche. `prefers-reduced-motion` respektiert (Übergänge werden zu
Crossfades/instant). Voll per Tastatur bedienbar, sichtbarer Fokus.

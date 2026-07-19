# Design

Visuelles System des Dienstplaners. Charakter: **hochwertiges nautisches
Instrument** — dunkles Marine-Navy als Standard, Messing/Champagner-Gold als
feiner Akzent, präzise Skalen. Heller Modus umschaltbar. Offline, keine CDNs.

## Theme

Dark-first. Zwei Themes über `:root[data-theme="dark"|"light"]`. Standard = dark.
Farbstrategie: **Restrained** — getönte Neutrale (Navy-Rampe) + ein Akzent
(Gold) < 10 % der Fläche, ausschließlich für primäre Aktion, aktuelle Auswahl,
Fokus und Zustands-Indikatoren. Personenfarben tragen die Schichtblöcke.

## Color palette (OKLCH)

Dark (Standard):
- `--bg`        oklch(0.16 0.030 245)  Tiefstes Marine-Navy (App-Hintergrund)
- `--surface`   oklch(0.21 0.032 245)  Panels, Sidebar
- `--surface-2` oklch(0.25 0.034 245)  Erhöhte Flächen, Kopfzeilen, Zellen-Hover
- `--line`      oklch(0.34 0.028 245)  Hairlines/Raster
- `--line-strong` oklch(0.44 0.030 245) betonte Kanten
- `--ink`       oklch(0.96 0.010 240)  Primärtext
- `--ink-muted` oklch(0.75 0.022 240)  Sekundärtext (≥4.5:1 auf surface)
- `--ink-faint` oklch(0.60 0.020 240)  Skalen-Ticks, Deko-Labels (nur groß)
- `--accent`    oklch(0.82 0.11 84)    Champagner-Gold (Akzent/Selektion)
- `--accent-strong` oklch(0.72 0.13 78) Messing (Hover/aktiv des Akzents)
- `--accent-ink` oklch(0.20 0.04 80)   Text auf Gold-Flächen (dunkel, hoher Kontrast)
- `--brass-line` oklch(0.66 0.08 82 / 0.5) feine Messing-Trennlinie (Instrument)

Semantik (dark):
- `--danger`  oklch(0.64 0.17 25) · `--warning` oklch(0.80 0.13 75) · `--success` oklch(0.72 0.12 155) · `--info` oklch(0.72 0.09 235)
- Zustandsflächen als 12–16 % Alpha der jeweiligen Farbe.

Light (umschaltbar):
- `--bg`        oklch(0.975 0.006 240) Kühles Off-White (kein Cream)
- `--surface`   oklch(1 0 0) · `--surface-2` oklch(0.965 0.008 240)
- `--line`      oklch(0.90 0.010 240) · `--line-strong` oklch(0.82 0.012 240)
- `--ink`       oklch(0.24 0.030 245) · `--ink-muted` oklch(0.44 0.030 245) · `--ink-faint` oklch(0.58 0.025 245)
- `--accent`    oklch(0.62 0.13 78)  · `--accent-ink` oklch(1 0 0)

Personenfarben: kommen aus den Mitarbeiter-Datensätzen (Hex). Blöcke werden mit
der Personenfarbe gefüllt; Textfarbe (weiß/navy) automatisch nach Helligkeit.
Farbe steht NIE allein — immer Kürzel/Name im Block.

## Typography

Eine Familie: System-Sans-Stack (`ui-sans-serif, system-ui, "Segoe UI",
Roboto, Inter, sans-serif`) — offline, vertraut, dicht. Zusätzlich Mono-Stack
(`ui-monospace, "Cascadia Code", "Segoe UI Mono", monospace`) NUR für Zeit-Skala,
Uhrzeiten und Stundenwerte → Instrument-Charakter. `font-variant-numeric:
tabular-nums` überall dort, wo Zahlen ausgerichtet stehen.

Feste rem-Skala (Ratio ~1.2), kein clamp:
`--text-xs .75 · --sm .8125 · --base .875 (14px) · --md 1 · --lg 1.125 · --xl 1.375 · --2xl 1.75`
Gewichte: 400 Text, 500 Labels/aktiv, 600 Überschriften/Buttons, 680 Zahlen-Akzent.
Keine Gradient-Texte. Keine All-Caps-Sätze; Uppercase nur für kurze Labels
(≤3 Wörter), sparsam, mit +0.06em Tracking.

## Spacing & Radius

4px-Raster: `--sp-1 4 · 2 8 · 3 12 · 4 16 · 5 20 · 6 24 · 8 32 · 10 40 · 12 48`.
Radien eher straff (Instrument): `--r-sm 6 · --r-md 9 · --r-lg 13 · --r-pill 999`.

## Elevation

Dark: Tiefe über Schatten + feine obere Innenkante (1px `--line-strong` inset)
statt Glas. `--shadow-1 0 1px 2px rgb(0 0 0/.4)` · `--shadow-2 0 8px 24px -8px
rgb(0 0 0/.55)`. Glassmorphism nur ausnahmsweise (z. B. schwebende Ebene über
dem Kalender), nie als Default.

## Components

- **App-Shell:** Linke Sidebar (`--surface`) mit Marke, Standort-Umschalter,
  Navigation. Obere Leiste mit Wochen-Navigation, Auto-Plan, Warnungen, Theme,
  Export. Content = Wochenkalender.
- **Wochenkalender:** Zeitachse links als Mono-Skala mit Messing-Ticks; 7
  Tagesspalten; oben eine Ganztags-/Status-Zeile (Urlaub/frei/Schule/zbV);
  Schichtblöcke in Personenfarbe mit Kürzel + Zeit; „heute" dezent hervorgehoben;
  Feiertage als ruhiger Hinweis in der Spaltenkopfzeile.
- **Buttons:** Primär = Gold-Fläche + `--accent-ink`. Sekundär = `--surface-2` +
  `--line`. Ghost = nur Text/Icon. Alle Zustände (hover/focus/active/disabled).
- **Chips/Badges:** Standort- und Zustands-Chips; Warnungs-Badge mit Zähler.
- **Formulare/Panels:** Einstellungen als rechte Schublade oder eigene Seite;
  konsistente Feld-Vokabeln; Fokus-Ring in Gold.
- Fokus sichtbar (2px Gold-Ring + Offset). Skeleton-Ladezustände statt Spinner.
  Leerzustände erklären die Ansicht.

## Motion

150–220 ms, ease-out (quart/expo). Nur Zustands-/Feedback-/Reveal-Bewegung, keine
Deko-Choreografie. `prefers-reduced-motion` → Crossfade/instant. Drag & Drop:
Block folgt Cursor mit leichtem Heben (Schatten), Zielspalte hebt sich subtil.

## Absolute bans (projektspezifisch)

Kein Gradient-Text, kein Default-Glassmorphism, keine farbigen Seiten-Streifen
(border-left) als Akzent, keine Deko-Animationen. Personen nie nur per Farbe.

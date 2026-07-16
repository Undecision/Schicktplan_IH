# Browser- & Responsive-Tests (P11.2)

Ziel: Kompatibilität mit **Microsoft Edge, Google Chrome, Firefox** sowie
Bedienbarkeit auf **Desktop, Tablet und Smartphone**.

## Verantwortliches Layout

Die Oberfläche basiert auf Tailwind mit responsiven Breakpoints (`sm`, `md`,
`lg`, `xl`). Wesentliche Muster:

- Kachel-/Grid-Layouts (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`) brechen auf
  kleinen Viewports auf eine Spalte um.
- Filter-/Formularzeilen nutzen `flex-wrap`; Tabellen scrollen horizontal.
- Die Sidebar-Shell ist für Desktop optimiert; auf schmalen Viewports bleibt der
  Inhalt bedienbar (Scroll).

## Zielviewports (Smoke-Test)

| Gerät      | Viewport | Prüfpunkte                                                                 |
| ---------- | -------- | -------------------------------------------------------------------------- |
| Desktop    | 1440×900 | Dashboard-Kacheln 4-spaltig, Tabellen ohne horizontales Scrollen der Seite |
| Tablet     | 834×1112 | Kacheln 2-spaltig, Filter umgebrochen, Dialoge nutzbar                     |
| Smartphone | 390×844  | Einspaltig, Suchleiste/Buttons erreichbar, Tabellen horizontal scrollbar   |

## Durchführung

Manuell je Browser (Edge/Chrome/Firefox) die Kernflows durchklicken: Login →
Dashboard → Schichtbuch (Suche/Filter, Eintrag anlegen) → Bericht → Übergabe
(PDF) → Auswertung (Export).

Automatisierbar mit Playwright über mehrere Projekte/Viewports, z. B.:

```ts
// playwright.config – Auszug (Beispiel)
projects: [
  { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox-desktop", use: { ...devices["Desktop Firefox"] } },
  { name: "edge-desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  { name: "tablet", use: { ...devices["iPad (gen 7)"] } },
  { name: "mobile", use: { ...devices["iPhone 13"] } },
];
```

Ergebnis je Browser/Viewport in `docs/abnahme.md` (Kriterium 11) vermerken.

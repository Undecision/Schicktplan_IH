import { UEBERGABE_STATUS_LABELS, type UebergabeDetail } from "@schichtbuch/shared";

/** HTML-Escaping, damit Freitext/Namen kein Layout aufbrechen (kein XSS im PDF). */
function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function datum(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

function textblock(text: string | null): string {
  return text ? esc(text).replace(/\n/g, "<br/>") : '<span class="leer">—</span>';
}

function eintragListe(
  eintraege: { beschreibung: string; prioritaet: string; technischerPlatz: { name: string } }[],
): string {
  if (eintraege.length === 0) return '<p class="leer">—</p>';
  return `<ul>${eintraege
    .map(
      (e) =>
        `<li><strong>[${esc(e.prioritaet)}]</strong> ${esc(e.beschreibung)} <span class="tp">(${esc(
          e.technischerPlatz.name,
        )})</span></li>`,
    )
    .join("")}</ul>`;
}

/** Erzeugt das unterschriftsfähige HTML-Dokument der Schichtübergabe (A4-Druck). */
export function renderUebergabeHtml(u: UebergabeDetail, appName: string): string {
  const abschnitt = (titel: string, inhalt: string) =>
    `<section><h2>${esc(titel)}</h2>${inhalt}</section>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 18mm 16mm 22mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; line-height: 1.45; }
  header.doc { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 14px; }
  header.doc .titel { font-size: 18px; font-weight: 700; color: #1e3a5f; }
  header.doc .meta { text-align: right; font-size: 10px; color: #444; }
  .kopf { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px; margin-bottom: 14px; }
  .kopf .zelle { border: 1px solid #ccc; border-radius: 4px; padding: 6px 8px; }
  .kopf .label { font-size: 9px; text-transform: uppercase; color: #666; letter-spacing: .04em; }
  .kopf .wert { font-size: 12px; font-weight: 600; }
  section { margin-bottom: 12px; break-inside: avoid; }
  h2 { font-size: 12px; color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin: 0 0 6px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 3px; }
  .tp { color: #666; }
  .leer { color: #999; }
  .signaturen { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 34px; }
  .sig .linie { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #444; }
  .sig .name { font-size: 11px; font-weight: 600; min-height: 14px; }
  footer.doc { position: fixed; bottom: 8mm; left: 0; right: 0; text-align: center;
    font-size: 9px; color: #888; }
</style>
</head>
<body>
  <header class="doc">
    <div>
      <div class="titel">Schichtübergabe</div>
      <div>${esc(appName)} · Instandhaltung</div>
    </div>
    <div class="meta">
      Status: ${esc(UEBERGABE_STATUS_LABELS[u.status])}<br/>
      ${u.uebergebenAm ? `Übergeben am ${datum(u.uebergebenAm)}` : "Entwurf"}
    </div>
  </header>

  <div class="kopf">
    <div class="zelle"><div class="label">Datum</div><div class="wert">${datum(u.datum)}</div></div>
    <div class="zelle"><div class="label">Schicht</div><div class="wert">${esc(u.schicht.name)} (${esc(u.beginn)}–${esc(u.ende)})</div></div>
    <div class="zelle"><div class="label">Gewerk</div><div class="wert">${esc(u.gewerk.name)}</div></div>
    <div class="zelle"><div class="label">Offen / Laufend</div><div class="wert">${u.offeneStoerungen} / ${u.laufendeArbeiten}</div></div>
  </div>

  ${abschnitt(`Offene Störungen (${u.offeneStoerungenListe.length})`, eintragListe(u.offeneStoerungenListe))}
  ${abschnitt(`Laufende Arbeiten (${u.laufendeArbeitenListe.length})`, eintragListe(u.laufendeArbeitenListe))}
  ${abschnitt(`In dieser Schicht abgeschlossen (${u.abgeschlosseneListe.length})`, eintragListe(u.abgeschlosseneListe))}
  ${abschnitt("Sicherheitsinformationen", `<p>${textblock(u.sicherheitshinweise)}</p>`)}
  ${abschnitt("Freischaltungen", `<p>${textblock(u.freischaltungen)}</p>`)}
  ${abschnitt("Arbeitsgenehmigungen", `<p>${textblock(u.arbeitsgenehmigungen)}</p>`)}
  ${abschnitt("Wichtige Termine", `<p>${textblock(u.wichtigeTermine)}</p>`)}
  ${abschnitt("Besondere Hinweise", `<p>${textblock(u.besondereHinweise)}</p>`)}

  <div class="signaturen">
    <div class="sig">
      <div class="name">${esc(u.uebergebenVon?.name ?? "")}</div>
      <div class="linie">Übergebende Schicht (Datum, Unterschrift)</div>
    </div>
    <div class="sig">
      <div class="name">${esc(u.uebernommenVon?.name ?? "")}</div>
      <div class="linie">Übernehmende Schicht (Datum, Unterschrift)</div>
    </div>
  </div>

  <footer class="doc">${esc(appName)} – Instandhaltungsschichtbuch · automatisch erzeugt</footer>
</body>
</html>`;
}

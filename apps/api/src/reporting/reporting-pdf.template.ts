import {
  AUSWERTUNG_TYP_LABELS,
  PRIORITAET_LABELS,
  STATUS_LABELS,
  type AuswertungResult,
  type EintragStatus,
  type Prioritaet,
} from "@schichtbuch/shared";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function datum(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function renderAuswertungHtml(result: AuswertungResult, appName: string): string {
  const gruppenRows = result.gruppen
    .map(
      (g) =>
        `<tr><td>${esc(g.label)}</td><td class="num">${g.anzahl}</td><td class="num">${g.offen}</td><td class="num">${g.erledigt}</td><td class="num">${g.kritisch}</td></tr>`,
    )
    .join("");

  const statusRows = result.statusVerteilung
    .map(
      (v) =>
        `<tr><td>${esc(STATUS_LABELS[v.status as EintragStatus])}</td><td class="num">${v.anzahl}</td></tr>`,
    )
    .join("");
  const prioRows = result.prioritaetVerteilung
    .map(
      (v) =>
        `<tr><td>${esc(PRIORITAET_LABELS[v.prioritaet as Prioritaet])}</td><td class="num">${v.anzahl}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8" /><style>
  @page { size: A4; margin: 16mm 14mm 20mm 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111; font-size:11px; }
  header { display:flex; justify-content:space-between; border-bottom:2px solid #1e3a5f; padding-bottom:8px; margin-bottom:12px; }
  h1 { font-size:17px; color:#1e3a5f; margin:0; }
  h2 { font-size:12px; color:#1e3a5f; margin:14px 0 6px; }
  .meta { text-align:right; font-size:10px; color:#555; }
  .kpi { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:10px 0; }
  .kpi .box { border:1px solid #ccc; border-radius:5px; padding:8px; text-align:center; }
  .kpi .zahl { font-size:20px; font-weight:700; }
  .kpi .lab { font-size:9px; color:#666; text-transform:uppercase; }
  table { width:100%; border-collapse:collapse; margin-top:4px; }
  th, td { border:1px solid #ddd; padding:4px 6px; text-align:left; }
  th { background:#f0f3f7; font-size:10px; }
  td.num, th.num { text-align:right; }
  .split { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  footer { position:fixed; bottom:8mm; left:0; right:0; text-align:center; font-size:9px; color:#888; }
</style></head><body>
  <header>
    <div><h1>${esc(AUSWERTUNG_TYP_LABELS[result.typ])}</h1>
    <div>${esc(appName)} · Instandhaltung</div></div>
    <div class="meta">Zeitraum: ${datum(result.von)} – ${datum(result.bis)}<br/>Erstellt: ${datum(result.erzeugtAm)}</div>
  </header>

  <div class="kpi">
    <div class="box"><div class="zahl">${result.kennzahlen.gesamt}</div><div class="lab">Einträge</div></div>
    <div class="box"><div class="zahl">${result.kennzahlen.offen}</div><div class="lab">Offen</div></div>
    <div class="box"><div class="zahl">${result.kennzahlen.erledigt}</div><div class="lab">Erledigt</div></div>
    <div class="box"><div class="zahl">${result.kennzahlen.kritisch}</div><div class="lab">Kritisch</div></div>
  </div>

  <div class="split">
    <div><h2>Nach Status</h2><table><tr><th>Status</th><th class="num">Anzahl</th></tr>${statusRows || '<tr><td colspan="2">—</td></tr>'}</table></div>
    <div><h2>Nach Priorität</h2><table><tr><th>Priorität</th><th class="num">Anzahl</th></tr>${prioRows || '<tr><td colspan="2">—</td></tr>'}</table></div>
  </div>

  <h2>Aufschlüsselung (${result.gruppen.length})</h2>
  <table>
    <tr><th>Gruppe</th><th class="num">Einträge</th><th class="num">Offen</th><th class="num">Erledigt</th><th class="num">Kritisch</th></tr>
    ${gruppenRows || '<tr><td colspan="5">Keine Daten im Zeitraum.</td></tr>'}
  </table>

  <footer>${esc(appName)} – Instandhaltungsschichtbuch · automatisch erzeugt</footer>
</body></html>`;
}

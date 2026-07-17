import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Filter,
  Info,
  Paperclip,
} from "lucide-react";
import {
  EINTRAG_STATUS,
  EINTRAG_TYP_LABELS,
  EintragTyp,
  PRIORITAETEN,
  PRIORITAET_LABELS,
  STATUS_LABELS,
  type SchichtbucheintragListItem,
} from "@schichtbuch/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PrioritaetBadge, StatusBadge } from "./badges";
import { formatDauer } from "./eintrag-detail-page";
import { Highlighted } from "./highlight";

type Item = SchichtbucheintragListItem;
type Richtung = "asc" | "desc";
type FilterTyp = "set" | "text" | "none";

interface Spalte {
  key: string;
  label: string;
  filter: FilterTyp;
  /** Vergleichswert für die Sortierung. */
  sort: (e: Item) => string | number;
  /** Text für Filter/Distinct. */
  text: (e: Item) => string;
  /** Zellinhalt. */
  render: (e: Item) => React.ReactNode;
  className?: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WOCHENTAGE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];
function formatTag(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${WOCHENTAGE[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function tagKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

const SPALTEN: Spalte[] = [
  {
    key: "zeitpunkt",
    label: "Zeitpunkt",
    filter: "none",
    sort: (e) => new Date(e.zeitpunkt).getTime(),
    text: (e) => formatDateTime(e.zeitpunkt),
    render: (e) => <span className="whitespace-nowrap">{formatDateTime(e.zeitpunkt)}</span>,
  },
  {
    key: "typ",
    label: "Typ",
    filter: "set",
    sort: (e) => EINTRAG_TYP_LABELS[e.typ],
    text: (e) => EINTRAG_TYP_LABELS[e.typ],
    render: (e) => <TypBadge typ={e.typ} />,
  },
  {
    key: "prioritaet",
    label: "Priorität",
    filter: "set",
    sort: (e) => PRIORITAETEN.indexOf(e.prioritaet),
    text: (e) => PRIORITAET_LABELS[e.prioritaet],
    render: (e) => <PrioritaetBadge prioritaet={e.prioritaet} />,
  },
  {
    key: "status",
    label: "Status",
    filter: "set",
    sort: (e) => EINTRAG_STATUS.indexOf(e.status),
    text: (e) => STATUS_LABELS[e.status],
    render: (e) => <StatusBadge status={e.status} />,
  },
  {
    key: "gewerk",
    label: "Gewerk",
    filter: "set",
    sort: (e) => e.gewerk.name,
    text: (e) => e.gewerk.name,
    render: (e) => <span className="whitespace-nowrap">{e.gewerk.name}</span>,
  },
  {
    key: "schicht",
    label: "Schicht",
    filter: "set",
    sort: (e) => e.schicht.name,
    text: (e) => e.schicht.name,
    render: (e) => <span className="whitespace-nowrap">{e.schicht.name}</span>,
  },
  {
    key: "technischerPlatz",
    label: "Techn. Platz",
    filter: "set",
    sort: (e) => e.technischerPlatz.name,
    text: (e) => e.technischerPlatz.name,
    render: (e) => <span className="whitespace-nowrap">{e.technischerPlatz.name}</span>,
  },
  {
    key: "sapIhAuftrag",
    label: "SAP-Auftrag",
    filter: "text",
    sort: (e) => e.sapIhAuftrag ?? "",
    text: (e) => e.sapIhAuftrag ?? "",
    render: (e) => (
      <span className="whitespace-nowrap tabular-nums">
        {e.sapIhAuftrag || <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    key: "dauer",
    label: "Dauer",
    filter: "none",
    sort: (e) => e.bearbeitungsdauerMinuten ?? -1,
    text: (e) => formatDauer(e.bearbeitungsdauerMinuten),
    render: (e) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDauer(e.bearbeitungsdauerMinuten)}
      </span>
    ),
  },
  {
    key: "beschreibung",
    label: "Beschreibung",
    filter: "text",
    sort: (e) => e.beschreibung,
    text: (e) => e.beschreibung,
    render: (e) => (
      <div className="flex items-center gap-1.5">
        {e.anzahlAnhaenge > 0 && (
          <span
            className="flex shrink-0 items-center gap-0.5 text-muted-foreground"
            title={`${e.anzahlAnhaenge} Anhang/Anhänge`}
          >
            <Paperclip className="h-3.5 w-3.5" />
            {e.anzahlAnhaenge > 1 && <span className="text-xs">{e.anzahlAnhaenge}</span>}
          </span>
        )}
        <span className="truncate">
          <Highlighted text={e.highlight} fallback={e.beschreibung} />
        </span>
      </div>
    ),
  },
];

export function EintraegeTabelle({
  eintraege,
  isLoading,
  onRowClick,
}: {
  eintraege: Item[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState("zeitpunkt");
  const [sortDir, setSortDir] = useState<Richtung>("desc");
  const [setFilter, setSetFilter] = useState<Record<string, Set<string>>>({});
  const [textFilter, setTextFilter] = useState<Record<string, string>>({});

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "zeitpunkt" || key === "dauer" ? "desc" : "asc");
    }
  }

  // Distinct-Werte je Set-Spalte aus dem gesamten Datenbestand (stabil).
  const distinct = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const spalte of SPALTEN) {
      if (spalte.filter !== "set") continue;
      map[spalte.key] = [...new Set(eintraege.map((e) => spalte.text(e)))].sort((a, b) =>
        a.localeCompare(b),
      );
    }
    return map;
  }, [eintraege]);

  // Client-seitige Filterung (Excel-artig).
  const gefiltert = useMemo(() => {
    return eintraege.filter((e) => {
      for (const spalte of SPALTEN) {
        if (spalte.filter === "set") {
          const erlaubt = setFilter[spalte.key];
          if (erlaubt && erlaubt.size > 0 && !erlaubt.has(spalte.text(e))) return false;
        } else if (spalte.filter === "text") {
          const q = textFilter[spalte.key]?.trim().toLowerCase();
          if (q && !spalte.text(e).toLowerCase().includes(q)) return false;
        }
      }
      return true;
    });
  }, [eintraege, setFilter, textFilter]);

  // Gruppierung nach Tag → Schicht; Gruppen chronologisch (neueste zuerst),
  // Zeilen innerhalb der Gruppe nach gewählter Spalte. Trennung bleibt erhalten.
  const gruppen = useMemo(() => {
    const spalte = SPALTEN.find((s) => s.key === sortKey) ?? SPALTEN[0]!;
    const byKey = new Map<
      string,
      { tag: string; schicht: string; repZeit: number; rows: Item[] }
    >();
    for (const e of gefiltert) {
      const key = `${tagKey(e.zeitpunkt)}|${e.schicht.id}`;
      let g = byKey.get(key);
      if (!g) {
        g = { tag: tagKey(e.zeitpunkt), schicht: e.schicht.name, repZeit: 0, rows: [] };
        byKey.set(key, g);
      }
      g.rows.push(e);
      g.repZeit = Math.max(g.repZeit, new Date(e.zeitpunkt).getTime());
    }
    // Gruppen nach Zeit ordnen; Richtung folgt der Zeit-Sortierung, sonst neueste zuerst.
    const gruppenRichtung: Richtung = sortKey === "zeitpunkt" ? sortDir : "desc";
    const liste = [...byKey.values()].sort((a, b) =>
      gruppenRichtung === "asc" ? a.repZeit - b.repZeit : b.repZeit - a.repZeit,
    );
    // Zeilen innerhalb jeder Gruppe sortieren.
    const cmp = (a: Item, b: Item) => {
      const va = spalte.sort(a);
      const vb = spalte.sort(b);
      let r: number;
      if (typeof va === "number" && typeof vb === "number") r = va - vb;
      else r = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? r : -r;
    };
    for (const g of liste) g.rows.sort(cmp);
    return liste;
  }, [gefiltert, sortKey, sortDir]);

  const spaltenAnzahl = SPALTEN.length;
  const filterAktiv =
    Object.values(setFilter).some((s) => s && s.size > 0) ||
    Object.values(textFilter).some((t) => t && t.trim());

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {SPALTEN.map((spalte) => (
              <TableHead key={spalte.key} className="whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium hover:text-foreground"
                    onClick={() => toggleSort(spalte.key)}
                    title="Sortieren"
                  >
                    {spalte.label}
                    {sortKey === spalte.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowDownUp className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                  {spalte.filter !== "none" && (
                    <SpaltenFilter
                      spalte={spalte}
                      werte={distinct[spalte.key] ?? []}
                      setAuswahl={setFilter[spalte.key]}
                      textWert={textFilter[spalte.key] ?? ""}
                      onSet={(s) => setSetFilter((prev) => ({ ...prev, [spalte.key]: s }))}
                      onText={(t) => setTextFilter((prev) => ({ ...prev, [spalte.key]: t }))}
                    />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={spaltenAnzahl} className="text-center text-muted-foreground">
                Lädt…
              </TableCell>
            </TableRow>
          )}
          {!isLoading && gruppen.length === 0 && (
            <TableRow>
              <TableCell colSpan={spaltenAnzahl} className="text-center text-muted-foreground">
                {filterAktiv
                  ? "Keine Einträge für die aktuellen Filter."
                  : "Keine Einträge gefunden."}
              </TableCell>
            </TableRow>
          )}
          {gruppen.map((g, i) => {
            const neuerTag = i === 0 || gruppen[i - 1]?.tag !== g.tag;
            return (
              <TableGruppe key={`${g.tag}|${g.schicht}`}>
                {neuerTag && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={spaltenAnzahl}
                      className="bg-muted/60 py-1.5 text-sm font-semibold"
                    >
                      {formatTag(g.rows[0]!.zeitpunkt)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={spaltenAnzahl}
                    className="border-t-2 border-primary/30 py-1 text-xs font-medium text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowDownUp className="h-3 w-3" />
                      {neuerTag ? g.schicht : `Schichtwechsel · ${g.schicht}`}
                    </span>
                  </TableCell>
                </TableRow>
                {g.rows.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => onRowClick(e.id)}>
                    {SPALTEN.map((spalte) => (
                      <TableCell key={spalte.key} className={spalte.className}>
                        {spalte.render(e)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableGruppe>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** Fragment-Wrapper, damit Gruppen einen Key tragen können. */
function TableGruppe({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function TypBadge({ typ }: { typ: EintragTyp }) {
  const istStoerung = typ === EintragTyp.STOERUNG;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        istStoerung ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
      )}
    >
      {istStoerung ? <AlertTriangle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
      {EINTRAG_TYP_LABELS[typ]}
    </span>
  );
}

/** Excel-artiger Spaltenfilter: Checkboxliste (Set) bzw. Enthält-Text. */
function SpaltenFilter({
  spalte,
  werte,
  setAuswahl,
  textWert,
  onSet,
  onText,
}: {
  spalte: Spalte;
  werte: string[];
  setAuswahl: Set<string> | undefined;
  textWert: string;
  onSet: (s: Set<string>) => void;
  onText: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [suche, setSuche] = useState("");
  const aktiv = spalte.filter === "set" ? !!setAuswahl && setAuswahl.size > 0 : !!textWert.trim();

  const gefilterteWerte = useMemo(
    () => werte.filter((w) => w.toLowerCase().includes(suche.toLowerCase())),
    [werte, suche],
  );

  function toggleWert(w: string) {
    const next = new Set(setAuswahl ?? []);
    if (next.has(w)) next.delete(w);
    else next.add(w);
    onSet(next);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={cn(
          "rounded p-0.5 hover:bg-accent",
          aktiv ? "text-primary" : "text-muted-foreground/50",
        )}
        title="Filtern"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <Filter className={cn("h-3.5 w-3.5", aktiv && "fill-current")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-6 z-50 w-56 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            {spalte.filter === "text" ? (
              <Input
                autoFocus
                value={textWert}
                placeholder={`${spalte.label} enthält…`}
                onChange={(e) => onText(e.target.value)}
              />
            ) : (
              <div className="space-y-2">
                <Input
                  autoFocus
                  value={suche}
                  placeholder="Suchen…"
                  className="h-8"
                  onChange={(e) => setSuche(e.target.value)}
                />
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {gefilterteWerte.length === 0 && (
                    <p className="px-1 py-2 text-xs text-muted-foreground">Keine Werte.</p>
                  )}
                  {gefilterteWerte.map((w) => (
                    <label
                      key={w}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!setAuswahl || setAuswahl.size === 0 ? false : setAuswahl.has(w)}
                        onChange={() => toggleWert(w)}
                      />
                      <span className="truncate">{w}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-2 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (spalte.filter === "text") onText("");
                  else onSet(new Set());
                  setSuche("");
                }}
              >
                Zurücksetzen
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Schließen
              </Button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}

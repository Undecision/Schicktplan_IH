import { useMemo, useState } from "react";
import { BarChart3, FileDown, FileSpreadsheet } from "lucide-react";
import {
  AUSWERTUNG_TYPEN,
  AUSWERTUNG_TYP_LABELS,
  AuswertungTyp,
  EINTRAG_STATUS,
  EintragStatus,
  PRIORITAETEN,
  PRIORITAET_LABELS,
  Prioritaet,
  STATUS_LABELS,
  type AuswertungFilter,
} from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormOptions } from "@/features/eintraege/queries";
import { exportAuswertung } from "./api";
import { useAuswertung } from "./queries";

function ersterDesMonats(): string {
  const heute = new Date().toISOString().slice(0, 10);
  return `${heute.slice(0, 7)}-01`;
}

export function AuswertungenPanel() {
  const { data: options } = useFormOptions();
  const [entwurf, setEntwurf] = useState<AuswertungFilter>({
    typ: AuswertungTyp.TAGES,
    von: ersterDesMonats(),
    bis: new Date().toISOString().slice(0, 10),
  });
  const [aktiv, setAktiv] = useState<AuswertungFilter | null>(null);
  const { data: result, isLoading, isError } = useAuswertung(aktiv);
  const [exporting, setExporting] = useState<string | null>(null);

  const typOptions = useMemo(
    () => AUSWERTUNG_TYPEN.map((t) => ({ value: t, label: AUSWERTUNG_TYP_LABELS[t] })),
    [],
  );

  function set<K extends keyof AuswertungFilter>(key: K, value: AuswertungFilter[K]) {
    setEntwurf((f) => ({ ...f, [key]: value || undefined }));
  }

  async function doExport(format: "pdf" | "xlsx") {
    const filter = aktiv ?? entwurf;
    setExporting(format);
    try {
      await exportAuswertung(filter, format);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Auswertung
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Feld label="Berichtsart" className="w-52">
            <Combobox
              value={entwurf.typ}
              onChange={(v) => set("typ", v as AuswertungTyp)}
              options={typOptions}
            />
          </Feld>
          <Feld label="Von" className="w-40">
            <Input type="date" value={entwurf.von} onChange={(e) => set("von", e.target.value)} />
          </Feld>
          <Feld label="Bis" className="w-40">
            <Input type="date" value={entwurf.bis} onChange={(e) => set("bis", e.target.value)} />
          </Feld>
          <Feld label="Gewerk" className="w-44">
            <Combobox
              value={entwurf.gewerkId ?? ""}
              onChange={(v) => set("gewerkId", v)}
              options={(options?.gewerke ?? []).map((g) => ({ value: g.id, label: g.name }))}
              emptyOption="Alle"
              placeholder="Alle"
            />
          </Feld>
          <Feld label="Status" className="w-40">
            <Combobox
              value={entwurf.status ?? ""}
              onChange={(v) => set("status", v as EintragStatus)}
              options={EINTRAG_STATUS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              emptyOption="Alle"
              placeholder="Alle"
            />
          </Feld>
          <Feld label="Priorität" className="w-40">
            <Combobox
              value={entwurf.prioritaet ?? ""}
              onChange={(v) => set("prioritaet", v as Prioritaet)}
              options={PRIORITAETEN.map((p) => ({ value: p, label: PRIORITAET_LABELS[p] }))}
              emptyOption="Alle"
              placeholder="Alle"
            />
          </Feld>
          <Button onClick={() => setAktiv({ ...entwurf })}>Auswerten</Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!!exporting} onClick={() => doExport("pdf")}>
              <FileDown className="h-4 w-4" />
              {exporting === "pdf" ? "…" : "PDF"}
            </Button>
            <Button variant="outline" disabled={!!exporting} onClick={() => doExport("xlsx")}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === "xlsx" ? "…" : "Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!aktiv && (
        <p className="text-sm text-muted-foreground">
          Berichtsart und Zeitraum wählen, dann „Auswerten" – oder direkt als PDF/Excel exportieren.
        </p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Wertet aus…</p>}
      {isError && <p className="text-sm text-destructive">Auswertung fehlgeschlagen.</p>}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Einträge" wert={result.kennzahlen.gesamt} />
            <Kpi label="Offen" wert={result.kennzahlen.offen} />
            <Kpi label="Erledigt" wert={result.kennzahlen.erledigt} />
            <Kpi label="Kritisch" wert={result.kennzahlen.kritisch} tone="critical" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Aufschlüsselung – {AUSWERTUNG_TYP_LABELS[result.typ]} ({result.gruppen.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gruppe</TableHead>
                    <TableHead className="text-right">Einträge</TableHead>
                    <TableHead className="text-right">Offen</TableHead>
                    <TableHead className="text-right">Erledigt</TableHead>
                    <TableHead className="text-right">Kritisch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.gruppen.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Keine Daten im Zeitraum.
                      </TableCell>
                    </TableRow>
                  )}
                  {result.gruppen.map((g) => (
                    <TableRow key={g.schluessel}>
                      <TableCell>{g.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.anzahl}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.offen}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.erledigt}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.kritisch}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Feld({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ label, wert, tone }: { label: string; wert: number; tone?: "critical" }) {
  return (
    <Card className={tone === "critical" && wert > 0 ? "border-destructive/50" : undefined}>
      <CardContent className="py-4">
        <p className="text-2xl font-semibold tabular-nums">{wert}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

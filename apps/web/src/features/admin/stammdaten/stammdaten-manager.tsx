import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Filter, FileUp, MoreVertical, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { StammdatenField, StammdatenResource } from "./config";
import { useStammdaten, useUpdateStammdatum, type StammdatumRow } from "./queries";
import { StammdatumFormDialog } from "./stammdatum-form-dialog";
import { TechnischePlaetzeImportDialog } from "./technische-plaetze-import-dialog";

type FilterTyp = "set" | "text";

interface Spalte {
  key: string;
  label: string;
  filter: FilterTyp;
  istPrimary: boolean;
  istStatus: boolean;
  getValue: (row: StammdatumRow) => string;
}

const STATUS_KEY = "__status";

export function StammdatenManager({ resource }: { resource: StammdatenResource }) {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data: rows = [], isLoading, isError } = useStammdaten(resource.endpoint, includeInactive);
  const updateMutation = useUpdateStammdatum(resource.endpoint);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<StammdatumRow | undefined>(undefined);

  const [suche, setSuche] = useState("");
  const [setFilter, setSetFilter] = useState<Record<string, Set<string>>>({});
  const [textFilter, setTextFilter] = useState<Record<string, string>>({});

  // Referenz-Felder (z.B. Fachbereich) auflösen: Id → Anzeigename.
  const refFields = resource.fields.filter((f) => f.type === "reference" && f.refEndpoint);
  const refQueries = useQueries({
    queries: refFields.map((field) => ({
      queryKey: ["stammdaten-ref", field.refEndpoint] as const,
      queryFn: async () => {
        const { data } = await apiClient.get<Array<{ id: string } & Record<string, string>>>(
          `/${field.refEndpoint}`,
        );
        const labelKey = field.refLabelField ?? "name";
        const map = new Map<string, string>();
        for (const item of data) map.set(item.id, item[labelKey] ?? "");
        return map;
      },
    })),
  });
  const refMaps = new Map<string, Map<string, string>>();
  refFields.forEach((field, index) => {
    refMaps.set(field.key, refQueries[index]?.data ?? new Map());
  });

  function feldWert(row: StammdatumRow, field: StammdatenField): string {
    if (field.type === "boolean") return row[field.key] ? "Ja" : "Nein";
    if (field.type === "reference") {
      const id = row[field.key];
      if (!id) return "—";
      return refMaps.get(field.key)?.get(String(id)) ?? String(id);
    }
    return String(row[field.key] ?? "");
  }

  const spalten: Spalte[] = [
    ...resource.fields.map((field) => ({
      key: field.key,
      label: field.label,
      filter: (field.type === "text" ? "text" : "set") as FilterTyp,
      istPrimary: field.key === resource.primaryField,
      istStatus: false,
      getValue: (row: StammdatumRow) => feldWert(row, field),
    })),
    {
      key: STATUS_KEY,
      label: "Status",
      filter: "set" as FilterTyp,
      istPrimary: false,
      istStatus: true,
      getValue: (row: StammdatumRow) => (row.aktiv ? "Aktiv" : "Inaktiv"),
    },
  ];

  // Distinct-Werte je Set-Spalte (für die Excel-artige Auswahl).
  const refReady = refQueries.map((q) => q.dataUpdatedAt).join(",");
  const distinct = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const spalte of spalten) {
      if (spalte.filter !== "set") continue;
      const werte = new Set<string>();
      for (const row of rows) werte.add(spalte.getValue(row));
      map[spalte.key] = [...werte].sort((a, b) => a.localeCompare(b, "de"));
    }
    return map;
  }, [rows, refReady]);

  const gefilterteRows = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !spalten.some((s) => s.getValue(row).toLowerCase().includes(q))) return false;
      for (const spalte of spalten) {
        if (spalte.filter === "set") {
          const erlaubt = setFilter[spalte.key];
          if (erlaubt && erlaubt.size > 0 && !erlaubt.has(spalte.getValue(row))) return false;
        } else {
          const t = textFilter[spalte.key]?.trim().toLowerCase();
          if (t && !spalte.getValue(row).toLowerCase().includes(t)) return false;
        }
      }
      return true;
    });
  }, [rows, suche, setFilter, textFilter, refReady]);

  function openCreate() {
    setEditingRow(undefined);
    setFormOpen(true);
  }

  function openEdit(row: StammdatumRow) {
    setEditingRow(row);
    setFormOpen(true);
  }

  function toggleAktiv(row: StammdatumRow) {
    updateMutation.mutate({ id: row.id, payload: { aktiv: !row.aktiv } });
  }

  const colspan = spalten.length + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{resource.labelPlural}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Suchen…"
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`inactive-${resource.endpoint}`}
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
            <Label
              htmlFor={`inactive-${resource.endpoint}`}
              className="text-sm text-muted-foreground"
            >
              Inaktive anzeigen
            </Label>
          </div>
          {resource.importierbar && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" />
              Excel-Import
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Neu
          </Button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          {resource.labelPlural} konnten nicht geladen werden.
        </p>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {spalten.map((spalte) => (
                <TableHead key={spalte.key}>
                  <span className="inline-flex items-center gap-1">
                    {spalte.label}
                    <SpaltenFilter
                      spalte={spalte}
                      werte={distinct[spalte.key] ?? []}
                      setAuswahl={setFilter[spalte.key]}
                      textWert={textFilter[spalte.key] ?? ""}
                      onSet={(s) => setSetFilter((prev) => ({ ...prev, [spalte.key]: s }))}
                      onText={(t) => setTextFilter((prev) => ({ ...prev, [spalte.key]: t }))}
                    />
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={colspan} className="text-center text-muted-foreground">
                  Lädt…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && gefilterteRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colspan} className="text-center text-muted-foreground">
                  {rows.length === 0
                    ? "Keine Einträge vorhanden."
                    : "Keine Treffer für die Filter."}
                </TableCell>
              </TableRow>
            )}
            {gefilterteRows.map((row) => (
              <TableRow key={row.id}>
                {spalten.map((spalte) => (
                  <TableCell key={spalte.key} className={spalte.istPrimary ? "font-medium" : ""}>
                    {spalte.istStatus ? (
                      <Badge variant={row.aktiv ? "success" : "secondary"}>
                        {row.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    ) : (
                      spalte.getValue(row)
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Aktionen">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEdit(row)}>Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggleAktiv(row)}>
                        {row.aktiv ? "Deaktivieren" : "Aktivieren"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <StammdatumFormDialog
        resource={resource}
        open={formOpen}
        onOpenChange={setFormOpen}
        row={editingRow}
      />

      {resource.importierbar && (
        <TechnischePlaetzeImportDialog open={importOpen} onOpenChange={setImportOpen} />
      )}
    </div>
  );
}

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

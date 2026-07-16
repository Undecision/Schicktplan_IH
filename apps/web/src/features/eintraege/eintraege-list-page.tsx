import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronDown, Info, Search, SlidersHorizontal, X } from "lucide-react";
import {
  EINTRAG_STATUS,
  EINTRAG_TYP_LABELS,
  EintragTyp,
  PRIORITAETEN,
  PRIORITAET_LABELS,
  STATUS_LABELS,
  type EintragFilter,
} from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequirePermission } from "@/features/auth/protected-route";
import { useEintraege, useFormOptions } from "./queries";
import { PrioritaetBadge, StatusBadge } from "./badges";
import { EintragFormDialog } from "./eintrag-form-dialog";
import { formatDauer } from "./eintrag-detail-page";
import { Highlighted } from "./highlight";

// Filter-Schlüssel, die als Query-Parameter in der URL persistiert werden
// (teilbare Ansichten, P5.2). Nicht persistiert: `erfassen` (UI-Trigger).
const FILTER_KEYS = [
  "q",
  "status",
  "prioritaet",
  "gewerkId",
  "fachbereichId",
  "schichtId",
  "technischerPlatzId",
  "erstellerId",
  "sapIhAuftrag",
  "easyFlowTag",
  "von",
  "bis",
] as const;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EintraegeListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: options } = useFormOptions();
  const [formOpen, setFormOpen] = useState(false);
  const [formTyp, setFormTyp] = useState<EintragTyp>(EintragTyp.SCHICHTINFORMATION);
  const [showMore, setShowMore] = useState(false);

  function neuerEintrag(typ: EintragTyp) {
    setFormTyp(typ);
    setFormOpen(true);
  }

  // Filter direkt aus der URL ableiten → teilbare/lesbare Ansichten.
  const filter = useMemo<EintragFilter>(() => {
    const f: EintragFilter = {};
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) (f as Record<string, string>)[key] = value;
    }
    return f;
  }, [searchParams]);

  function setParam(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  function resetFilters() {
    setSearchParams({}, { replace: true });
    setSearchInput("");
  }

  // Suchfeld mit Debounce, damit nicht jeder Tastendruck eine Query auslöst.
  const [searchInput, setSearchInput] = useState(filter.q ?? "");
  useEffect(() => {
    const handle = setTimeout(() => {
      if ((filter.q ?? "") !== searchInput) setParam("q", searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Sidebar-"Neuer Eintrag" navigiert mit ?erfassen=1 (Standard: Schichtinformation).
  useEffect(() => {
    if (searchParams.get("erfassen") === "1") {
      neuerEintrag(EintragTyp.SCHICHTINFORMATION);
      setParam("erfassen", "");
    }
  }, [searchParams]);

  const { data: eintraege = [], isLoading } = useEintraege(filter);

  const aktiveFilter = FILTER_KEYS.filter((k) => k !== "q" && searchParams.get(k)).length;
  const hatFilter = aktiveFilter > 0 || !!filter.q;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Volltextsuche (Beschreibung, SAP-Auftrag, TAG)…"
            className="pl-9"
          />
        </div>
        <RequirePermission permission="eintraege:create">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Neuer Eintrag
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => neuerEintrag(EintragTyp.SCHICHTINFORMATION)}>
                <Info className="h-4 w-4" />
                Schichtinformation
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => neuerEintrag(EintragTyp.STOERUNG)}>
                <AlertTriangle className="h-4 w-4" />
                Störung
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </RequirePermission>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Status"
          value={filter.status ?? ""}
          onChange={(v) => setParam("status", v)}
          options={EINTRAG_STATUS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        />
        <FilterSelect
          label="Priorität"
          value={filter.prioritaet ?? ""}
          onChange={(v) => setParam("prioritaet", v)}
          options={PRIORITAETEN.map((p) => ({ value: p, label: PRIORITAET_LABELS[p] }))}
        />
        <FilterSelect
          label="Gewerk"
          value={filter.gewerkId ?? ""}
          onChange={(v) => setParam("gewerkId", v)}
          options={(options?.gewerke ?? []).map((g) => ({ value: g.id, label: g.name }))}
        />
        <Button variant="outline" size="sm" onClick={() => setShowMore((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4" />
          Weitere Filter{aktiveFilter > 2 ? ` (${aktiveFilter})` : ""}
        </Button>
        {hatFilter && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-4 w-4" />
            Zurücksetzen
          </Button>
        )}
      </div>

      {showMore && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <FilterSelect
            label="Fachbereich"
            value={filter.fachbereichId ?? ""}
            onChange={(v) => setParam("fachbereichId", v)}
            options={(options?.fachbereiche ?? []).map((f) => ({ value: f.id, label: f.name }))}
          />
          <FilterSelect
            label="Schicht"
            value={filter.schichtId ?? ""}
            onChange={(v) => setParam("schichtId", v)}
            options={(options?.schichten ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
          <FilterSelect
            label="Techn. Platz"
            value={filter.technischerPlatzId ?? ""}
            onChange={(v) => setParam("technischerPlatzId", v)}
            options={(options?.technischePlaetze ?? []).map((t) => ({
              value: t.id,
              label: t.name,
            }))}
          />
          <FilterSelect
            label="Ersteller"
            value={filter.erstellerId ?? ""}
            onChange={(v) => setParam("erstellerId", v)}
            options={(options?.benutzer ?? []).map((b) => ({ value: b.id, label: b.name }))}
          />
          <TextFilter
            label="SAP-Auftrag"
            value={filter.sapIhAuftrag ?? ""}
            onChange={(v) => setParam("sapIhAuftrag", v)}
            placeholder="700123456"
          />
          <TextFilter
            label="EasyFlow-TAG"
            value={filter.easyFlowTag ?? ""}
            onChange={(v) => setParam("easyFlowTag", v)}
            placeholder="PW4-M-1023"
          />
          <DateFilter label="Von" value={filter.von ?? ""} onChange={(v) => setParam("von", v)} />
          <DateFilter label="Bis" value={filter.bis ?? ""} onChange={(v) => setParam("bis", v)} />
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zeitpunkt</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Priorität</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gewerk</TableHead>
              <TableHead>Techn. Platz</TableHead>
              <TableHead>Dauer</TableHead>
              <TableHead>Beschreibung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Lädt…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && eintraege.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Keine Einträge gefunden.
                </TableCell>
              </TableRow>
            )}
            {eintraege.map((eintrag) => (
              <TableRow
                key={eintrag.id}
                className="cursor-pointer"
                onClick={() => navigate(`/schichtbuch/${eintrag.id}`)}
              >
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(eintrag.zeitpunkt)}
                </TableCell>
                <TableCell>
                  <TypBadge typ={eintrag.typ} />
                </TableCell>
                <TableCell>
                  <PrioritaetBadge prioritaet={eintrag.prioritaet} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={eintrag.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{eintrag.gewerk.name}</TableCell>
                <TableCell className="whitespace-nowrap">{eintrag.technischerPlatz.name}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDauer(eintrag.bearbeitungsdauerMinuten)}
                </TableCell>
                <TableCell className="max-w-md truncate">
                  <Highlighted text={eintrag.highlight} fallback={eintrag.beschreibung} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EintragFormDialog open={formOpen} onOpenChange={setFormOpen} typ={formTyp} />
    </div>
  );
}

/** Kleines Badge, das den Eintragstyp (Schichtinformation / Störung) kennzeichnet. */
function TypBadge({ typ }: { typ: EintragTyp }) {
  const istStoerung = typ === EintragTyp.STOERUNG;
  return (
    <span
      className={
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium " +
        (istStoerung ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")
      }
    >
      {istStoerung ? <AlertTriangle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
      {EINTRAG_TYP_LABELS[typ]}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="w-48">
      <Combobox
        value={value}
        onChange={onChange}
        options={options}
        placeholder={`${label}: Alle`}
        emptyOption={`${label}: Alle`}
      />
    </div>
  );
}

function TextFilter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="w-40">
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <Input
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => e.target.value !== value && onChange(e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") onChange((e.target as HTMLInputElement).value.trim());
        }}
      />
    </div>
  );
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-40">
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

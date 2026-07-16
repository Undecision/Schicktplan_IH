import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  EINTRAG_STATUS,
  EintragStatus,
  PRIORITAETEN,
  PRIORITAET_LABELS,
  Prioritaet,
  STATUS_LABELS,
  type EintragFilter,
} from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ALL = "__all__";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EintraegeListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: options } = useFormOptions();

  const [status, setStatus] = useState<EintragStatus | "">("");
  const [prioritaet, setPrioritaet] = useState<Prioritaet | "">("");
  const [gewerkId, setGewerkId] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);

  // Sidebar-"Neuer Eintrag" navigiert mit ?erfassen=1.
  useEffect(() => {
    if (searchParams.get("erfassen") === "1") {
      setFormOpen(true);
      searchParams.delete("erfassen");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filter: EintragFilter = {
    ...(status ? { status } : {}),
    ...(prioritaet ? { prioritaet } : {}),
    ...(gewerkId ? { gewerkId } : {}),
  };
  const { data: eintraege = [], isLoading } = useEintraege(filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as EintragStatus | "")}
            options={EINTRAG_STATUS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          />
          <FilterSelect
            label="Priorität"
            value={prioritaet}
            onChange={(v) => setPrioritaet(v as Prioritaet | "")}
            options={PRIORITAETEN.map((p) => ({ value: p, label: PRIORITAET_LABELS[p] }))}
          />
          <FilterSelect
            label="Gewerk"
            value={gewerkId}
            onChange={setGewerkId}
            options={(options?.gewerke ?? []).map((g) => ({ value: g.id, label: g.name }))}
          />
        </div>
        <RequirePermission permission="eintraege:create">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Neuer Eintrag
          </Button>
        </RequirePermission>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zeitpunkt</TableHead>
              <TableHead>Priorität</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gewerk</TableHead>
              <TableHead>Techn. Platz</TableHead>
              <TableHead>Beschreibung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Lädt…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && eintraege.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                  <PrioritaetBadge prioritaet={eintrag.prioritaet} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={eintrag.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{eintrag.gewerk.name}</TableCell>
                <TableCell className="whitespace-nowrap">{eintrag.technischerPlatz.name}</TableCell>
                <TableCell className="max-w-md truncate">{eintrag.beschreibung}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EintragFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
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
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{label}: Alle</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

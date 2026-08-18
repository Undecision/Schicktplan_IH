import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  UEBERGABE_STATUS_LABELS,
  UebergabeStatus,
  type UebergabeFilter,
} from "@schichtbuch/shared";
import { useAuth } from "@/features/auth/auth-context";
import type { SchichtOption } from "@/features/eintraege/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useFormOptions } from "@/features/eintraege/queries";
import { useGeneriereUebergabenMehrere, useUebergaben } from "@/features/uebergaben/queries";

const ALL = "__all__";

/** Minuten seit Mitternacht aus "HH:MM". */
function hhmmZuMinuten(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Ermittelt die zur aktuellen Uhrzeit passende Schicht. Über-Mitternacht-
 * Schichten (Endzeit ≤ Startzeit) werden korrekt berücksichtigt.
 */
function aktiveSchichtId(schichten: SchichtOption[], jetzt: Date): string {
  const minuten = jetzt.getHours() * 60 + jetzt.getMinutes();
  for (const schicht of schichten) {
    const start = hhmmZuMinuten(schicht.startzeit);
    const ende = hhmmZuMinuten(schicht.endzeit);
    if (start === ende) continue;
    const imFenster =
      start < ende ? minuten >= start && minuten < ende : minuten >= start || minuten < ende;
    if (imFenster) return schicht.id;
  }
  return "";
}

/**
 * Bei genau einem zugeordneten Gewerk wird dieses vorausgewählt; bei mehreren
 * (oder voller Sichtbarkeit) bleibt die Auswahl offen ("Alle").
 */
function zugeordnetesGewerkId(
  gewerke: { id: string; name: string }[],
  sichtbarkeit: string[],
): string {
  if (sichtbarkeit.length !== 1) return "";
  return gewerke.find((g) => g.name === sichtbarkeit[0])?.id ?? "";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

export function StatusUebergabeBadge({ status }: { status: UebergabeStatus }) {
  return (
    <Badge variant={status === UebergabeStatus.UEBERGEBEN ? "success" : "warning"}>
      {UEBERGABE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function UebergabePage() {
  const navigate = useNavigate();
  const { data: options } = useFormOptions();
  const [filter, setFilter] = useState<UebergabeFilter>({});
  const { data: uebergaben = [], isLoading } = useUebergaben(filter);
  const [showGen, setShowGen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="mb-1 block text-xs text-muted-foreground">Datum</label>
            <Input
              type="date"
              value={filter.datum ?? ""}
              onChange={(e) => setFilter((f) => ({ ...f, datum: e.target.value || undefined }))}
            />
          </div>
          <FilterSelect
            label="Schicht"
            value={filter.schichtId ?? ""}
            onChange={(v) => setFilter((f) => ({ ...f, schichtId: v || undefined }))}
            options={(options?.schichten ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
          <FilterSelect
            label="Gewerk"
            value={filter.gewerkId ?? ""}
            onChange={(v) => setFilter((f) => ({ ...f, gewerkId: v || undefined }))}
            options={(options?.gewerke ?? []).map((g) => ({ value: g.id, label: g.name }))}
          />
        </div>
        <Button onClick={() => setShowGen((v) => !v)}>
          <Plus className="h-4 w-4" />
          Übergabe erstellen
        </Button>
      </div>

      {showGen && (
        <GenerierenPanel
          onDone={(id) => navigate(`/uebergabe/${id}`)}
          onBulkDone={() => setShowGen(false)}
        />
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Schicht</TableHead>
              <TableHead>Gewerk</TableHead>
              <TableHead>Offen / Laufend</TableHead>
              <TableHead>Übergeben an</TableHead>
              <TableHead>Status</TableHead>
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
            {!isLoading && uebergaben.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Keine Übergaben. Über „Übergabe erstellen" eine Schichtübergabe anlegen.
                </TableCell>
              </TableRow>
            )}
            {uebergaben.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer"
                onClick={() => navigate(`/uebergabe/${u.id}`)}
              >
                <TableCell className="whitespace-nowrap">{formatDate(u.datum)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {u.schicht.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {u.beginn}–{u.ende}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{u.gewerk.name}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {u.offeneStoerungen} / {u.laufendeArbeiten}
                </TableCell>
                <TableCell className="whitespace-nowrap">{u.uebernommenVon?.name ?? "—"}</TableCell>
                <TableCell>
                  <StatusUebergabeBadge status={u.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function GenerierenPanel({
  onDone,
  onBulkDone,
}: {
  onDone: (id: string) => void;
  onBulkDone: () => void;
}) {
  const { data: options } = useFormOptions();
  const { user } = useAuth();
  const generieren = useGeneriereUebergabenMehrere();
  const heute = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [datum, setDatum] = useState(heute);
  const [schichtId, setSchichtId] = useState("");
  const [gewerkId, setGewerkId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const vorbelegt = useRef(false);

  // Aktuelle Schicht (nach Uhrzeit) und zugeordnetes Gewerk einmalig vorbelegen,
  // sobald die Optionen geladen sind. Danach bleibt die Auswahl des Nutzers erhalten.
  useEffect(() => {
    if (vorbelegt.current || !options) return;
    setSchichtId(aktiveSchichtId(options.schichten, new Date()));
    setGewerkId(zugeordnetesGewerkId(options.gewerke, user?.gewerkeSichtbarkeit ?? []));
    vorbelegt.current = true;
  }, [options, user]);

  const anzahlSchichten = schichtId ? 1 : (options?.schichten.length ?? 0);
  const anzahlGewerke = gewerkId
    ? 1
    : ((user?.gewerkeSichtbarkeit.length || options?.gewerke.length) ?? 0);
  const anzahl = anzahlSchichten * anzahlGewerke;
  const istSammel = !schichtId || !gewerkId;

  async function submit() {
    setError(null);
    try {
      const result = await generieren.mutateAsync({
        datum,
        schichtId: schichtId || undefined,
        gewerkId: gewerkId || undefined,
      });
      if (result.uebergaben.length === 1 && result.uebergaben[0]) {
        onDone(result.uebergaben[0].id);
      } else {
        onBulkDone();
      }
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? "Erstellung fehlgeschlagen.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schichtübergabe erstellen</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="mb-1 block text-xs text-muted-foreground">Datum</label>
          <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
        <FilterSelect
          label="Schicht"
          value={schichtId}
          onChange={setSchichtId}
          options={(options?.schichten ?? []).map((s) => ({ value: s.id, label: s.name }))}
        />
        <FilterSelect
          label="Gewerk"
          value={gewerkId}
          onChange={setGewerkId}
          options={(options?.gewerke ?? []).map((g) => ({ value: g.id, label: g.name }))}
        />
        <Button onClick={submit} disabled={generieren.isPending}>
          {generieren.isPending ? "Erstellt…" : "Erstellen"}
        </Button>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
        <p className="w-full text-xs text-muted-foreground">
          {istSammel && anzahl > 1
            ? `„Alle" erzeugt ${anzahl} Übergaben (alle ausgewählten Schichten × Gewerke) für den Tag. `
            : ""}
          Offene Störungen und laufende Arbeiten der Schicht werden automatisch übernommen.
        </p>
      </CardContent>
    </Card>
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
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle</SelectItem>
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

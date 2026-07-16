import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  SCHICHTBERICHT_STATUS_LABELS,
  SchichtberichtStatus,
  type BerichtFilter,
} from "@schichtbuch/shared";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePermission } from "@/features/auth/protected-route";
import { useFormOptions } from "@/features/eintraege/queries";
import { useBerichte, useGeneriereBerichte } from "@/features/berichte/queries";
import { AuswertungenPanel } from "@/features/reporting/auswertungen-panel";

const ALL = "__all__";

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

export function StatusBerichtBadge({ status }: { status: SchichtberichtStatus }) {
  return (
    <Badge variant={status === SchichtberichtStatus.FREIGEGEBEN ? "success" : "warning"}>
      {SCHICHTBERICHT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function BerichtePage() {
  return (
    <Tabs defaultValue="schichtberichte" className="space-y-4">
      <TabsList>
        <TabsTrigger value="schichtberichte">Schichtberichte</TabsTrigger>
        <TabsTrigger value="auswertungen">Auswertungen &amp; Export</TabsTrigger>
      </TabsList>
      <TabsContent value="schichtberichte">
        <SchichtberichteListe />
      </TabsContent>
      <TabsContent value="auswertungen">
        <AuswertungenPanel />
      </TabsContent>
    </Tabs>
  );
}

function SchichtberichteListe() {
  const navigate = useNavigate();
  const { data: options } = useFormOptions();
  const [filter, setFilter] = useState<BerichtFilter>({});
  const { data: berichte = [], isLoading } = useBerichte(filter);
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
          <FilterSelect
            label="Status"
            value={filter.status ?? ""}
            onChange={(v) =>
              setFilter((f) => ({ ...f, status: (v as SchichtberichtStatus) || undefined }))
            }
            options={Object.values(SchichtberichtStatus).map((s) => ({
              value: s,
              label: SCHICHTBERICHT_STATUS_LABELS[s],
            }))}
          />
        </div>
        <RequirePermission permission="berichte:freigeben">
          <Button onClick={() => setShowGen((v) => !v)}>
            <Plus className="h-4 w-4" />
            Bericht generieren
          </Button>
        </RequirePermission>
      </div>

      {showGen && <GenerierenPanel onDone={() => setShowGen(false)} />}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Schicht</TableHead>
              <TableHead>Gewerk</TableHead>
              <TableHead>Einträge</TableHead>
              <TableHead>Offen / Erledigt</TableHead>
              <TableHead>Verantwortlich</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Lädt…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && berichte.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Keine Berichte. Über „Bericht generieren" einen Schichtbericht erzeugen.
                </TableCell>
              </TableRow>
            )}
            {berichte.map((b) => (
              <TableRow
                key={b.id}
                className="cursor-pointer"
                onClick={() => navigate(`/berichte/${b.id}`)}
              >
                <TableCell className="whitespace-nowrap">{formatDate(b.datum)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {b.schicht.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {b.beginn}–{b.ende}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{b.gewerk.name}</TableCell>
                <TableCell>{b.anzahlEintraege}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {b.offenePunkte} / {b.abgeschlosseneArbeiten}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {b.verantwortlicher?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBerichtBadge status={b.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function GenerierenPanel({ onDone }: { onDone: () => void }) {
  const { data: options } = useFormOptions();
  const generieren = useGeneriereBerichte();
  const heute = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [datum, setDatum] = useState(heute);
  const [schichtId, setSchichtId] = useState("");
  const [gewerkId, setGewerkId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!schichtId) {
      setError("Bitte eine Schicht wählen.");
      return;
    }
    try {
      const result = await generieren.mutateAsync({
        datum,
        schichtId,
        gewerkId: gewerkId || undefined,
      });
      if (result.length === 0) {
        setError("Keine Einträge für Tag/Schicht gefunden.");
        return;
      }
      onDone();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? "Generierung fehlgeschlagen.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schichtbericht generieren</CardTitle>
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
          label="Gewerk (optional)"
          value={gewerkId}
          onChange={setGewerkId}
          options={(options?.gewerke ?? []).map((g) => ({ value: g.id, label: g.name }))}
        />
        <Button onClick={submit} disabled={generieren.isPending}>
          {generieren.isPending ? "Generiert…" : "Generieren"}
        </Button>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
        <p className="w-full text-xs text-muted-foreground">
          Ohne Gewerk-Auswahl werden Berichte für alle Gewerke mit Einträgen an diesem Tag/dieser
          Schicht erzeugt. Bereits vorhandene Berichte bleiben unverändert.
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

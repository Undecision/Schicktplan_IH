import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Save, Trash2 } from "lucide-react";
import { SchichtberichtStatus, type SchichtbucheintragListItem } from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequirePermission } from "@/features/auth/protected-route";
import { useAuth } from "@/features/auth/auth-context";
import { HistorieVerlauf } from "@/components/historie-verlauf";
import { PrioritaetBadge, StatusBadge } from "@/features/eintraege/badges";
import { useFormOptions } from "@/features/eintraege/queries";
import {
  useBericht,
  useBerichtHistorie,
  useDeleteBericht,
  useFreigebenBericht,
  useUpdateBericht,
} from "@/features/berichte/queries";
import { StatusBerichtBadge } from "./berichte-page";

const KEIN = "__kein__";

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BerichtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: bericht, isLoading, isError } = useBericht(id);
  const { data: historie = [], isLoading: historieLaedt } = useBerichtHistorie(id);
  const { data: options } = useFormOptions();
  const { user } = useAuth();
  const update = useUpdateBericht(id ?? "");
  const freigeben = useFreigebenBericht(id ?? "");
  const loeschen = useDeleteBericht();

  function handleLoeschen() {
    if (!bericht) return;
    if (
      !window.confirm(
        "Diesen Schichtbericht wirklich löschen? Das lässt sich nicht rückgängig machen.",
      )
    ) {
      return;
    }
    loeschen.mutate(bericht.id, { onSuccess: () => navigate("/berichte") });
  }

  const [verantwortlicherId, setVerantwortlicherId] = useState("");
  const [besondere, setBesondere] = useState("");

  useEffect(() => {
    if (bericht) {
      // Verantwortlichen Schichtführer automatisch mit der angemeldeten Person
      // vorbelegen, solange im Entwurf noch keiner gesetzt ist (bleibt änderbar).
      const vorbelegt =
        bericht.verantwortlicher?.id ??
        (bericht.status === SchichtberichtStatus.ENTWURF ? (user?.id ?? "") : "");
      setVerantwortlicherId(vorbelegt);
      setBesondere(bericht.besondereEreignisse ?? "");
    }
  }, [bericht, user]);

  if (isLoading) return <p className="text-muted-foreground">Lädt…</p>;
  if (isError || !bericht) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Bericht nicht gefunden.</p>
        <Button variant="outline" onClick={() => navigate("/berichte")}>
          <ArrowLeft className="h-4 w-4" />
          Zur Übersicht
        </Button>
      </div>
    );
  }

  const istEntwurf = bericht.status === SchichtberichtStatus.ENTWURF;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate("/berichte")}>
          <ArrowLeft className="h-4 w-4" />
          Zur Übersicht
        </Button>
        <div className="flex flex-wrap gap-2">
          {istEntwurf && (
            <RequirePermission permission="berichte:freigeben">
              <Button onClick={() => freigeben.mutate()} disabled={freigeben.isPending}>
                <CheckCircle2 className="h-4 w-4" />
                {freigeben.isPending ? "Gibt frei…" : "Bericht freigeben"}
              </Button>
            </RequirePermission>
          )}
          <RequirePermission permission="berichte:delete">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleLoeschen}
              disabled={loeschen.isPending}
            >
              <Trash2 className="h-4 w-4" />
              {loeschen.isPending ? "Löscht…" : "Löschen"}
            </Button>
          </RequirePermission>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              Schichtbericht {bericht.schicht.name} · {bericht.gewerk.name}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(bericht.datum)} · Schicht {bericht.beginn}–{bericht.ende}
            </p>
          </div>
          <StatusBerichtBadge status={bericht.status} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kennzahl label="Einträge gesamt" wert={bericht.anzahlEintraege} />
          <Kennzahl label="Offene Punkte" wert={bericht.offenePunkte} />
          <Kennzahl label="Abgeschlossen" wert={bericht.abgeschlosseneArbeiten} />
          <Kennzahl label="Besondere Ereignisse" wert={bericht.kritischeEintraege.length} />
        </CardContent>
      </Card>

      {!istEntwurf && bericht.freigegebenVon && (
        <p className="text-sm text-muted-foreground">
          Freigegeben von <span className="font-medium">{bericht.freigegebenVon.name}</span>
          {bericht.freigegebenAm ? ` am ${formatDateTime(bericht.freigegebenAm)}` : ""}.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schichtführer & besondere Ereignisse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {istEntwurf ? (
            <RequirePermission
              permission="berichte:freigeben"
              fallback={<ReadOnlyMeta bericht={bericht} />}
            >
              <div className="w-64">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Verantwortlicher Schichtführer
                </label>
                <Select
                  value={verantwortlicherId || KEIN}
                  onValueChange={(v) => setVerantwortlicherId(v === KEIN ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KEIN}>— keiner —</SelectItem>
                    {(options?.benutzer ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Besondere Ereignisse / Hinweise
                </label>
                <Textarea
                  value={besondere}
                  onChange={(e) => setBesondere(e.target.value)}
                  placeholder="Sicherheitsrelevante Vorkommnisse, wichtige Übergabepunkte…"
                  rows={4}
                />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  update.mutate({
                    verantwortlicherId: verantwortlicherId || null,
                    besondereEreignisse: besondere || null,
                  })
                }
                disabled={update.isPending}
              >
                <Save className="h-4 w-4" />
                {update.isPending ? "Speichert…" : "Speichern"}
              </Button>
            </RequirePermission>
          ) : (
            <ReadOnlyMeta bericht={bericht} />
          )}
        </CardContent>
      </Card>

      <EintragListe
        titel={`Besondere Ereignisse – kritische/hohe Priorität (${bericht.kritischeEintraege.length})`}
        eintraege={bericht.kritischeEintraege}
        leer="Keine kritischen Einträge."
      />
      <EintragListe
        titel={`Offene Punkte (${bericht.offeneEintraege.length})`}
        eintraege={bericht.offeneEintraege}
        leer="Keine offenen Punkte."
      />
      <EintragListe
        titel={`Abgeschlossene Arbeiten (${bericht.erledigteEintraege.length})`}
        eintraege={bericht.erledigteEintraege}
        leer="Keine abgeschlossenen Arbeiten."
      />

      <HistorieVerlauf historie={historie} isLoading={historieLaedt} titel="Verlauf des Berichts" />
    </div>
  );
}

function ReadOnlyMeta({
  bericht,
}: {
  bericht: { verantwortlicher: { name: string } | null; besondereEreignisse: string | null };
}) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        <span className="text-muted-foreground">Schichtführer: </span>
        <span className="font-medium">{bericht.verantwortlicher?.name ?? "—"}</span>
      </p>
      <div>
        <p className="text-muted-foreground">Besondere Ereignisse:</p>
        <p className="whitespace-pre-wrap">{bericht.besondereEreignisse || "—"}</p>
      </div>
    </div>
  );
}

function Kennzahl({ label, wert }: { label: string; wert: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{wert}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function EintragListe({
  titel,
  eintraege,
  leer,
}: {
  titel: string;
  eintraege: SchichtbucheintragListItem[];
  leer: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {eintraege.length === 0 && <p className="text-sm text-muted-foreground">{leer}</p>}
        {eintraege.map((e) => (
          <Link
            key={e.id}
            to={`/schichtbuch/${e.id}`}
            className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-accent"
          >
            <PrioritaetBadge prioritaet={e.prioritaet} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.beschreibung}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {e.technischerPlatz.name}
            </span>
            <StatusBadge status={e.status} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

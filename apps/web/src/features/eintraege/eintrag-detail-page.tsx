import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Forward,
  Info,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  baueIntegrationsLink,
  EINTRAG_TYP_LABELS,
  EintragStatus,
  EintragTyp,
} from "@schichtbuch/shared";
import { useIntegrationLinks } from "@/features/einstellungen/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RequirePermission } from "@/features/auth/protected-route";
import { useAddKommentar, useDeleteEintrag, useEintrag, useWeitergabeEintrag } from "./queries";
import { PrioritaetBadge, StatusBadge } from "./badges";
import { EintragFormDialog } from "./eintrag-form-dialog";
import { EintragAnhaenge } from "./eintrag-anhaenge";
import { EintragHistorie } from "./eintrag-historie";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minuten als „X h Y min" (oder „Y min") formatieren. */
export function formatDauer(minuten: number | null): string {
  if (minuten === null || minuten === undefined) return "—";
  const std = Math.floor(minuten / 60);
  const min = minuten % 60;
  return std > 0 ? `${std} h ${min} min` : `${min} min`;
}

export function EintragDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: eintrag, isLoading, isError } = useEintrag(id);
  const addKommentar = useAddKommentar();
  const loeschen = useDeleteEintrag();
  const weitergabe = useWeitergabeEintrag();
  const { data: integration } = useIntegrationLinks();
  const [editOpen, setEditOpen] = useState(false);
  const [kommentarText, setKommentarText] = useState("");

  function handleWeitergabe() {
    if (!eintrag) return;
    if (
      !window.confirm(
        "Diese Meldung an die Folgeschicht zur Weiterbearbeitung übergeben? Es wird kein neuer Eintrag angelegt – die Folgeschicht bearbeitet diesen Eintrag weiter.",
      )
    ) {
      return;
    }
    weitergabe.mutate(eintrag.id);
  }

  function handleLoeschen() {
    if (!eintrag) return;
    if (
      !window.confirm(
        "Diesen Schichtbucheintrag wirklich löschen? Das lässt sich nicht rückgängig machen.",
      )
    ) {
      return;
    }
    loeschen.mutate(eintrag.id, { onSuccess: () => navigate("/schichtbuch") });
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Lädt…</p>;
  }
  if (isError || !eintrag) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Eintrag nicht gefunden oder nicht sichtbar.</p>
        <Button variant="outline" onClick={() => navigate("/schichtbuch")}>
          <ArrowLeft className="h-4 w-4" />
          Zur Liste
        </Button>
      </div>
    );
  }

  async function submitKommentar() {
    if (!kommentarText.trim() || !eintrag) return;
    await addKommentar.mutateAsync({ id: eintrag.id, payload: { text: kommentarText.trim() } });
    setKommentarText("");
  }

  const istStoerung = eintrag.typ === EintragTyp.STOERUNG;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/schichtbuch")}>
          <ArrowLeft className="h-4 w-4" />
          Zur Liste
        </Button>
        <div className="flex flex-wrap gap-2">
          {eintrag.status !== EintragStatus.ERLEDIGT && !eintrag.weitergegeben && (
            <RequirePermission permission="eintraege:update">
              <Button variant="outline" onClick={handleWeitergabe} disabled={weitergabe.isPending}>
                <Forward className="h-4 w-4" />
                {weitergabe.isPending ? "Übergibt…" : "An Folgeschicht weitergeben"}
              </Button>
            </RequirePermission>
          )}
          <RequirePermission permission="eintraege:update">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Bearbeiten
            </Button>
          </RequirePermission>
          <RequirePermission permission="eintraege:delete">
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
            <div className="mb-1 flex items-center gap-2">
              <span
                className={
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
                  (istStoerung
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground")
                }
              >
                {istStoerung ? <AlertTriangle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                {EINTRAG_TYP_LABELS[eintrag.typ]}
              </span>
            </div>
            <CardTitle>{istStoerung ? eintrag.stoerung : eintrag.beschreibung}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateTime(eintrag.zeitpunkt)} · {eintrag.schicht.name}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {eintrag.weitergegeben && (
              <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                <Forward className="h-3 w-3" />
                An Folgeschicht
              </Badge>
            )}
            <PrioritaetBadge prioritaet={eintrag.prioritaet} />
            <StatusBadge status={eintrag.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {istStoerung && (
            <div className="grid gap-3 rounded-md border border-border bg-muted/30 p-3 md:grid-cols-3">
              <LongDetail label="Störung" value={eintrag.stoerung} />
              <LongDetail label="Ursache" value={eintrag.ursache} />
              <LongDetail label="Korrekturmaßnahme" value={eintrag.korrekturmassnahme} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
            <Detail label="Gewerk" value={eintrag.gewerk.name} />
            <Detail label="Fachbereich" value={eintrag.fachbereich.name} />
            <Detail label="Technischer Platz" value={eintrag.technischerPlatz.name} />
            <Detail label="Ersteller" value={eintrag.ersteller.name} />
            <DetailLink
              label="SAP-IH-Auftrag"
              value={eintrag.sapIhAuftrag}
              href={baueIntegrationsLink(integration?.sapUrlTemplate, eintrag.sapIhAuftrag)}
            />
            <DetailLink
              label="EasyFlow-TAG"
              value={eintrag.easyFlowTag}
              href={baueIntegrationsLink(integration?.easyFlowUrlTemplate, eintrag.easyFlowTag)}
            />
            <Detail
              label="Bearbeitungsbeginn"
              value={eintrag.bearbeitungBeginn ? formatDateTime(eintrag.bearbeitungBeginn) : "—"}
            />
            <Detail
              label="Bearbeitungsende"
              value={eintrag.bearbeitungEnde ? formatDateTime(eintrag.bearbeitungEnde) : "—"}
            />
            <Detail
              label="Bearbeitungsdauer"
              value={formatDauer(eintrag.bearbeitungsdauerMinuten)}
            />
            <div>
              <p className="text-muted-foreground">Schlagwörter</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {eintrag.schlagwoerter.length === 0 && <span>—</span>}
                {eintrag.schlagwoerter.map((sw) => (
                  <Badge key={sw.id} variant="outline">
                    {sw.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EintragAnhaenge eintragId={eintrag.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kommentare ({eintrag.kommentare.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {eintrag.kommentare.length === 0 && (
            <p className="text-sm text-muted-foreground">Noch keine Kommentare.</p>
          )}
          {eintrag.kommentare.map((kommentar) => (
            <div key={kommentar.id} className="rounded-md border border-border p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{kommentar.autor.name}</span>
                <span>{formatDateTime(kommentar.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{kommentar.text}</p>
            </div>
          ))}

          <RequirePermission permission="eintraege:comment">
            <div className="space-y-2">
              <Textarea
                placeholder="Kommentar hinzufügen…"
                value={kommentarText}
                onChange={(event) => setKommentarText(event.target.value)}
              />
              <Button
                onClick={submitKommentar}
                disabled={!kommentarText.trim() || addKommentar.isPending}
              >
                {addKommentar.isPending ? "Speichert…" : "Kommentar hinzufügen"}
              </Button>
            </div>
          </RequirePermission>
        </CardContent>
      </Card>

      <EintragHistorie eintragId={eintrag.id} />

      <EintragFormDialog open={editOpen} onOpenChange={setEditOpen} eintrag={eintrag} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

/** Referenzfeld (SAP/EasyFlow): als externer Link, wenn eine URL-Vorlage greift. */
function DetailLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href: string | null;
}) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      {value ? (
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline"
          >
            {value}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <p className="font-medium">{value}</p>
        )
      ) : (
        <p className="font-medium">—</p>
      )}
    </div>
  );
}

/** Detail-Feld für längere, mehrzeilige Texte (Störung/Ursache/Korrekturmaßnahme). */
function LongDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap font-medium">{value || "—"}</p>
    </div>
  );
}

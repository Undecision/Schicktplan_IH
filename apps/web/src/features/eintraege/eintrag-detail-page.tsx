import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RequirePermission } from "@/features/auth/protected-route";
import { useAddKommentar, useEintrag } from "./queries";
import { PrioritaetBadge, StatusBadge } from "./badges";
import { EintragFormDialog } from "./eintrag-form-dialog";
import { EintragAnhaenge } from "./eintrag-anhaenge";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EintragDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: eintrag, isLoading, isError } = useEintrag(id);
  const addKommentar = useAddKommentar();
  const [editOpen, setEditOpen] = useState(false);
  const [kommentarText, setKommentarText] = useState("");

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/schichtbuch")}>
          <ArrowLeft className="h-4 w-4" />
          Zur Liste
        </Button>
        <RequirePermission permission="eintraege:update">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
        </RequirePermission>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{eintrag.beschreibung}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateTime(eintrag.zeitpunkt)} · {eintrag.schicht.name}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <PrioritaetBadge prioritaet={eintrag.prioritaet} />
            <StatusBadge status={eintrag.status} />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
          <Detail label="Gewerk" value={eintrag.gewerk.name} />
          <Detail label="Fachbereich" value={eintrag.fachbereich.name} />
          <Detail label="Technischer Platz" value={eintrag.technischerPlatz.name} />
          <Detail label="Ersteller" value={eintrag.ersteller.name} />
          <Detail label="Verantwortlicher" value={eintrag.verantwortlicher?.name ?? "—"} />
          <Detail
            label="Fälligkeit"
            value={eintrag.faelligkeitsdatum ? formatDateTime(eintrag.faelligkeitsdatum) : "—"}
          />
          <Detail label="SAP-IH-Auftrag" value={eintrag.sapIhAuftrag ?? "—"} />
          <Detail label="EasyFlow-TAG" value={eintrag.easyFlowTag ?? "—"} />
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

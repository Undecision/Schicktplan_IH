import { useState } from "react";
import { AlertCircle, Check, Paperclip, Plus } from "lucide-react";
import type { ArbeitsanweisungListItem } from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequirePermission } from "@/features/auth/protected-route";
import { useAuth } from "@/features/auth/auth-context";
import { useAnweisungen } from "./queries";
import { AnweisungFormDialog } from "./anweisung-form-dialog";
import { AnweisungDetailDialog } from "./anweisung-detail-dialog";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnweisungenPage() {
  const { data: anweisungen = [], isLoading } = useAnweisungen();
  const { hasPermission } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<ArbeitsanweisungListItem | null>(null);

  const ungelesen = anweisungen.filter((a) => !a.gelesen);
  const gelesen = anweisungen.filter((a) => a.gelesen);
  const darfVerwalten = hasPermission("anweisungen:manage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Hinweise der Meister/Schichtleiter für das Team – ungelesene bitte quittieren.
        </p>
        <RequirePermission permission="anweisungen:manage">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Neue Anweisung
          </Button>
        </RequirePermission>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Lädt…</p>}
      {!isLoading && anweisungen.length === 0 && (
        <p className="text-sm text-muted-foreground">Keine Arbeitsanweisungen vorhanden.</p>
      )}

      {ungelesen.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Ungelesen ({ungelesen.length})
          </h2>
          <div className="space-y-2">
            {ungelesen.map((a) => (
              <AnweisungCard
                key={a.id}
                anweisung={a}
                darfVerwalten={darfVerwalten}
                onClick={() => setDetail(a)}
                formatDateTime={formatDateTime}
              />
            ))}
          </div>
        </section>
      )}

      {gelesen.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Check className="h-4 w-4" />
            Gelesen ({gelesen.length})
          </h2>
          <div className="space-y-2">
            {gelesen.map((a) => (
              <AnweisungCard
                key={a.id}
                anweisung={a}
                darfVerwalten={darfVerwalten}
                onClick={() => setDetail(a)}
                formatDateTime={formatDateTime}
              />
            ))}
          </div>
        </section>
      )}

      <AnweisungFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <AnweisungDetailDialog anweisung={detail} onOpenChange={(open) => !open && setDetail(null)} />
    </div>
  );
}

function AnweisungCard({
  anweisung,
  darfVerwalten,
  onClick,
  formatDateTime,
}: {
  anweisung: ArbeitsanweisungListItem;
  darfVerwalten: boolean;
  onClick: () => void;
  formatDateTime: (iso: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium">{anweisung.titel}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {anweisung.anhang && <Paperclip className="h-4 w-4 text-muted-foreground" />}
          {anweisung.gelesen ? (
            <Badge variant="outline" className="gap-1 text-green-600">
              <Check className="h-3 w-3" />
              Gelesen
            </Badge>
          ) : (
            <Badge className="bg-amber-500 hover:bg-amber-500">Ungelesen</Badge>
          )}
        </div>
      </div>
      {anweisung.text && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{anweisung.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{anweisung.gewerk.name}</Badge>
        {anweisung.schicht && <Badge variant="outline">{anweisung.schicht.name}</Badge>}
        <span>
          {anweisung.ersteller.name} · {formatDateTime(anweisung.createdAt)}
        </span>
        {darfVerwalten && (
          <span className="ml-auto">
            {anweisung.anzahlGelesen} von {anweisung.anzahlEmpfaenger} gelesen
          </span>
        )}
      </div>
    </button>
  );
}

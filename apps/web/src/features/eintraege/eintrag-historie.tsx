import { History } from "lucide-react";
import type { AuditAction } from "@schichtbuch/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHistorie } from "./queries";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ACTION_LABEL: Record<AuditAction, string> = {
  CREATE: "Erstellt",
  UPDATE: "Geändert",
  DELETE: "Gelöscht",
  LOGIN_SUCCESS: "Anmeldung",
  LOGIN_FAILURE: "Anmeldung fehlgeschlagen",
};

export function EintragHistorie({ eintragId }: { eintragId: string }) {
  const { data: historie = [], isLoading } = useHistorie(eintragId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Änderungsverlauf ({historie.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Lädt…</p>}
        {!isLoading && historie.length === 0 && (
          <p className="text-sm text-muted-foreground">Keine Änderungen protokolliert.</p>
        )}

        <ol className="relative space-y-4 border-l border-border pl-4">
          {historie.map((eintrag) => (
            <li key={eintrag.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={eintrag.action === "CREATE" ? "success" : "outline"}>
                  {ACTION_LABEL[eintrag.action]}
                </Badge>
                <span className="font-medium">{eintrag.actorName ?? "System"}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(eintrag.zeitpunkt)}
                </span>
              </div>
              {eintrag.aenderungen.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {eintrag.aenderungen.map((a) => (
                    <li key={a.feld} className="text-sm">
                      <span className="text-muted-foreground">{a.label}: </span>
                      <span className="line-through decoration-destructive/60">
                        {a.vorher ?? "—"}
                      </span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-medium">{a.nachher ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
              {eintrag.action === "CREATE" && (
                <p className="mt-1 text-sm text-muted-foreground">Eintrag angelegt.</p>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Check, Download, FileText, Loader2, Users } from "lucide-react";
import type { ArbeitsanweisungListItem } from "@schichtbuch/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-context";
import { fetchAnweisungAnhangBlob } from "./api";
import { useQuittieren, useQuittungen } from "./queries";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnweisungDetailDialog({
  anweisung,
  onOpenChange,
}: {
  anweisung: ArbeitsanweisungListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { hasPermission } = useAuth();
  const quittieren = useQuittieren();
  const darfVerwalten = hasPermission("anweisungen:manage");
  // Empfänger = Leser ohne Verwaltungsrecht (nur diese müssen quittieren).
  const istEmpfaenger = hasPermission("anweisungen:read") && !darfVerwalten;

  return (
    <Dialog open={!!anweisung} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {anweisung && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{anweisung.titel}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{anweisung.gewerk.name}</Badge>
                {anweisung.fachbereich && (
                  <Badge variant="outline">{anweisung.fachbereich.name}</Badge>
                )}
                {anweisung.schicht && <Badge variant="outline">{anweisung.schicht.name}</Badge>}
                <span>
                  von {anweisung.ersteller.name} · {formatDateTime(anweisung.createdAt)}
                </span>
              </div>

              {anweisung.text && <p className="whitespace-pre-wrap text-sm">{anweisung.text}</p>}

              {anweisung.anhang && <AnhangVorschau anweisung={anweisung} />}

              {darfVerwalten && <Lesestatus anweisungId={anweisung.id} />}

              {istEmpfaenger && (
                <div className="flex items-center justify-between gap-2">
                  {anweisung.gelesen ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      Gelesen
                      {anweisung.gelesenAm ? ` am ${formatDateTime(anweisung.gelesenAm)}` : ""}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Noch nicht quittiert</span>
                  )}
                  {!anweisung.gelesen && (
                    <Button
                      onClick={() => quittieren.mutate(anweisung.id)}
                      disabled={quittieren.isPending}
                    >
                      <Check className="h-4 w-4" />
                      Als gelesen quittieren
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Inline-Vorschau des Anweisungs-Anhangs (Bild/PDF), mit Download-Möglichkeit. */
function AnhangVorschau({ anweisung }: { anweisung: ArbeitsanweisungListItem }) {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<"laedt" | "bereit" | "fehler">("laedt");
  const anhang = anweisung.anhang!;
  const isImage = anhang.mime.startsWith("image/");
  const isPdf = anhang.mime === "application/pdf";

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setStatus("laedt");
    fetchAnweisungAnhangBlob(anweisung.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setStatus("bereit");
      })
      .catch(() => !cancelled && setStatus("fehler"));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [anweisung.id]);

  function download() {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = anhang.dateiname;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 truncate text-sm font-medium">
          <FileText className="h-4 w-4 shrink-0" />
          {anhang.dateiname}
        </span>
        <Button variant="ghost" size="sm" onClick={download} disabled={!src}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-h-[200px] items-center justify-center overflow-auto">
        {status === "laedt" && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Vorschau wird geladen…
          </span>
        )}
        {status === "fehler" && (
          <p className="text-sm text-destructive">Vorschau konnte nicht geladen werden.</p>
        )}
        {status === "bereit" && isImage && src && (
          <img
            src={src}
            alt={anhang.dateiname}
            className="max-h-[60vh] w-auto rounded object-contain"
          />
        )}
        {status === "bereit" && isPdf && src && (
          <iframe src={src} title={anhang.dateiname} className="h-[60vh] w-full rounded border-0" />
        )}
        {status === "bereit" && !isImage && !isPdf && (
          <p className="text-sm text-muted-foreground">Keine Vorschau verfügbar.</p>
        )}
      </div>
    </div>
  );
}

/** Meister-Auswertung: welche Empfänger haben die Anweisung gelesen. */
function Lesestatus({ anweisungId }: { anweisungId: string }) {
  const { data, isLoading } = useQuittungen(anweisungId);

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        Lesestatus
        {data && (
          <span className="text-muted-foreground">
            ({data.anzahlGelesen} von {data.anzahlEmpfaenger} gelesen)
          </span>
        )}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Lädt…</p>}
      {data && data.empfaenger.length === 0 && (
        <p className="text-sm text-muted-foreground">Keine Empfänger im Gewerk hinterlegt.</p>
      )}
      <ul className="space-y-1">
        {data?.empfaenger.map((e) => (
          <li key={e.user.id} className="flex items-center justify-between text-sm">
            <span>{e.user.name}</span>
            {e.gelesen ? (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-3.5 w-3.5" />
                {e.gelesenAm ? formatDateTime(e.gelesenAm) : "gelesen"}
              </span>
            ) : (
              <span className="text-muted-foreground">offen</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

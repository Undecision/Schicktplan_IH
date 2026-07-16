import { useEffect, useRef, useState } from "react";
import { Download, File as FileIcon, FileText, Loader2, Trash2, Upload } from "lucide-react";
import {
  ANHANG_ACCEPT_ATTRIBUTE,
  ANHANG_ERLAUBTE_MIME_TYPES,
  ANHANG_MAX_GROESSE_BYTES,
  istBildMime,
  type Anhang,
} from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequirePermission } from "@/features/auth/protected-route";
import { fetchAnhangBlob } from "./anhaenge-api";
import { useAnhaenge, useDeleteAnhang, useUploadAnhang } from "./queries";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MAX_MB = Math.floor(ANHANG_MAX_GROESSE_BYTES / (1024 * 1024));

export function EintragAnhaenge({ eintragId }: { eintragId: string }) {
  const { data: anhaenge, isLoading } = useAnhaenge(eintragId);
  const upload = useUploadAnhang(eintragId);
  const remove = useDeleteAnhang(eintragId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (!ANHANG_ERLAUBTE_MIME_TYPES.includes(file.type as never)) {
      return `Dateityp nicht erlaubt: ${file.name}`;
    }
    if (file.size > ANHANG_MAX_GROESSE_BYTES) {
      return `Datei zu groß (max. ${MAX_MB} MB): ${file.name}`;
    }
    return null;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    for (const file of Array.from(files)) {
      const validationError = validate(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      setCurrentName(file.name);
      setProgress(0);
      try {
        await upload.mutateAsync({ file, onProgress: setProgress });
      } catch {
        setError(`Upload fehlgeschlagen: ${file.name}`);
      }
    }
    setProgress(null);
    setCurrentName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDownload(anhang: Anhang) {
    try {
      const blob = await fetchAnhangBlob(eintragId, anhang.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = anhang.dateiname;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(`Download fehlgeschlagen: ${anhang.dateiname}`);
    }
  }

  const count = anhaenge?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anhänge ({count})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RequirePermission permission="eintraege:attach">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              void handleFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border text-muted-foreground"
            }`}
          >
            <Upload className="h-6 w-6" />
            <p>
              Dateien hierher ziehen oder{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => inputRef.current?.click()}
              >
                auswählen
              </button>
            </p>
            <p className="text-xs">
              Bilder, PDF, Office-Dokumente, TXT, MP4 · max. {MAX_MB} MB pro Datei
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ANHANG_ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </div>

          {progress !== null && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>
                  Lädt hoch{currentName ? ` – ${currentName}` : ""}… {progress}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </RequirePermission>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {isLoading && <p className="text-sm text-muted-foreground">Lädt…</p>}
        {!isLoading && count === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine Anhänge.</p>
        )}

        <ul className="space-y-2">
          {anhaenge?.map((anhang) => (
            <li
              key={anhang.id}
              className="flex items-center gap-3 rounded-md border border-border p-2"
            >
              <AnhangVorschau eintragId={eintragId} anhang={anhang} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{anhang.dateiname}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(anhang.groesse)} · {anhang.hochgeladenVon.name} ·{" "}
                  {formatDateTime(anhang.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                title="Herunterladen"
                onClick={() => void handleDownload(anhang)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <RequirePermission permission="eintraege:attach">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Löschen"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(anhang.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </RequirePermission>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * Vorschau eines Anhangs: für Bilder ein Thumbnail (Blob wird RBAC-geschützt
 * geladen und als Object-URL angezeigt), sonst ein Datei-Icon. HEIC kann von
 * vielen Browsern nicht dekodiert werden – dann greift der onError-Fallback.
 */
function AnhangVorschau({ eintragId, anhang }: { eintragId: string; anhang: Anhang }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = istBildMime(anhang.mime);

  useEffect(() => {
    if (!isImage) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchAnhangBlob(eintragId, anhang.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [eintragId, anhang.id, isImage]);

  const Icon =
    anhang.mime === "text/plain" || anhang.mime === "application/pdf" ? FileText : FileIcon;

  if (isImage && src && !failed) {
    return (
      <img
        src={src}
        alt={anhang.dateiname}
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
      <Icon className="h-5 w-5" />
    </div>
  );
}

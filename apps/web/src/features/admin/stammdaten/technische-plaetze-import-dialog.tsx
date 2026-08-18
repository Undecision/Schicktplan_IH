import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import type { TechnischePlaetzeImportResult } from "@schichtbuch/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { importTechnischePlaetze, ladeTechnischePlaetzeVorlage } from "./api";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TechnischePlaetzeImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TechnischePlaetzeImportResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (datei: File) => importTechnischePlaetze(datei),
    onSuccess: (data) => {
      setResult(data);
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["stammdaten", "technische-plaetze"] });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Import fehlgeschlagen.";
      setServerError(message);
    },
  });

  useEffect(() => {
    if (open) {
      setFile(null);
      setResult(null);
      setServerError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  function handleSubmit() {
    if (!file) return;
    setServerError(null);
    importMutation.mutate(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Technische Plätze importieren</DialogTitle>
          <DialogDescription>
            Excel-Datei (.xlsx) mit den Spalten <strong>Bezeichnung</strong>, <strong>Code</strong>,{" "}
            <strong>Fachbereich</strong> (optional) und <strong>SAP-synchronisierbar</strong>{" "}
            (optional). Bestehende Plätze werden anhand des Codes aktualisiert, neue angelegt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void ladeTechnischePlaetzeVorlage()}
          >
            <Download className="h-4 w-4" />
            Vorlage herunterladen
          </Button>

          <div className="space-y-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setServerError(null);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {file ? file.name : "Datei auswählen…"}
            </Button>
          </div>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant={result.uebersprungen > 0 ? "destructive" : "default"}>
              <AlertDescription>
                <p className="font-medium">
                  {result.angelegt} angelegt, {result.aktualisiert} aktualisiert,{" "}
                  {result.uebersprungen} übersprungen ({result.verarbeitet} verarbeitet).
                </p>
                {result.fehler.length > 0 && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
                    {result.fehler.map((fehler, index) => (
                      <li key={`${fehler.zeile}-${index}`}>
                        Zeile {fehler.zeile}
                        {fehler.code ? ` (${fehler.code})` : ""}: {fehler.meldung}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Schließen" : "Abbrechen"}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!file || importMutation.isPending}>
            <Upload className="h-4 w-4" />
            {importMutation.isPending ? "Importiert…" : "Importieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

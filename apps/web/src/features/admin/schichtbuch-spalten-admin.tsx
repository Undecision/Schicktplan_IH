import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, RotateCcw, Save } from "lucide-react";
import { SCHICHTBUCH_SPALTEN, SCHICHTBUCH_SPALTEN_STANDARD } from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useSchichtbuchSpalten,
  useUpdateSchichtbuchSpalten,
} from "@/features/einstellungen/queries";

interface Zeile {
  key: string;
  label: string;
  sichtbar: boolean;
}

const LABELS = new Map(SCHICHTBUCH_SPALTEN.map((s) => [s.key, s.label]));

/** Baut die Zeilenliste: sichtbare Spalten in gespeicherter Reihenfolge zuerst,
 *  danach die restlichen (ausgeblendeten) Spalten. */
function baueZeilen(reihenfolge: string[]): Zeile[] {
  const sichtbar = reihenfolge.filter((k) => LABELS.has(k));
  const rest = SCHICHTBUCH_SPALTEN.map((s) => s.key).filter((k) => !sichtbar.includes(k));
  return [
    ...sichtbar.map((key) => ({ key, label: LABELS.get(key) ?? key, sichtbar: true })),
    ...rest.map((key) => ({ key, label: LABELS.get(key) ?? key, sichtbar: false })),
  ];
}

export function SchichtbuchSpaltenAdmin() {
  const { data: config } = useSchichtbuchSpalten();
  const speichern = useUpdateSchichtbuchSpalten();
  const [zeilen, setZeilen] = useState<Zeile[]>([]);

  useEffect(() => {
    if (config) setZeilen(baueZeilen(config.reihenfolge));
  }, [config]);

  function verschiebe(index: number, richtung: -1 | 1) {
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= zeilen.length) return;
    setZeilen((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(ziel, 0, item!);
      return next;
    });
  }

  function toggle(index: number) {
    setZeilen((prev) => prev.map((z, i) => (i === index ? { ...z, sichtbar: !z.sichtbar } : z)));
  }

  function speichereReihenfolge() {
    const reihenfolge = zeilen.filter((z) => z.sichtbar).map((z) => z.key);
    speichern.mutate(reihenfolge);
  }

  const anzahlSichtbar = zeilen.filter((z) => z.sichtbar).length;

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Schichtbuch-Spalten</h2>
        <p className="text-sm text-muted-foreground">
          Reihenfolge und Sichtbarkeit der Spalten in der Schichtbuch-Tabelle. Gilt für alle Nutzer.
        </p>
      </div>

      <ol className="divide-y divide-border rounded-lg border border-border bg-card">
        {zeilen.map((zeile, index) => (
          <li
            key={zeile.key}
            className={`flex items-center gap-3 px-3 py-2 ${zeile.sichtbar ? "" : "opacity-50"}`}
          >
            <span className="w-6 text-right text-xs text-muted-foreground">
              {zeile.sichtbar ? index + 1 : "—"}
            </span>
            <label className="flex flex-1 items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={zeile.sichtbar}
                onChange={() => toggle(index)}
              />
              <span className="text-sm font-medium">{zeile.label}</span>
            </label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Nach oben"
                disabled={index === 0}
                onClick={() => verschiebe(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Nach unten"
                disabled={index === zeilen.length - 1}
                onClick={() => verschiebe(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ol>

      {anzahlSichtbar === 0 && (
        <Alert variant="destructive">
          <AlertDescription>Mindestens eine Spalte muss sichtbar sein.</AlertDescription>
        </Alert>
      )}
      {speichern.isError && (
        <Alert variant="destructive">
          <AlertDescription>Speichern fehlgeschlagen.</AlertDescription>
        </Alert>
      )}
      {speichern.isSuccess && <p className="text-sm text-green-600">Gespeichert.</p>}

      <div className="flex gap-2">
        <Button
          onClick={speichereReihenfolge}
          disabled={speichern.isPending || anzahlSichtbar === 0}
        >
          <Save className="h-4 w-4" />
          {speichern.isPending ? "Speichert…" : "Speichern"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setZeilen(baueZeilen([...SCHICHTBUCH_SPALTEN_STANDARD]))}
        >
          <RotateCcw className="h-4 w-4" />
          Standard
        </Button>
      </div>
    </div>
  );
}

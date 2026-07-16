import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileDown, Save } from "lucide-react";
import type { SchichtbucheintragListItem, UebergabeDetail } from "@schichtbuch/shared";
import { UebergabeStatus } from "@schichtbuch/shared";
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
import { PrioritaetBadge, StatusBadge } from "@/features/eintraege/badges";
import { useFormOptions } from "@/features/eintraege/queries";
import { oeffneUebergabePdf } from "@/features/uebergaben/api";
import { useUebergabe, useUebergeben, useUpdateUebergabe } from "@/features/uebergaben/queries";
import { StatusUebergabeBadge } from "./uebergabe-page";

const KEIN = "__kein__";

const TEXTFELDER: { key: keyof UebergabeDetail; label: string; placeholder: string }[] = [
  {
    key: "sicherheitshinweise",
    label: "Sicherheitsinformationen",
    placeholder: "PSA-Pflicht, Gefahrenstellen…",
  },
  { key: "freischaltungen", label: "Freischaltungen", placeholder: "Freigeschaltete Anlagen…" },
  {
    key: "arbeitsgenehmigungen",
    label: "Arbeitsgenehmigungen",
    placeholder: "Erteilte Genehmigungen/Erlaubnisscheine…",
  },
  { key: "wichtigeTermine", label: "Wichtige Termine", placeholder: "Anstehende Wartungen…" },
  {
    key: "besondereHinweise",
    label: "Besondere Hinweise",
    placeholder: "Sonstige Übergabepunkte…",
  },
];

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

export function UebergabeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: u, isLoading, isError } = useUebergabe(id);
  const { data: options } = useFormOptions();
  const update = useUpdateUebergabe(id ?? "");
  const uebergeben = useUebergeben(id ?? "");

  const [texte, setTexte] = useState<Record<string, string>>({});
  const [uebernommenVonId, setUebernommenVonId] = useState("");

  useEffect(() => {
    if (u) {
      setTexte({
        sicherheitshinweise: u.sicherheitshinweise ?? "",
        freischaltungen: u.freischaltungen ?? "",
        arbeitsgenehmigungen: u.arbeitsgenehmigungen ?? "",
        wichtigeTermine: u.wichtigeTermine ?? "",
        besondereHinweise: u.besondereHinweise ?? "",
      });
      setUebernommenVonId(u.uebernommenVon?.id ?? "");
    }
  }, [u]);

  if (isLoading) return <p className="text-muted-foreground">Lädt…</p>;
  if (isError || !u) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Übergabe nicht gefunden.</p>
        <Button variant="outline" onClick={() => navigate("/uebergabe")}>
          <ArrowLeft className="h-4 w-4" />
          Zur Übersicht
        </Button>
      </div>
    );
  }

  const istEntwurf = u.status === UebergabeStatus.ENTWURF;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate("/uebergabe")}>
          <ArrowLeft className="h-4 w-4" />
          Zur Übersicht
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void oeffneUebergabePdf(u.id)}>
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          {istEntwurf && (
            <Button
              onClick={() => uebergeben.mutate(uebernommenVonId || null)}
              disabled={uebergeben.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {uebergeben.isPending ? "Übergibt…" : "Schicht übergeben"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              Schichtübergabe {u.schicht.name} · {u.gewerk.name}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(u.datum)} · Schicht {u.beginn}–{u.ende}
            </p>
          </div>
          <StatusUebergabeBadge status={u.status} />
        </CardHeader>
        {!istEntwurf && (
          <CardContent className="text-sm text-muted-foreground">
            Übergeben von <span className="font-medium">{u.uebergebenVon?.name ?? "—"}</span> an{" "}
            <span className="font-medium">{u.uebernommenVon?.name ?? "—"}</span>
            {u.uebergebenAm ? ` am ${formatDateTime(u.uebergebenAm)}` : ""}.
          </CardContent>
        )}
      </Card>

      <EintragListe
        titel={`Offene Störungen (${u.offeneStoerungenListe.length})`}
        eintraege={u.offeneStoerungenListe}
        leer="Keine offenen Störungen."
      />
      <EintragListe
        titel={`Laufende Arbeiten (${u.laufendeArbeitenListe.length})`}
        eintraege={u.laufendeArbeitenListe}
        leer="Keine laufenden Arbeiten."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Übergabepunkte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TEXTFELDER.map((feld) => (
            <div key={feld.key as string}>
              <label className="mb-1 block text-xs text-muted-foreground">{feld.label}</label>
              {istEntwurf ? (
                <Textarea
                  value={texte[feld.key as string] ?? ""}
                  placeholder={feld.placeholder}
                  rows={2}
                  onChange={(e) =>
                    setTexte((t) => ({ ...t, [feld.key as string]: e.target.value }))
                  }
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm">
                  {(u[feld.key] as string | null) || "—"}
                </p>
              )}
            </div>
          ))}

          {istEntwurf && (
            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
              <div className="w-64">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Übernehmende Person (nächste Schicht)
                </label>
                <Select
                  value={uebernommenVonId || KEIN}
                  onValueChange={(v) => setUebernommenVonId(v === KEIN ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KEIN}>— offen —</SelectItem>
                    {(options?.benutzer ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  update.mutate({
                    sicherheitshinweise: texte.sicherheitshinweise || null,
                    freischaltungen: texte.freischaltungen || null,
                    arbeitsgenehmigungen: texte.arbeitsgenehmigungen || null,
                    wichtigeTermine: texte.wichtigeTermine || null,
                    besondereHinweise: texte.besondereHinweise || null,
                  })
                }
                disabled={update.isPending}
              >
                <Save className="h-4 w-4" />
                {update.isPending ? "Speichert…" : "Speichern"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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

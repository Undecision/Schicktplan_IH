import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Paperclip, Plus, Search, X } from "lucide-react";
import type { ArbeitsanweisungFilter, ArbeitsanweisungListItem } from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { RequirePermission } from "@/features/auth/protected-route";
import { useAuth } from "@/features/auth/auth-context";
import { useFormOptions } from "@/features/eintraege/queries";
import { useAnweisungen } from "./queries";
import { AnweisungFormDialog } from "./anweisung-form-dialog";
import { AnweisungDetailDialog } from "./anweisung-detail-dialog";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnweisungenPage() {
  const { hasPermission } = useAuth();
  const { data: options } = useFormOptions();
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<ArbeitsanweisungListItem | null>(null);

  // Such-/Filterzustand (Suche debounced), um „alte" Anweisungen wiederzufinden.
  const [suche, setSuche] = useState("");
  const [suchInput, setSuchInput] = useState("");
  const [gewerkId, setGewerkId] = useState("");
  const [fachbereichId, setFachbereichId] = useState("");
  const [schichtId, setSchichtId] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setSuche(suchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [suchInput]);

  const filter = useMemo<ArbeitsanweisungFilter>(
    () => ({
      q: suche || undefined,
      gewerkId: gewerkId || undefined,
      fachbereichId: fachbereichId || undefined,
      schichtId: schichtId || undefined,
    }),
    [suche, gewerkId, fachbereichId, schichtId],
  );
  const hatFilter = !!(suche || gewerkId || fachbereichId || schichtId);

  function reset() {
    setSuche("");
    setSuchInput("");
    setGewerkId("");
    setFachbereichId("");
    setSchichtId("");
  }

  const { data: anweisungen = [], isLoading } = useAnweisungen(filter);

  const ungelesen = anweisungen.filter((a) => !a.gelesen);
  const gelesen = anweisungen.filter((a) => a.gelesen);
  const darfVerwalten = hasPermission("anweisungen:manage");
  // Empfänger (Instandhalter/Schichtleiter) sehen Ungelesen/Gelesen; Ersteller
  // (Meister/Admin mit Verwaltungsrecht) sehen eine flache Liste mit Lesestatus.
  const istEmpfaenger = hasPermission("anweisungen:read") && !darfVerwalten;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {istEmpfaenger
            ? "Hinweise der Meister für das Team – ungelesene bitte quittieren."
            : "Von Ihnen bereitgestellte Hinweise und deren Lesestatus."}
        </p>
        <RequirePermission permission="anweisungen:manage">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Neue Anweisung
          </Button>
        </RequirePermission>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={suchInput}
            onChange={(e) => setSuchInput(e.target.value)}
            placeholder="Suche (Titel, Text, Ersteller…)"
            className="pl-9"
          />
        </div>
        <div className="w-44">
          <Combobox
            value={gewerkId}
            onChange={setGewerkId}
            options={(options?.gewerke ?? []).map((g) => ({ value: g.id, label: g.name }))}
            placeholder="Gewerk: Alle"
            emptyOption="Gewerk: Alle"
          />
        </div>
        <div className="w-44">
          <Combobox
            value={fachbereichId}
            onChange={setFachbereichId}
            options={(options?.fachbereiche ?? []).map((f) => ({ value: f.id, label: f.name }))}
            placeholder="Fachbereich: Alle"
            emptyOption="Fachbereich: Alle"
          />
        </div>
        <div className="w-44">
          <Combobox
            value={schichtId}
            onChange={setSchichtId}
            options={(options?.schichten ?? []).map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Schicht: Alle"
            emptyOption="Schicht: Alle"
          />
        </div>
        {hatFilter && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4" />
            Zurücksetzen
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Lädt…</p>}
      {!isLoading && anweisungen.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {hatFilter
            ? "Keine Anweisungen für die aktuellen Filter."
            : "Keine Arbeitsanweisungen vorhanden."}
        </p>
      )}

      {!istEmpfaenger && darfVerwalten && anweisungen.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Bereitgestellte Anweisungen ({anweisungen.length})
          </h2>
          <div className="space-y-2">
            {anweisungen.map((a) => (
              <AnweisungCard
                key={a.id}
                anweisung={a}
                darfVerwalten={darfVerwalten}
                istEmpfaenger={istEmpfaenger}
                onClick={() => setDetail(a)}
                formatDateTime={formatDateTime}
              />
            ))}
          </div>
        </section>
      )}

      {istEmpfaenger && ungelesen.length > 0 && (
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
                istEmpfaenger={istEmpfaenger}
                onClick={() => setDetail(a)}
                formatDateTime={formatDateTime}
              />
            ))}
          </div>
        </section>
      )}

      {istEmpfaenger && gelesen.length > 0 && (
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
                istEmpfaenger={istEmpfaenger}
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
  istEmpfaenger,
  onClick,
  formatDateTime,
}: {
  anweisung: ArbeitsanweisungListItem;
  darfVerwalten: boolean;
  istEmpfaenger: boolean;
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
          {istEmpfaenger &&
            (anweisung.gelesen ? (
              <Badge variant="outline" className="gap-1 text-green-600">
                <Check className="h-3 w-3" />
                Gelesen
              </Badge>
            ) : (
              <Badge className="bg-amber-500 hover:bg-amber-500">Ungelesen</Badge>
            ))}
        </div>
      </div>
      {anweisung.text && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{anweisung.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{anweisung.gewerk.name}</Badge>
        {anweisung.fachbereich && <Badge variant="outline">{anweisung.fachbereich.name}</Badge>}
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

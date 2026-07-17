import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ClipboardList, FileStack, Hammer, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  EINTRAG_STATUS,
  EintragStatus,
  PRIORITAETEN,
  Prioritaet,
  type DashboardData,
} from "@schichtbuch/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PrioritaetBadge, StatusBadge } from "@/features/eintraege/badges";
import { useDashboard } from "@/features/dashboard/queries";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const [erledigteAusblenden, setErledigteAusblenden] = useState(false);

  if (isLoading) {
    return <p className="text-muted-foreground">Lädt…</p>;
  }
  if (isError || !data) {
    return <p className="text-destructive">Dashboard konnte nicht geladen werden.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={ClipboardList}
          label="Offen"
          value={data.offen}
          to="/schichtbuch?status=OFFEN"
          tone="default"
        />
        <StatTile
          icon={Hammer}
          label="In Bearbeitung"
          value={data.inBearbeitung}
          to="/schichtbuch?status=IN_BEARBEITUNG"
          tone="default"
        />
        <StatTile
          icon={AlertTriangle}
          label="Kritisch & offen"
          value={data.kritischeOffen}
          to="/schichtbuch?prioritaet=KRITISCH"
          tone="critical"
        />
        <StatTile
          icon={FileStack}
          label="Offene SAP-Aufträge"
          value={data.offeneSapAuftraege}
          to="/schichtbuch"
          tone="default"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nach Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {EINTRAG_STATUS.map((status) => (
              <VerteilungZeile
                key={status}
                anzahl={anzahlFuer(data.statusVerteilung, "status", status)}
                gesamt={summe(data.statusVerteilung)}
                to={`/schichtbuch?status=${status}`}
                badge={<StatusBadge status={status} />}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nach Priorität</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PRIORITAETEN.map((prioritaet) => (
              <VerteilungZeile
                key={prioritaet}
                anzahl={anzahlFuer(data.prioritaetVerteilung, "prioritaet", prioritaet)}
                gesamt={summe(data.prioritaetVerteilung)}
                to={`/schichtbuch?prioritaet=${prioritaet}`}
                badge={<PrioritaetBadge prioritaet={prioritaet} />}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Zuletzt erfasst</CardTitle>
            <div className="flex items-center gap-2">
              <Switch
                id="erledigte-ausblenden"
                checked={erledigteAusblenden}
                onCheckedChange={setErledigteAusblenden}
              />
              <Label htmlFor="erledigte-ausblenden" className="text-xs text-muted-foreground">
                Erledigte ausblenden
              </Label>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(() => {
              const eintraege = erledigteAusblenden
                ? data.letzteEintraege.filter((e) => e.status !== EintragStatus.ERLEDIGT)
                : data.letzteEintraege;
              if (eintraege.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    {erledigteAusblenden ? "Keine offenen Einträge." : "Noch keine Einträge."}
                  </p>
                );
              }
              return eintraege.map((eintrag) => (
                <Link
                  key={eintrag.id}
                  to={`/schichtbuch/${eintrag.id}`}
                  className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-accent"
                >
                  <PrioritaetBadge prioritaet={eintrag.prioritaet} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{eintrag.beschreibung}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(eintrag.zeitpunkt)} · {eintrag.gewerk.name} ·{" "}
                      {eintrag.technischerPlatz.name}
                    </p>
                  </div>
                  <StatusBadge status={eintrag.status} />
                </Link>
              ));
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zuletzt bearbeitete Anlagen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.zuletztAnlagen.length === 0 && (
              <p className="text-sm text-muted-foreground">Noch keine Anlagen.</p>
            )}
            {data.zuletztAnlagen.map((anlage) => (
              <Link
                key={anlage.id}
                to={`/schichtbuch?technischerPlatzId=${anlage.id}`}
                className="flex items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-accent"
              >
                <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">{anlage.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(anlage.zuletzt)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type ToneKey = "default" | "critical";

function StatTile({
  icon: Icon,
  label,
  value,
  to,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  to: string;
  tone: ToneKey;
}) {
  const critical = tone === "critical" && value > 0;
  return (
    <Link to={to} className="group block">
      <Card className={critical ? "border-destructive/50" : undefined}>
        <CardContent className="flex items-center gap-4 py-5">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-lg ${
              critical ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </CardContent>
      </Card>
    </Link>
  );
}

function VerteilungZeile({
  anzahl,
  gesamt,
  to,
  badge,
}: {
  anzahl: number;
  gesamt: number;
  to: string;
  badge: ReactNode;
}) {
  const prozent = gesamt > 0 ? Math.round((anzahl / gesamt) * 100) : 0;
  return (
    <Link to={to} className="flex items-center gap-3 rounded-md p-1.5 hover:bg-accent">
      <span className="w-32 shrink-0">{badge}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${prozent}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-medium tabular-nums">{anzahl}</span>
    </Link>
  );
}

function anzahlFuer<T extends { anzahl: number }>(
  liste: T[],
  key: keyof T,
  wert: EintragStatus | Prioritaet,
): number {
  return liste.find((e) => e[key] === wert)?.anzahl ?? 0;
}

function summe(liste: DashboardData["statusVerteilung"] | DashboardData["prioritaetVerteilung"]) {
  return liste.reduce((acc, e) => acc + e.anzahl, 0);
}

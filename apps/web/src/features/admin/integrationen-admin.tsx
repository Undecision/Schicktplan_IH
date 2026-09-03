import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { baueIntegrationsLink } from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIntegrationLinks, useUpdateIntegrationLinks } from "@/features/einstellungen/queries";

export function IntegrationenAdmin() {
  const { data: config } = useIntegrationLinks();
  const speichern = useUpdateIntegrationLinks();
  const [sap, setSap] = useState("");
  const [easyFlow, setEasyFlow] = useState("");

  useEffect(() => {
    if (config) {
      setSap(config.sapUrlTemplate ?? "");
      setEasyFlow(config.easyFlowUrlTemplate ?? "");
    }
  }, [config]);

  function speichere() {
    speichern.mutate({
      sapUrlTemplate: sap.trim() || null,
      easyFlowUrlTemplate: easyFlow.trim() || null,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Verknüpfungen (SAP / EasyFlow)</h2>
        <p className="text-sm text-muted-foreground">
          Hinterlege pro System eine URL-Vorlage. Der Platzhalter <code>{"{nummer}"}</code> wird
          durch den eingegebenen Wert ersetzt (fehlt er, wird die Nummer angehängt). Danach werden
          SAP-IH-Auftrag bzw. EasyFlow-TAG in den Einträgen als anklickbarer Link angezeigt. Leer
          lassen = kein Link.
        </p>
      </div>

      <Feld
        label="SAP-IH-Auftrag – URL-Vorlage"
        value={sap}
        onChange={setSap}
        placeholder="https://sap.example.com/order/{nummer}"
        beispiel={baueIntegrationsLink(sap, "700123456")}
      />
      <Feld
        label="EasyFlow-TAG – URL-Vorlage"
        value={easyFlow}
        onChange={setEasyFlow}
        placeholder="https://easyflow.example.com/tag/{nummer}"
        beispiel={baueIntegrationsLink(easyFlow, "123456")}
      />

      <div className="flex items-center gap-3">
        <Button onClick={speichere} disabled={speichern.isPending}>
          <Save className="h-4 w-4" />
          {speichern.isPending ? "Speichert…" : "Speichern"}
        </Button>
        {speichern.isSuccess && <span className="text-sm text-green-600">Gespeichert.</span>}
        {speichern.isError && (
          <span className="text-sm text-destructive">Speichern fehlgeschlagen.</span>
        )}
      </div>
    </div>
  );
}

function Feld({
  label,
  value,
  onChange,
  placeholder,
  beispiel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  beispiel: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {value.trim() && (
        <p className="text-xs text-muted-foreground">
          Beispiel:{" "}
          {beispiel ? (
            <a
              href={beispiel}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {beispiel}
            </a>
          ) : (
            <span className="text-destructive">
              Ungültige Vorlage (muss mit http:// oder https:// beginnen).
            </span>
          )}
        </p>
      )}
    </div>
  );
}

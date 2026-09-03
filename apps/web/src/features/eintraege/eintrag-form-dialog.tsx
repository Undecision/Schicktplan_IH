import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, X } from "lucide-react";
import {
  EINTRAG_STATUS,
  EINTRAG_TYP_LABELS,
  EintragStatus,
  EintragTyp,
  EASYFLOW_TAG_HINT,
  EASYFLOW_TAG_REGEX,
  PRIORITAETEN,
  PRIORITAET_LABELS,
  Prioritaet,
  SAP_AUFTRAG_HINT,
  SAP_AUFTRAG_REGEX,
  STATUS_LABELS,
  type SchichtbucheintragDetail,
} from "@schichtbuch/shared";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";
import { useCreateEintrag, useFormOptions, useUpdateEintrag } from "./queries";
import { uploadAnhang } from "./anhaenge-api";

/** Ermittelt die aktuell laufende Schicht anhand der Uhrzeit (mit Mitternachts-Überlauf). */
function aktuelleSchichtId(
  schichten: { id: string; startzeit: string; endzeit: string }[],
): string {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h = "0", m = "0"] = t.split(":");
    return Number(h) * 60 + Number(m);
  };
  for (const s of schichten) {
    const start = toMin(s.startzeit);
    const end = toMin(s.endzeit);
    const drin = start <= end ? cur >= start && cur < end : cur >= start || cur < end;
    if (drin) return s.id;
  }
  return "";
}

/** Gewerk des Nutzers: bei genau einem sichtbaren Gewerk dieses vorbelegen. */
function eigenesGewerkId(gewerke: { id: string; name: string }[], sichtbar: string[]): string {
  if (sichtbar.length === 1) return gewerke.find((g) => g.name === sichtbar[0])?.id ?? "";
  return "";
}

const formSchema = z
  .object({
    typ: z.nativeEnum(EintragTyp),
    datum: z.string().min(1, "Datum ist erforderlich"),
    uhrzeit: z.string().min(1, "Uhrzeit ist erforderlich"),
    schichtId: z.string().min(1, "Schicht ist erforderlich"),
    gewerkId: z.string().min(1, "Gewerk ist erforderlich"),
    fachbereichId: z.string().min(1, "Fachbereich ist erforderlich"),
    technischerPlatzId: z.string().min(1, "Technischer Platz ist erforderlich"),
    prioritaet: z.nativeEnum(Prioritaet),
    status: z.nativeEnum(EintragStatus),
    // Freitext bei Schichtinformation, strukturierte Felder bei Störung – die
    // Pflicht je Typ wird unten per superRefine erzwungen.
    beschreibung: z.string().optional(),
    stoerung: z.string().optional(),
    ursache: z.string().optional(),
    korrekturmassnahme: z.string().optional(),
    sapIhAuftrag: z
      .string()
      .optional()
      .refine((v) => !v || SAP_AUFTRAG_REGEX.test(v), SAP_AUFTRAG_HINT),
    easyFlowTag: z
      .string()
      .optional()
      .refine((v) => !v || EASYFLOW_TAG_REGEX.test(v), EASYFLOW_TAG_HINT),
    bearbeitungBeginn: z.string().optional(),
    bearbeitungEnde: z.string().optional(),
    schlagwortIds: z.array(z.string()),
  })
  .superRefine((val, ctx) => {
    // Bearbeitungsbeginn ist Pflicht (Datum wird vorbelegt, bleibt änderbar).
    if (!val.bearbeitungBeginn?.trim()) {
      ctx.addIssue({
        path: ["bearbeitungBeginn"],
        code: z.ZodIssueCode.custom,
        message: "Bearbeitungsbeginn ist erforderlich",
      });
    }
    // Bearbeitungsende ist Pflicht, sobald der Status „Erledigt" ist.
    if (val.status === EintragStatus.ERLEDIGT && !val.bearbeitungEnde?.trim()) {
      ctx.addIssue({
        path: ["bearbeitungEnde"],
        code: z.ZodIssueCode.custom,
        message: "Bei Status Erledigt ist das Bearbeitungsende erforderlich",
      });
    }
    // Ende darf nicht vor dem Beginn liegen.
    if (
      val.bearbeitungBeginn?.trim() &&
      val.bearbeitungEnde?.trim() &&
      new Date(val.bearbeitungEnde) < new Date(val.bearbeitungBeginn)
    ) {
      ctx.addIssue({
        path: ["bearbeitungEnde"],
        code: z.ZodIssueCode.custom,
        message: "Das Bearbeitungsende darf nicht vor dem Beginn liegen",
      });
    }
    // Ende (= Fertigstellungszeitpunkt) darf nicht in der Zukunft liegen.
    if (
      val.bearbeitungEnde?.trim() &&
      new Date(val.bearbeitungEnde).getTime() > Date.now() + 60_000
    ) {
      ctx.addIssue({
        path: ["bearbeitungEnde"],
        code: z.ZodIssueCode.custom,
        message: "Das Bearbeitungsende darf nicht in der Zukunft liegen",
      });
    }
    if (val.typ === EintragTyp.STOERUNG) {
      if (!val.stoerung?.trim()) {
        ctx.addIssue({
          path: ["stoerung"],
          code: z.ZodIssueCode.custom,
          message: "Störung ist erforderlich",
        });
      }
      if (!val.ursache?.trim()) {
        ctx.addIssue({
          path: ["ursache"],
          code: z.ZodIssueCode.custom,
          message: "Ursache ist erforderlich",
        });
      }
      if (!val.korrekturmassnahme?.trim()) {
        ctx.addIssue({
          path: ["korrekturmassnahme"],
          code: z.ZodIssueCode.custom,
          message: "Korrekturmaßnahme ist erforderlich",
        });
      }
    } else if (!val.beschreibung?.trim()) {
      ctx.addIssue({
        path: ["beschreibung"],
        code: z.ZodIssueCode.custom,
        message: "Beschreibung ist erforderlich",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface EintragFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eintrag?: SchichtbucheintragDetail;
  /** Typ des neuen Eintrags (nur beim Anlegen; beim Bearbeiten kommt er aus dem Eintrag). */
  typ?: EintragTyp;
}

function toDefaults(
  eintrag?: SchichtbucheintragDetail,
  neuerTyp: EintragTyp = EintragTyp.SCHICHTINFORMATION,
): FormValues {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!eintrag) {
    // Neuer Eintrag: Datum + Uhrzeit automatisch auf „jetzt" (Schicht/Gewerk
    // werden nach dem Laden der Optionen ergänzt).
    const now = new Date();
    const nowLocal = jetztLocalInput();
    return {
      typ: neuerTyp,
      datum: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      uhrzeit: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      schichtId: "",
      gewerkId: "",
      fachbereichId: "",
      technischerPlatzId: "",
      prioritaet: Prioritaet.NORMAL,
      status: EintragStatus.OFFEN,
      beschreibung: "",
      stoerung: "",
      ursache: "",
      korrekturmassnahme: "",
      sapIhAuftrag: "",
      easyFlowTag: "",
      // Bearbeitungsbeginn wird auf „jetzt" vorbelegt (Pflichtfeld, änderbar).
      bearbeitungBeginn: nowLocal,
      bearbeitungEnde: "",
      schlagwortIds: [],
    };
  }
  const dt = new Date(eintrag.zeitpunkt);
  return {
    typ: eintrag.typ,
    datum: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    uhrzeit: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    schichtId: eintrag.schicht.id,
    gewerkId: eintrag.gewerk.id,
    fachbereichId: eintrag.fachbereich.id,
    technischerPlatzId: eintrag.technischerPlatz.id,
    prioritaet: eintrag.prioritaet,
    status: eintrag.status,
    beschreibung: eintrag.typ === EintragTyp.STOERUNG ? "" : eintrag.beschreibung,
    stoerung: eintrag.stoerung ?? "",
    ursache: eintrag.ursache ?? "",
    korrekturmassnahme: eintrag.korrekturmassnahme ?? "",
    sapIhAuftrag: eintrag.sapIhAuftrag ?? "",
    easyFlowTag: eintrag.easyFlowTag ?? "",
    bearbeitungBeginn: toLocalInput(eintrag.bearbeitungBeginn),
    bearbeitungEnde: toLocalInput(eintrag.bearbeitungEnde),
    schlagwortIds: eintrag.schlagwoerter.map((s) => s.id),
  };
}

/** ISO → Wert für <input type="datetime-local"> (lokale Zeit, ohne Sekunden). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Aktueller Zeitpunkt als Wert für <input type="datetime-local">. */
function jetztLocalInput(): string {
  return toLocalInput(new Date().toISOString());
}

export function EintragFormDialog({
  open,
  onOpenChange,
  eintrag,
  typ = EintragTyp.SCHICHTINFORMATION,
}: EintragFormDialogProps) {
  const isEdit = !!eintrag;
  const effektiverTyp = eintrag?.typ ?? typ;
  const istStoerung = effektiverTyp === EintragTyp.STOERUNG;
  const { data: options } = useFormOptions();
  const { user } = useAuth();
  const createMutation = useCreateEintrag();
  const updateMutation = useUpdateEintrag();

  // Bilder/Dateien, die direkt beim Anlegen angehängt werden (nur im Neu-Modus).
  const [dateien, setDateien] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Merkt sich die Id eines bereits angelegten Eintrags, damit bei einem
  // fehlgeschlagenen Anhang-Upload ein erneuter Versuch nicht doppelt anlegt.
  const createdIdRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toDefaults(undefined, typ),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaults(eintrag, typ));
      setDateien([]);
      createdIdRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, eintrag, typ, reset]);

  const statusWert = useWatch({ control, name: "status" });

  // Beim Wechsel auf „Erledigt" das Bearbeitungsende (Pflichtfeld) automatisch
  // mit „jetzt" vorbelegen, falls noch leer – so lässt sich der Eintrag direkt
  // als erledigt speichern (Zeitpunkt bleibt änderbar).
  useEffect(() => {
    if (statusWert === EintragStatus.ERLEDIGT && !getValues("bearbeitungEnde")) {
      setValue("bearbeitungEnde", jetztLocalInput(), { shouldValidate: true });
    }
  }, [statusWert, getValues, setValue]);

  // Beim Neuanlegen Schicht (nach Uhrzeit) und Gewerk (nach Nutzer) vorbelegen,
  // sobald die Optionen geladen sind – ohne bereits getroffene Auswahl zu überschreiben.
  useEffect(() => {
    if (!open || isEdit || !options || !user) return;
    if (!getValues("schichtId")) {
      const sid = aktuelleSchichtId(options.schichten);
      if (sid) setValue("schichtId", sid);
    }
    if (!getValues("gewerkId")) {
      const gid = eigenesGewerkId(options.gewerke, user.gewerkeSichtbarkeit);
      if (gid) setValue("gewerkId", gid);
    }
  }, [open, isEdit, options, user, getValues, setValue]);

  // Gewerk-Auswahl auf die für den Nutzer sichtbaren Gewerke beschränken.
  const gewerkOptions = useMemo(() => {
    const alle = options?.gewerke ?? [];
    if (user && user.gewerkeSichtbarkeit.length > 0) {
      return alle.filter((g) => user.gewerkeSichtbarkeit.includes(g.name));
    }
    return alle;
  }, [options, user]);

  // Technische Plätze strikt auf den gewählten Fachbereich einschränken – nur
  // die zugeordneten Plätze werden angezeigt (kein „Müll" ohne Zuordnung). Nur
  // wenn dem Fachbereich (noch) kein Platz zugeordnet ist, wird auf „alle"
  // zurückgefallen, damit die Auswahl nicht leer bleibt.
  const fachbereichId = useWatch({ control, name: "fachbereichId" });
  const technischePlaetzeGefiltert = useMemo(() => {
    const alle = options?.technischePlaetze ?? [];
    if (!fachbereichId) return alle;
    const passend = alle.filter((t) => t.fachbereichId === fachbereichId);
    return passend.length > 0 ? passend : alle;
  }, [options, fachbereichId]);

  // Gewählten Platz zurücksetzen, wenn er nicht mehr zum Fachbereich passt.
  useEffect(() => {
    const cur = getValues("technischerPlatzId");
    if (cur && !technischePlaetzeGefiltert.some((t) => t.id === cur)) {
      setValue("technischerPlatzId", "");
    }
  }, [technischePlaetzeGefiltert, getValues, setValue]);

  async function onSubmit(values: FormValues) {
    const zeitpunkt = new Date(`${values.datum}T${values.uhrzeit}:00`).toISOString();
    const istStoer = values.typ === EintragTyp.STOERUNG;
    const payload = {
      typ: values.typ,
      zeitpunkt,
      schichtId: values.schichtId,
      gewerkId: values.gewerkId,
      fachbereichId: values.fachbereichId,
      technischerPlatzId: values.technischerPlatzId,
      prioritaet: values.prioritaet,
      status: values.status,
      // Nur die zum Typ passenden Textfelder senden.
      beschreibung: istStoer ? undefined : values.beschreibung,
      stoerung: istStoer ? values.stoerung : null,
      ursache: istStoer ? values.ursache : null,
      korrekturmassnahme: istStoer ? values.korrekturmassnahme : null,
      sapIhAuftrag: values.sapIhAuftrag || null,
      easyFlowTag: values.easyFlowTag || null,
      bearbeitungBeginn: values.bearbeitungBeginn
        ? new Date(values.bearbeitungBeginn).toISOString()
        : null,
      bearbeitungEnde: values.bearbeitungEnde
        ? new Date(values.bearbeitungEnde).toISOString()
        : null,
      schlagwortIds: values.schlagwortIds,
    };

    try {
      if (isEdit && eintrag) {
        await updateMutation.mutateAsync({ id: eintrag.id, payload });
      } else {
        // Eintrag nur einmal anlegen; bei einem erneuten Versuch (z.B. nach
        // fehlgeschlagenem Upload) die bereits erzeugte Id wiederverwenden.
        let neueId = createdIdRef.current;
        if (!neueId) {
          const erstellt = await createMutation.mutateAsync(payload);
          neueId = erstellt.id;
          createdIdRef.current = neueId;
        }
        // Angehängte Bilder/Dateien direkt hochladen.
        for (const datei of dateien) {
          await uploadAnhang(neueId, datei);
        }
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? "Speichern fehlgeschlagen.";
      setError("root", { message: Array.isArray(message) ? message.join(" ") : message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `${EINTRAG_TYP_LABELS[effektiverTyp]} bearbeiten`
              : `Neue ${EINTRAG_TYP_LABELS[effektiverTyp]}`}
          </DialogTitle>
        </DialogHeader>

        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <Field label="Datum" error={errors.datum?.message}>
              <Input type="date" {...register("datum")} />
            </Field>
            <Field label="Uhrzeit" error={errors.uhrzeit?.message}>
              <Input type="time" {...register("uhrzeit")} />
            </Field>
            <SelectField
              control={control}
              name="schichtId"
              label="Schicht"
              options={options?.schichten ?? []}
              error={errors.schichtId?.message}
            />
            <SelectField
              control={control}
              name="gewerkId"
              label="Gewerk"
              options={gewerkOptions}
              error={errors.gewerkId?.message}
            />
            <SelectField
              control={control}
              name="fachbereichId"
              label="Fachbereich"
              options={options?.fachbereiche ?? []}
              error={errors.fachbereichId?.message}
            />
            <SelectField
              control={control}
              name="technischerPlatzId"
              label="Technischer Platz"
              options={technischePlaetzeGefiltert}
              error={errors.technischerPlatzId?.message}
            />
            <EnumSelectField
              control={control}
              name="prioritaet"
              label="Priorität"
              values={PRIORITAETEN}
              labels={PRIORITAET_LABELS}
            />
            <EnumSelectField
              control={control}
              name="status"
              label="Status"
              values={EINTRAG_STATUS}
              labels={STATUS_LABELS}
            />
          </div>

          {istStoerung ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Störung" error={errors.stoerung?.message}>
                <Textarea rows={4} {...register("stoerung")} />
              </Field>
              <Field label="Ursache" error={errors.ursache?.message}>
                <Textarea rows={4} {...register("ursache")} />
              </Field>
              <Field label="Korrekturmaßnahme" error={errors.korrekturmassnahme?.message}>
                <Textarea rows={4} {...register("korrekturmassnahme")} />
              </Field>
            </div>
          ) : (
            <Field label="Beschreibung" error={errors.beschreibung?.message}>
              <Textarea rows={3} {...register("beschreibung")} />
            </Field>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Field label="SAP-IH-Auftrag (optional)" error={errors.sapIhAuftrag?.message}>
              <Input inputMode="numeric" placeholder="700123456" {...register("sapIhAuftrag")} />
            </Field>
            <Field label="EasyFlow-TAG (optional)" error={errors.easyFlowTag?.message}>
              <Input inputMode="numeric" placeholder="123456" {...register("easyFlowTag")} />
            </Field>
            <Field label="Bearbeitungsbeginn" error={errors.bearbeitungBeginn?.message}>
              <Input type="datetime-local" {...register("bearbeitungBeginn")} />
            </Field>
            <Field
              label={
                statusWert === EintragStatus.ERLEDIGT
                  ? "Bearbeitungsende (Pflicht)"
                  : "Bearbeitungsende (optional)"
              }
              error={errors.bearbeitungEnde?.message}
            >
              <Input type="datetime-local" {...register("bearbeitungEnde")} />
            </Field>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Bilder / Anhänge (optional)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const gewaehlt = Array.from(e.target.files ?? []);
                    if (gewaehlt.length) setDateien((prev) => [...prev, ...gewaehlt]);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  Bild anhängen
                </Button>
                {dateien.map((datei, index) => (
                  <span
                    key={`${datei.name}-${index}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
                  >
                    <span className="max-w-[10rem] truncate">{datei.name}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Anhang entfernen"
                      onClick={() => setDateien((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Schlagwörter (optional)</Label>
            <Controller
              control={control}
              name="schlagwortIds"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {(options?.schlagwoerter ?? []).map((sw) => {
                    const selected = field.value.includes(sw.id);
                    return (
                      <button
                        type="button"
                        key={sw.id}
                        onClick={() =>
                          field.onChange(
                            selected
                              ? field.value.filter((id) => id !== sw.id)
                              : [...field.value, sw.id],
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input hover:bg-accent",
                        )}
                      >
                        {sw.name}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Speichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  control: import("react-hook-form").Control<FormValues>;
  name: "schichtId" | "gewerkId" | "fachbereichId" | "technischerPlatzId";
  label: string;
  /** Optionaler `code` wird – falls vorhanden – der Bezeichnung vorangestellt
   *  und ist so ebenfalls durchsuchbar (z.B. Technischer Platz "7161 · 7161 TDM"). */
  options: { id: string; name: string; code?: string }[];
  error?: string;
  allowEmpty?: boolean;
}

function SelectField({ control, name, label, options, error, allowEmpty }: SelectFieldProps) {
  return (
    <Field label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Combobox
            value={field.value ?? ""}
            onChange={field.onChange}
            options={options.map((o) => ({
              value: o.id,
              label: o.code ? `${o.code} · ${o.name}` : o.name,
            }))}
            emptyOption={allowEmpty ? "— keiner —" : undefined}
          />
        )}
      />
    </Field>
  );
}

interface EnumSelectFieldProps<T extends string> {
  control: import("react-hook-form").Control<FormValues>;
  name: "prioritaet" | "status";
  label: string;
  values: readonly T[];
  labels: Record<T, string>;
}

function EnumSelectField<T extends string>({
  control,
  name,
  label,
  values,
  labels,
}: EnumSelectFieldProps<T>) {
  return (
    <Field label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {values.map((value) => (
                <SelectItem key={value} value={value}>
                  {labels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  EINTRAG_STATUS,
  EintragStatus,
  EASYFLOW_TAG_REGEX,
  PRIORITAETEN,
  PRIORITAET_LABELS,
  Prioritaet,
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
import { useCreateEintrag, useFormOptions, useUpdateEintrag } from "./queries";

const optionalRef = z
  .string()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const formSchema = z.object({
  datum: z.string().min(1, "Datum ist erforderlich"),
  uhrzeit: z.string().min(1, "Uhrzeit ist erforderlich"),
  schichtId: z.string().min(1, "Schicht ist erforderlich"),
  gewerkId: z.string().min(1, "Gewerk ist erforderlich"),
  fachbereichId: z.string().min(1, "Fachbereich ist erforderlich"),
  technischerPlatzId: z.string().min(1, "Technischer Platz ist erforderlich"),
  prioritaet: z.nativeEnum(Prioritaet),
  status: z.nativeEnum(EintragStatus),
  beschreibung: z.string().min(1, "Beschreibung ist erforderlich"),
  sapIhAuftrag: z
    .string()
    .optional()
    .refine(
      (v) => !v || SAP_AUFTRAG_REGEX.test(v),
      "SAP-IH-Auftrag: 6–12 Ziffern (z.B. 700123456).",
    ),
  easyFlowTag: z
    .string()
    .optional()
    .refine((v) => !v || EASYFLOW_TAG_REGEX.test(v), "EasyFlow-TAG-Format, z.B. PW4-M-1023."),
  verantwortlicherId: optionalRef,
  faelligkeitsdatum: z.string().optional(),
  bearbeitungBeginn: z.string().optional(),
  bearbeitungEnde: z.string().optional(),
  schlagwortIds: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface EintragFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eintrag?: SchichtbucheintragDetail;
}

function toDefaults(eintrag?: SchichtbucheintragDetail): FormValues {
  if (!eintrag) {
    return {
      datum: "",
      uhrzeit: "",
      schichtId: "",
      gewerkId: "",
      fachbereichId: "",
      technischerPlatzId: "",
      prioritaet: Prioritaet.NORMAL,
      status: EintragStatus.OFFEN,
      beschreibung: "",
      sapIhAuftrag: "",
      easyFlowTag: "",
      verantwortlicherId: "",
      faelligkeitsdatum: "",
      bearbeitungBeginn: "",
      bearbeitungEnde: "",
      schlagwortIds: [],
    };
  }
  const dt = new Date(eintrag.zeitpunkt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    datum: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    uhrzeit: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    schichtId: eintrag.schicht.id,
    gewerkId: eintrag.gewerk.id,
    fachbereichId: eintrag.fachbereich.id,
    technischerPlatzId: eintrag.technischerPlatz.id,
    prioritaet: eintrag.prioritaet,
    status: eintrag.status,
    beschreibung: eintrag.beschreibung,
    sapIhAuftrag: eintrag.sapIhAuftrag ?? "",
    easyFlowTag: eintrag.easyFlowTag ?? "",
    verantwortlicherId: eintrag.verantwortlicher?.id ?? "",
    faelligkeitsdatum: eintrag.faelligkeitsdatum ? eintrag.faelligkeitsdatum.slice(0, 10) : "",
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

export function EintragFormDialog({ open, onOpenChange, eintrag }: EintragFormDialogProps) {
  const isEdit = !!eintrag;
  const { data: options } = useFormOptions();
  const createMutation = useCreateEintrag();
  const updateMutation = useUpdateEintrag();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toDefaults() });

  useEffect(() => {
    if (open) reset(toDefaults(eintrag));
  }, [open, eintrag, reset]);

  async function onSubmit(values: FormValues) {
    const zeitpunkt = new Date(`${values.datum}T${values.uhrzeit}:00`).toISOString();
    const payload = {
      zeitpunkt,
      schichtId: values.schichtId,
      gewerkId: values.gewerkId,
      fachbereichId: values.fachbereichId,
      technischerPlatzId: values.technischerPlatzId,
      prioritaet: values.prioritaet,
      status: values.status,
      beschreibung: values.beschreibung,
      sapIhAuftrag: values.sapIhAuftrag || null,
      easyFlowTag: values.easyFlowTag || null,
      verantwortlicherId: values.verantwortlicherId || null,
      faelligkeitsdatum: values.faelligkeitsdatum
        ? new Date(`${values.faelligkeitsdatum}T00:00:00`).toISOString()
        : null,
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
        await createMutation.mutateAsync(payload);
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Eintrag bearbeiten" : "Neuer Schichtbucheintrag"}</DialogTitle>
        </DialogHeader>

        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Datum" error={errors.datum?.message}>
              <Input type="date" {...register("datum")} />
            </Field>
            <Field label="Uhrzeit" error={errors.uhrzeit?.message}>
              <Input type="time" {...register("uhrzeit")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              options={options?.gewerke ?? []}
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
              options={options?.technischePlaetze ?? []}
              error={errors.technischerPlatzId?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <Field label="Beschreibung" error={errors.beschreibung?.message}>
            <Textarea {...register("beschreibung")} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="SAP-IH-Auftrag (optional)" error={errors.sapIhAuftrag?.message}>
              <Input placeholder="700123456" {...register("sapIhAuftrag")} />
            </Field>
            <Field label="EasyFlow-TAG (optional)" error={errors.easyFlowTag?.message}>
              <Input placeholder="PW4-M-1023" {...register("easyFlowTag")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              control={control}
              name="verantwortlicherId"
              label="Verantwortlicher (optional)"
              options={options?.benutzer ?? []}
              error={undefined}
              allowEmpty
            />
            <Field label="Fälligkeit (optional)" error={undefined}>
              <Input type="date" {...register("faelligkeitsdatum")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Bearbeitungsbeginn (optional)" error={errors.bearbeitungBeginn?.message}>
              <Input type="datetime-local" {...register("bearbeitungBeginn")} />
            </Field>
            <Field label="Bearbeitungsende (optional)" error={errors.bearbeitungEnde?.message}>
              <Input type="datetime-local" {...register("bearbeitungEnde")} />
            </Field>
          </div>

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
  name: "schichtId" | "gewerkId" | "fachbereichId" | "technischerPlatzId" | "verantwortlicherId";
  label: string;
  options: { id: string; name: string }[];
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
            options={options.map((o) => ({ value: o.id, label: o.name }))}
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

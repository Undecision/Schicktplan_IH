import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api-client";
import type { StammdatenField, StammdatenResource } from "./config";
import { useCreateStammdatum, useUpdateStammdatum, type StammdatumRow } from "./queries";

function ReferenceField({
  field,
  value,
  onChange,
}: {
  field: StammdatenField;
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: options = [] } = useQuery({
    queryKey: ["stammdaten-ref", field.refEndpoint],
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{ id: string } & Record<string, string>>>(
        `/${field.refEndpoint}`,
      );
      const labelKey = field.refLabelField ?? "name";
      return data.map((item) => ({ value: item.id, label: item[labelKey] ?? "" }));
    },
    enabled: !!field.refEndpoint,
  });
  return <Combobox value={value} onChange={onChange} options={options} emptyOption="— keiner —" />;
}

interface FormDialogProps {
  resource: StammdatenResource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: StammdatumRow;
}

type FieldErrors = Record<string, string>;

function initialValues(resource: StammdatenResource, row?: StammdatumRow) {
  const values: Record<string, string | boolean> = {};
  for (const field of resource.fields) {
    if (field.type === "boolean") {
      values[field.key] = row ? Boolean(row[field.key]) : false;
    } else {
      values[field.key] = row ? String(row[field.key] ?? "") : "";
    }
  }
  return values;
}

export function StammdatumFormDialog({ resource, open, onOpenChange, row }: FormDialogProps) {
  const isEdit = !!row;
  const createMutation = useCreateStammdatum(resource.endpoint);
  const updateMutation = useUpdateStammdatum(resource.endpoint);

  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    initialValues(resource, row),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues(resource, row));
      setErrors({});
      setServerError(null);
    }
  }, [open, resource, row]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    for (const field of resource.fields) {
      if (field.type === "boolean" || field.type === "reference") continue;
      const value = String(values[field.key] ?? "").trim();
      if (!value) {
        nextErrors[field.key] = `${field.label} ist erforderlich`;
      } else if (field.pattern && !field.pattern.test(value)) {
        nextErrors[field.key] = field.patternMessage ?? "Ungültiges Format";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;

    const payload: Record<string, unknown> = {};
    for (const field of resource.fields) {
      if (field.type === "boolean") {
        payload[field.key] = Boolean(values[field.key]);
      } else if (field.type === "reference") {
        payload[field.key] = String(values[field.key] ?? "").trim() || null;
      } else {
        payload[field.key] = String(values[field.key]).trim();
      }
    }

    try {
      if (isEdit && row) {
        await updateMutation.mutateAsync({ id: row.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Speichern fehlgeschlagen.";
      setServerError(message);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `${resource.labelSingular} bearbeiten`
              : `Neuer Eintrag: ${resource.labelSingular}`}
          </DialogTitle>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {resource.fields.map((field) => {
            if (field.type === "boolean") {
              return (
                <div key={field.key} className="flex items-center justify-between">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Switch
                    id={field.key}
                    checked={Boolean(values[field.key])}
                    onCheckedChange={(checked) =>
                      setValues((prev) => ({ ...prev, [field.key]: checked }))
                    }
                  />
                </div>
              );
            }
            if (field.type === "reference") {
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <ReferenceField
                    field={field}
                    value={String(values[field.key] ?? "")}
                    onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                  />
                </div>
              );
            }
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type === "time" ? "time" : "text"}
                  value={String(values[field.key] ?? "")}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  aria-invalid={!!errors[field.key]}
                />
                {errors[field.key] && (
                  <p className="text-sm text-destructive">{errors[field.key]}</p>
                )}
              </div>
            );
          })}

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

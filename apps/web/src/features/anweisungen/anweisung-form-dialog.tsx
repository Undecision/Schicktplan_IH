import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Paperclip, Upload, X } from "lucide-react";
import {
  ANWEISUNG_ANHANG_ACCEPT_ATTRIBUTE,
  ANWEISUNG_ANHANG_MAX_GROESSE_BYTES,
  ANWEISUNG_ANHANG_MIME_TYPES,
} from "@schichtbuch/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/auth-context";
import { useFormOptions } from "@/features/eintraege/queries";
import { useCreateAnweisung } from "./queries";

const MAX_MB = Math.floor(ANWEISUNG_ANHANG_MAX_GROESSE_BYTES / (1024 * 1024));

const formSchema = z.object({
  titel: z.string().min(1, "Titel ist erforderlich"),
  gewerkId: z.string().min(1, "Gewerk ist erforderlich"),
  schichtId: z.string(),
  text: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function AnweisungFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: options } = useFormOptions();
  const { user } = useAuth();
  const createMutation = useCreateAnweisung();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { titel: "", gewerkId: "", schichtId: "", text: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ titel: "", gewerkId: "", schichtId: "", text: "" });
      setFile(null);
    }
  }, [open, reset]);

  // Nur die für den Nutzer sichtbaren Gewerke zur Auswahl anbieten.
  const gewerkOptions = useMemo(() => {
    const alle = options?.gewerke ?? [];
    if (user && user.gewerkeSichtbarkeit.length > 0) {
      return alle.filter((g) => user.gewerkeSichtbarkeit.includes(g.name));
    }
    return alle;
  }, [options, user]);

  function waehleDatei(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    if (!ANWEISUNG_ANHANG_MIME_TYPES.includes(f.type as never)) {
      setError("root", { message: `Dateityp nicht erlaubt (nur Foto/PDF): ${f.name}` });
      return;
    }
    if (f.size > ANWEISUNG_ANHANG_MAX_GROESSE_BYTES) {
      setError("root", { message: `Datei zu groß (max. ${MAX_MB} MB).` });
      return;
    }
    setError("root", { message: "" });
    setFile(f);
  }

  async function onSubmit(values: FormValues) {
    if (!values.text.trim() && !file) {
      setError("root", { message: "Bitte einen Text eingeben oder einen Anhang hochladen." });
      return;
    }
    try {
      await createMutation.mutateAsync({
        payload: {
          titel: values.titel,
          text: values.text.trim() || null,
          gewerkId: values.gewerkId,
          schichtId: values.schichtId || null,
        },
        file,
      });
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
          <DialogTitle>Neue Arbeitsanweisung</DialogTitle>
        </DialogHeader>

        {errors.root?.message && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Titel</Label>
            <Input {...register("titel")} placeholder="z.B. Hinweis für die Spätschicht" />
            {errors.titel && <p className="text-sm text-destructive">{errors.titel.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Gewerk</Label>
              <Controller
                control={control}
                name="gewerkId"
                render={({ field }) => (
                  <Combobox
                    value={field.value}
                    onChange={field.onChange}
                    options={gewerkOptions.map((g) => ({ value: g.id, label: g.name }))}
                  />
                )}
              />
              {errors.gewerkId && (
                <p className="text-sm text-destructive">{errors.gewerkId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Schicht (optional)</Label>
              <Controller
                control={control}
                name="schichtId"
                render={({ field }) => (
                  <Combobox
                    value={field.value}
                    onChange={field.onChange}
                    options={(options?.schichten ?? []).map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    emptyOption="— alle Schichten —"
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Text (optional, wenn ein Anhang hochgeladen wird)</Label>
            <Textarea {...register("text")} rows={4} />
          </div>

          <div className="space-y-1.5">
            <Label>Anhang (Foto/PDF, optional)</Label>
            {file ? (
              <div className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  {file.name}
                </span>
                <Button type="button" variant="ghost" size="icon" onClick={() => waehleDatei(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-4 text-sm text-muted-foreground hover:bg-accent/50"
              >
                <Upload className="h-4 w-4" />
                Foto oder PDF auswählen (max. {MAX_MB} MB)
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ANWEISUNG_ANHANG_ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(e) => waehleDatei(e.target.files?.[0] ?? null)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Speichert…" : "Anweisung bereitstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

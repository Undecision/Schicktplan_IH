import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Rolle, ROLLEN, PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT } from "@schichtbuch/shared";
import type { GewerkRef, UserSummary } from "@schichtbuch/shared";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateUser, useGewerke, useUpdateUser } from "./queries";

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT)
  .regex(/[a-z]/, PASSWORD_POLICY_HINT)
  .regex(/[A-Z]/, PASSWORD_POLICY_HINT)
  .regex(/[\d\W]/, PASSWORD_POLICY_HINT);

const formSchema = z.object({
  email: z.string().min(1, "E-Mail ist erforderlich").email("Ungültige E-Mail-Adresse"),
  name: z.string().min(1, "Name ist erforderlich"),
  password: z.union([passwordSchema, z.literal("")]).optional(),
  rollen: z.array(z.nativeEnum(Rolle)).min(1, "Mindestens eine Rolle auswählen"),
  gewerkeIds: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserSummary;
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const { data: gewerke = [] } = useGewerke();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", name: "", password: "", rollen: [], gewerkeIds: [] },
  });

  useEffect(() => {
    if (open) {
      reset({
        email: user?.email ?? "",
        name: user?.name ?? "",
        password: "",
        rollen: user?.rollen ?? [],
        gewerkeIds: user?.gewerke.map((g) => g.id) ?? [],
      });
    }
  }, [open, user, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({
          id: user.id,
          payload: { name: values.name, rollen: values.rollen, gewerkeIds: values.gewerkeIds },
        });
      } else {
        if (!values.password) {
          setError("password", { message: "Passwort ist erforderlich" });
          return;
        }
        await createUser.mutateAsync({
          email: values.email,
          name: values.name,
          password: values.password,
          rollen: values.rollen,
          gewerkeIds: values.gewerkeIds,
        });
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Speichern fehlgeschlagen.";
      setError("root", { message });
    }
  }

  const rootError = errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Benutzer bearbeiten" : "Neuer Benutzer"}</DialogTitle>
        </DialogHeader>

        {rootError && (
          <Alert variant="destructive">
            <AlertDescription>{rootError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" disabled={isEdit} {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" type="password" {...register("password")} />
              <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Rollen</Label>
            <Controller
              control={control}
              name="rollen"
              render={({ field }) => (
                <div className="space-y-2">
                  {ROLLEN.map((rolle) => (
                    <label key={rolle} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={field.value.includes(rolle)}
                        onChange={(event) => {
                          field.onChange(
                            event.target.checked
                              ? [...field.value, rolle]
                              : field.value.filter((r) => r !== rolle),
                          );
                        }}
                      />
                      {rolle}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.rollen && <p className="text-sm text-destructive">{errors.rollen.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Gewerk-Sichtbarkeit</Label>
            <Controller
              control={control}
              name="gewerkeIds"
              render={({ field }) => (
                <div className="space-y-2">
                  {gewerke.map((gewerk: GewerkRef) => (
                    <label key={gewerk.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={field.value.includes(gewerk.id)}
                        onChange={(event) => {
                          field.onChange(
                            event.target.checked
                              ? [...field.value, gewerk.id]
                              : field.value.filter((id) => id !== gewerk.id),
                          );
                        }}
                      />
                      {gewerk.name}
                    </label>
                  ))}
                  {gewerke.length === 0 && (
                    <p className="text-sm text-muted-foreground">Keine Gewerke vorhanden.</p>
                  )}
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

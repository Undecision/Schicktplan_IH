import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "./auth-context";
import { changePassword, updateProfile } from "./api";

function fehlerText(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message ?? "Aktion fehlgeschlagen.";
}

const profilSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben"),
});
type ProfilValues = z.infer<typeof profilSchema>;

const passwortSchema = z
  .object({
    currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
    newPassword: z.string().min(12, "Mindestens 12 Zeichen"),
    confirmPassword: z.string().min(1, "Bitte Passwort bestätigen"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Die Passwörter stimmen nicht überein",
  });
type PasswortValues = z.infer<typeof passwortSchema>;

export function ProfilePage() {
  const { user, setCurrentUser } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <StammdatenCard onUpdated={setCurrentUser} initial={{ name: user.name, email: user.email }} />
      <PasswortCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zugewiesene Rollen &amp; Gewerke</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Rollen:</span>{" "}
            {user.rollen.join(", ") || "—"}
          </p>
          <p>
            <span className="font-medium text-foreground">Gewerke:</span>{" "}
            {user.gewerkeSichtbarkeit.length > 0 ? user.gewerkeSichtbarkeit.join(", ") : "Alle"}
          </p>
          <p className="text-xs">Rollen und Gewerke werden von der Administration verwaltet.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StammdatenCard({
  initial,
  onUpdated,
}: {
  initial: ProfilValues;
  onUpdated: (user: import("@schichtbuch/shared").AuthenticatedUser) => void;
}) {
  const [erfolg, setErfolg] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfilValues>({ resolver: zodResolver(profilSchema), defaultValues: initial });

  async function onSubmit(values: ProfilValues) {
    setErfolg(false);
    try {
      const updated = await updateProfile(values);
      onUpdated(updated);
      setErfolg(true);
    } catch (error) {
      setError("root", { message: fehlerText(error) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stammdaten</CardTitle>
      </CardHeader>
      <CardContent>
        {errors.root && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        {erfolg && (
          <Alert className="mb-4">
            <AlertDescription>Ihre Daten wurden gespeichert.</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>E-Mail</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Speichert…" : "Speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswortCard() {
  const [erfolg, setErfolg] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswortValues>({ resolver: zodResolver(passwortSchema) });

  async function onSubmit(values: PasswortValues) {
    setErfolg(false);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setErfolg(true);
    } catch (error) {
      setError("root", { message: fehlerText(error) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Passwort ändern</CardTitle>
      </CardHeader>
      <CardContent>
        {errors.root && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        {erfolg && (
          <Alert className="mb-4">
            <AlertDescription>Ihr Passwort wurde geändert.</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Aktuelles Passwort</Label>
            <Input
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Neues Passwort</Label>
            <Input type="password" autoComplete="new-password" {...register("newPassword")} />
            {errors.newPassword ? (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Mindestens 12 Zeichen, Groß-/Kleinbuchstaben, Ziffer/Sonderzeichen.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Neues Passwort bestätigen</Label>
            <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Ändert…" : "Passwort ändern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

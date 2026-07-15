import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT } from "@schichtbuch/shared";
import type { UserSummary } from "@schichtbuch/shared";
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
import { useResetPassword } from "./queries";

const formSchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT)
    .regex(/[a-z]/, PASSWORD_POLICY_HINT)
    .regex(/[A-Z]/, PASSWORD_POLICY_HINT)
    .regex(/[\d\W]/, PASSWORD_POLICY_HINT),
});

type FormValues = z.infer<typeof formSchema>;

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSummary | undefined;
}

export function ResetPasswordDialog({ open, onOpenChange, user }: ResetPasswordDialogProps) {
  const resetPassword = useResetPassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { password: "" } });

  async function onSubmit(values: FormValues) {
    if (!user) return;
    try {
      await resetPassword.mutateAsync({ id: user.id, payload: { password: values.password } });
      reset();
      onOpenChange(false);
    } catch {
      setError("root", { message: "Passwort-Reset fehlgeschlagen." });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Passwort zurücksetzen{user ? ` – ${user.name}` : ""}</DialogTitle>
        </DialogHeader>

        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Neues Passwort</Label>
            <Input id="new-password" type="password" {...register("password")} />
            <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Setzt zurück…" : "Zurücksetzen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

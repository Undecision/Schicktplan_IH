import { useEffect, useMemo, useState } from "react";
import { Lock, Plus, Save, Trash2, Users } from "lucide-react";
import {
  PERMISSION_GRUPPEN,
  PERMISSION_LABELS,
  type PermissionKey,
  type RoleSummary,
} from "@schichtbuch/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from "./roles-queries";

function fehlerText(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message ?? "Aktion fehlgeschlagen.";
}

export function RolesManager() {
  const { data: roles = [], isLoading } = useRoles();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Berechtigungen je Rolle einsehen und anpassen. Systemrollen können nicht umbenannt oder
          gelöscht werden; die Rolle „Administrator" behält immer alle Rechte.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Neue Rolle
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Lädt…</p>}

      <div className="space-y-4">
        {roles.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>

      <RoleFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function RoleCard({ role }: { role: RoleSummary }) {
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const istAdmin = role.istSystemrolle && role.name === "Administrator";
  const [selected, setSelected] = useState<Set<PermissionKey>>(new Set(role.permissions));
  const [description, setDescription] = useState(role.description ?? "");
  const [error, setError] = useState<string | null>(null);

  // Bei aktualisierten Server-Daten den lokalen Zustand angleichen.
  useEffect(() => {
    setSelected(new Set(role.permissions));
    setDescription(role.description ?? "");
  }, [role.permissions, role.description]);

  const dirty = useMemo(() => {
    const original = new Set(role.permissions);
    const gleich = original.size === selected.size && [...selected].every((p) => original.has(p));
    return !gleich || description !== (role.description ?? "");
  }, [selected, description, role.permissions, role.description]);

  function toggle(key: PermissionKey) {
    if (istAdmin) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    setError(null);
    try {
      await updateRole.mutateAsync({
        id: role.id,
        payload: { description: description.trim() || null, permissions: [...selected] },
      });
    } catch (e) {
      setError(fehlerText(e));
    }
  }

  async function entfernen() {
    setError(null);
    try {
      await deleteRole.mutateAsync(role.id);
    } catch (e) {
      setError(fehlerText(e));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            {role.name}
            {role.istSystemrolle && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                System
              </Badge>
            )}
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Users className="h-3 w-3" />
              {role.anzahlBenutzer}
            </span>
          </CardTitle>
        </div>
        {!role.istSystemrolle && (
          <Button
            variant="ghost"
            size="icon"
            title={role.anzahlBenutzer > 0 ? "Noch zugewiesen" : "Rolle löschen"}
            disabled={role.anzahlBenutzer > 0 || deleteRole.isPending}
            onClick={entfernen}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label>Beschreibung</Label>
          <Input
            value={description}
            placeholder="Kurzbeschreibung der Rolle (optional)"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {istAdmin && (
          <p className="text-xs text-muted-foreground">
            Der Administrator besitzt immer alle Berechtigungen und ist nicht veränderbar.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {PERMISSION_GRUPPEN.map((gruppe) => (
            <div key={gruppe.titel} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {gruppe.titel}
              </p>
              <div className="space-y-1.5">
                {gruppe.permissions.map((key) => (
                  <label
                    key={key}
                    className={
                      "flex items-start gap-2 text-sm " +
                      (istAdmin ? "cursor-not-allowed opacity-70" : "cursor-pointer")
                    }
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={istAdmin ? true : selected.has(key)}
                      disabled={istAdmin}
                      onChange={() => toggle(key)}
                    />
                    <span>{PERMISSION_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!istAdmin && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={!dirty || updateRole.isPending}>
              <Save className="h-4 w-4" />
              {updateRole.isPending ? "Speichert…" : "Speichern"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoleFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createRole = useCreateRole();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<PermissionKey>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setSelected(new Set());
      setError(null);
    }
  }, [open]);

  function toggle(key: PermissionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Bitte einen Rollennamen angeben.");
      return;
    }
    try {
      await createRole.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        permissions: [...selected],
      });
      onOpenChange(false);
    } catch (e) {
      setError(fehlerText(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Rolle</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {PERMISSION_GRUPPEN.map((gruppe) => (
              <div key={gruppe.titel} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {gruppe.titel}
                </p>
                <div className="space-y-1.5">
                  {gruppe.permissions.map((key) => (
                    <label key={key} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4"
                        checked={selected.has(key)}
                        onChange={() => toggle(key)}
                      />
                      <span>{PERMISSION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={createRole.isPending}>
            {createRole.isPending ? "Legt an…" : "Rolle anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

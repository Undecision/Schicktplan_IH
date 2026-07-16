import { useState } from "react";
import { MoreVertical, Plus } from "lucide-react";
import type { UserSummary } from "@schichtbuch/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnonymisierenPerson, useDeactivateUser, useUsers } from "./queries";
import { exportPersonData } from "./api";
import { UserFormDialog } from "./user-form-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

export function UsersPage() {
  const { data: users = [], isLoading, isError } = useUsers();
  const deactivateUser = useDeactivateUser();
  const anonymisieren = useAnonymisierenPerson();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | undefined>(undefined);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserSummary | undefined>(undefined);

  function openCreate() {
    setEditingUser(undefined);
    setFormOpen(true);
  }

  function openEdit(user: UserSummary) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function openResetPassword(user: UserSummary) {
    setResetPasswordUser(user);
    setResetPasswordOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Benutzerverwaltung</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Neuer Benutzer
        </Button>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Benutzer konnten nicht geladen werden.</p>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Rollen</TableHead>
              <TableHead>Gewerke</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Lädt…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Keine Benutzer vorhanden.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.rollen.map((rolle) => (
                      <Badge key={rolle} variant="secondary">
                        {rolle}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.gewerke.map((gewerk) => (
                      <Badge key={gewerk.id} variant="outline">
                        {gewerk.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === "AKTIV" ? "success" : "secondary"}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Aktionen">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEdit(user)}>
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openResetPassword(user)}>
                        Passwort zurücksetzen
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={user.status === "DEAKTIVIERT"}
                        onSelect={() => deactivateUser.mutate(user.id)}
                      >
                        Deaktivieren
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void exportPersonData(user.id, user.name)}>
                        DSGVO-Auskunft (Export)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => {
                          if (
                            window.confirm(
                              `Person „${user.name}" anonymisieren? Name/E-Mail werden unwiderruflich pseudonymisiert; Einträge bleiben erhalten.`,
                            )
                          ) {
                            anonymisieren.mutate(user.id);
                          }
                        }}
                      >
                        Anonymisieren (DSGVO)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />
      <ResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        user={resetPasswordUser}
      />
    </div>
  );
}

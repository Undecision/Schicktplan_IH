import { useState } from "react";
import { MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import type { StammdatenResource } from "./config";
import { useStammdaten, useUpdateStammdatum, type StammdatumRow } from "./queries";
import { StammdatumFormDialog } from "./stammdatum-form-dialog";

function renderValue(row: StammdatumRow, key: string, type: string) {
  const value = row[key];
  if (type === "boolean") {
    return value ? "Ja" : "Nein";
  }
  return String(value ?? "");
}

export function StammdatenManager({ resource }: { resource: StammdatenResource }) {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data: rows = [], isLoading, isError } = useStammdaten(resource.endpoint, includeInactive);
  const updateMutation = useUpdateStammdatum(resource.endpoint);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<StammdatumRow | undefined>(undefined);

  function openCreate() {
    setEditingRow(undefined);
    setFormOpen(true);
  }

  function openEdit(row: StammdatumRow) {
    setEditingRow(row);
    setFormOpen(true);
  }

  function toggleAktiv(row: StammdatumRow) {
    updateMutation.mutate({ id: row.id, payload: { aktiv: !row.aktiv } });
  }

  const colspan = resource.fields.length + 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{resource.labelPlural}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id={`inactive-${resource.endpoint}`}
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
            <Label
              htmlFor={`inactive-${resource.endpoint}`}
              className="text-sm text-muted-foreground"
            >
              Inaktive anzeigen
            </Label>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Neu
          </Button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          {resource.labelPlural} konnten nicht geladen werden.
        </p>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {resource.fields.map((field) => (
                <TableHead key={field.key}>{field.label}</TableHead>
              ))}
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={colspan} className="text-center text-muted-foreground">
                  Lädt…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colspan} className="text-center text-muted-foreground">
                  Keine Einträge vorhanden.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                {resource.fields.map((field) => (
                  <TableCell
                    key={field.key}
                    className={field.key === resource.primaryField ? "font-medium" : ""}
                  >
                    {renderValue(row, field.key, field.type)}
                  </TableCell>
                ))}
                <TableCell>
                  <Badge variant={row.aktiv ? "success" : "secondary"}>
                    {row.aktiv ? "Aktiv" : "Inaktiv"}
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
                      <DropdownMenuItem onSelect={() => openEdit(row)}>Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggleAktiv(row)}>
                        {row.aktiv ? "Deaktivieren" : "Aktivieren"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <StammdatumFormDialog
        resource={resource}
        open={formOpen}
        onOpenChange={setFormOpen}
        row={editingRow}
      />
    </div>
  );
}

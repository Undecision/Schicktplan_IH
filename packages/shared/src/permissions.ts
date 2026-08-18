/**
 * Granulare Permissions (RBAC). Einzige Quelle der Wahrheit für Backend-Guards
 * (@RequirePermissions), Frontend-Gating (<RequirePermission>) und die
 * Rollenverwaltung (welche Permissions einer Rolle zugewiesen sind).
 */
export const PERMISSIONS = [
  "eintraege:create",
  "eintraege:read",
  "eintraege:update",
  "eintraege:update:fremde",
  "eintraege:comment",
  "eintraege:attach",
  "eintraege:delete",
  "anweisungen:read",
  "anweisungen:manage",
  "anweisungen:delete",
  "uebergaben:manage",
  "uebergaben:delete",
  "berichte:read",
  "berichte:freigeben",
  "berichte:delete",
  "admin:benutzer:manage",
  "admin:rollen:manage",
  "admin:stammdaten:manage",
  "audit:read",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

/** Menschlich lesbare Beschreibung je Permission (für Seed und Rollenverwaltungs-UI). */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "eintraege:create": "Schichtbucheinträge anlegen",
  "eintraege:read": "Schichtbucheinträge lesen",
  "eintraege:update": "Eigene Schichtbucheinträge bearbeiten",
  "eintraege:update:fremde": "Fremde Schichtbucheinträge bearbeiten",
  "eintraege:comment": "Schichtbucheinträge kommentieren",
  "eintraege:attach": "Dateianhänge hochladen/löschen",
  "eintraege:delete": "Schichtbucheinträge löschen",
  "anweisungen:read": "Arbeitsanweisungen lesen und quittieren",
  "anweisungen:manage": "Arbeitsanweisungen erstellen und Lesestatus einsehen",
  "anweisungen:delete": "Arbeitsanweisungen löschen",
  "uebergaben:manage": "Schichtübergaben erstellen/bearbeiten",
  "uebergaben:delete": "Schichtübergaben löschen",
  "berichte:read": "Berichte lesen",
  "berichte:freigeben": "Schichtberichte freigeben",
  "berichte:delete": "Schichtberichte löschen",
  "admin:benutzer:manage": "Benutzerverwaltung (Anlegen/Bearbeiten/Deaktivieren)",
  "admin:rollen:manage": "Rollen und Berechtigungen verwalten",
  "admin:stammdaten:manage": "Stammdaten verwalten (Gewerke, Fachbereiche, …)",
  "audit:read": "Audit-Log / Änderungsverlauf einsehen",
};

/** Gruppierung der Permissions für eine übersichtliche Darstellung in der UI. */
export const PERMISSION_GRUPPEN: { titel: string; permissions: PermissionKey[] }[] = [
  {
    titel: "Schichtbuch",
    permissions: [
      "eintraege:create",
      "eintraege:read",
      "eintraege:update",
      "eintraege:update:fremde",
      "eintraege:comment",
      "eintraege:attach",
      "eintraege:delete",
    ],
  },
  {
    titel: "Arbeitsanweisungen",
    permissions: ["anweisungen:read", "anweisungen:manage", "anweisungen:delete"],
  },
  {
    titel: "Berichte & Übergaben",
    permissions: [
      "uebergaben:manage",
      "uebergaben:delete",
      "berichte:read",
      "berichte:freigeben",
      "berichte:delete",
    ],
  },
  {
    titel: "Administration",
    permissions: [
      "admin:benutzer:manage",
      "admin:rollen:manage",
      "admin:stammdaten:manage",
      "audit:read",
    ],
  },
];

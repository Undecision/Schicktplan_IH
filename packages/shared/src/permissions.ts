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
  "anweisungen:read",
  "anweisungen:manage",
  "uebergaben:manage",
  "berichte:read",
  "berichte:freigeben",
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
  "anweisungen:read": "Arbeitsanweisungen lesen und quittieren",
  "anweisungen:manage": "Arbeitsanweisungen erstellen und Lesestatus einsehen",
  "uebergaben:manage": "Schichtübergaben erstellen/bearbeiten",
  "berichte:read": "Berichte lesen",
  "berichte:freigeben": "Schichtberichte freigeben",
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
    ],
  },
  { titel: "Arbeitsanweisungen", permissions: ["anweisungen:read", "anweisungen:manage"] },
  {
    titel: "Berichte & Übergaben",
    permissions: ["uebergaben:manage", "berichte:read", "berichte:freigeben"],
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

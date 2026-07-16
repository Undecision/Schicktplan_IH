/**
 * Idempotente Seed-Logik (Rollen, Permissions, Stammdaten-Startwerte,
 * Bootstrap-Administrator). Einzige Quelle der Wahrheit – genutzt von:
 *   - prisma/seed.ts (lokaler CLI-Seed via `pnpm prisma:seed`)
 *   - SeedService (automatischer Seed beim Container-Start, SEED_ON_STARTUP)
 */
import type { PrismaClient } from "@prisma/client";
import { PERMISSIONS, Rolle, ROLLEN } from "@schichtbuch/shared";
import type { PermissionKey } from "@schichtbuch/shared";

/** Prisma-Client oder Nest-PrismaService – beide erfüllen dieses Interface. */
type SeedPrisma = Pick<
  PrismaClient,
  | "permission"
  | "role"
  | "rolePermission"
  | "gewerk"
  | "fachbereich"
  | "schlagwort"
  | "schichtDefinition"
  | "user"
  | "userRole"
>;

export type PasswordHasher = (plain: string) => Promise<string>;

export interface BootstrapAdminConfig {
  email?: string;
  password?: string;
  name?: string;
}

const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  "eintraege:create": "Schichtbucheinträge anlegen",
  "eintraege:read": "Schichtbucheinträge lesen",
  "eintraege:update": "Schichtbucheinträge bearbeiten",
  "eintraege:comment": "Schichtbucheinträge kommentieren",
  "eintraege:attach": "Dateianhänge hochladen/löschen",
  "uebergaben:manage": "Schichtübergaben erstellen/bearbeiten",
  "berichte:read": "Berichte lesen",
  "berichte:freigeben": "Schichtberichte freigeben",
  "admin:benutzer:manage": "Benutzerverwaltung (Anlegen/Bearbeiten/Deaktivieren, Rollen)",
  "admin:stammdaten:manage": "Stammdaten verwalten (Gewerke, Fachbereiche, …)",
  "audit:read": "Audit-Log / Änderungsverlauf einsehen",
};

const ROLE_PERMISSIONS: Record<Rolle, readonly PermissionKey[]> = {
  [Rolle.ADMINISTRATOR]: PERMISSIONS,
  [Rolle.MEISTER_SCHICHTLEITER]: [
    "eintraege:create",
    "eintraege:read",
    "eintraege:update",
    "eintraege:comment",
    "eintraege:attach",
    "uebergaben:manage",
    "berichte:read",
    "berichte:freigeben",
    "audit:read",
  ],
  [Rolle.INSTANDHALTER]: [
    "eintraege:create",
    "eintraege:read",
    "eintraege:update",
    "eintraege:comment",
    "eintraege:attach",
  ],
  [Rolle.LESEBERECHTIGTE]: ["eintraege:read", "berichte:read"],
};

const DEFAULT_GEWERKE = ["Elektrotechnik", "Mechanik", "Versorgung/Medien"];
const DEFAULT_FACHBEREICHE = [
  "Druck",
  "Beschichtung",
  "Endfertigung",
  "Medienversorgung",
  "Palettierung",
  "Logistik",
];
const DEFAULT_SCHLAGWOERTER = [
  "Pneumatik",
  "Hydraulik",
  "SPS",
  "Elektrik",
  "Mechanik",
  "Sicherheit",
];
const DEFAULT_SCHICHTEN = [
  { name: "Frühschicht", startzeit: "06:00", endzeit: "14:00" },
  { name: "Spätschicht", startzeit: "14:00", endzeit: "22:00" },
  { name: "Nachtschicht", startzeit: "22:00", endzeit: "06:00" },
];

async function seedRollen(prisma: SeedPrisma) {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
    });
  }

  for (const rolle of ROLLEN) {
    const role = await prisma.role.upsert({
      where: { name: rolle },
      create: { name: rolle },
      update: {},
    });
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...ROLE_PERMISSIONS[rolle]] } },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }
}

async function seedStammdaten(prisma: SeedPrisma) {
  for (const name of DEFAULT_GEWERKE) {
    await prisma.gewerk.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const name of DEFAULT_FACHBEREICHE) {
    await prisma.fachbereich.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const name of DEFAULT_SCHLAGWOERTER) {
    await prisma.schlagwort.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const schicht of DEFAULT_SCHICHTEN) {
    await prisma.schichtDefinition.upsert({
      where: { name: schicht.name },
      create: schicht,
      update: {},
    });
  }
}

async function seedBootstrapAdmin(
  prisma: SeedPrisma,
  hashPassword: PasswordHasher,
  config: BootstrapAdminConfig,
  log: (message: string) => void,
) {
  const { email, password, name = "Administrator" } = config;
  if (!email || !password) {
    log(
      "BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD nicht gesetzt – überspringe Bootstrap-Administrator.",
    );
    return;
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: Rolle.ADMINISTRATOR } });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Passwort bestehender Admins NICHT überschreiben (idempotent, keine Reset-Nebenwirkung).
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: existing.id, roleId: adminRole.id } },
      create: { userId: existing.id, roleId: adminRole.id },
      update: {},
    });
    log(`Bootstrap-Administrator bereits vorhanden: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
  log(`Bootstrap-Administrator angelegt: ${email}`);
}

export async function runSeed(
  prisma: SeedPrisma,
  hashPassword: PasswordHasher,
  adminConfig: BootstrapAdminConfig,
  log: (message: string) => void = (msg) => console.log(`[seed] ${msg}`),
): Promise<void> {
  await seedRollen(prisma);
  await seedStammdaten(prisma);
  await seedBootstrapAdmin(prisma, hashPassword, adminConfig, log);
}

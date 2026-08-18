/**
 * Idempotente Seed-Logik (Rollen, Permissions, Stammdaten-Startwerte,
 * Bootstrap-Administrator). Einzige Quelle der Wahrheit – genutzt von:
 *   - prisma/seed.ts (lokaler CLI-Seed via `pnpm prisma:seed`)
 *   - SeedService (automatischer Seed beim Container-Start, SEED_ON_STARTUP)
 */
import type { PrismaClient } from "@prisma/client";
import { PERMISSIONS, PERMISSION_LABELS, Rolle, ROLLEN } from "@schichtbuch/shared";
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
  /** Anmeldename; ohne Angabe aus dem E-Mail-Lokalteil abgeleitet. */
  username?: string;
}

const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = PERMISSION_LABELS;

/**
 * Standard-Berechtigungen der Systemrollen (nur Startwerte). Meister und
 * Schichtleiter sind getrennt: Meister erstellen Anweisungen (anweisungen:manage,
 * ohne :read), Schichtleiter lesen/quittieren sie (anweisungen:read) – wie die
 * Instandhalter, jeweils nach Gewerk. „eintraege:update:fremde" erlaubt das
 * Bearbeiten fremder Einträge (Administrator, Meister, Schichtleiter).
 */
const ROLE_PERMISSIONS: Record<Rolle, readonly PermissionKey[]> = {
  [Rolle.ADMINISTRATOR]: PERMISSIONS,
  [Rolle.MEISTER]: [
    "eintraege:create",
    "eintraege:read",
    "eintraege:update",
    "eintraege:update:fremde",
    "eintraege:comment",
    "eintraege:attach",
    "anweisungen:manage",
    "uebergaben:manage",
    "berichte:read",
    "berichte:freigeben",
    "audit:read",
  ],
  [Rolle.SCHICHTLEITER]: [
    "eintraege:create",
    "eintraege:read",
    "eintraege:update",
    "eintraege:update:fremde",
    "eintraege:comment",
    "eintraege:attach",
    "anweisungen:read",
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
    "anweisungen:read",
  ],
  [Rolle.LESEBERECHTIGTE]: ["eintraege:read", "berichte:read", "anweisungen:read"],
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

/**
 * Synchronisiert den Berechtigungs-Katalog: legt alle in `PERMISSIONS`
 * definierten Berechtigungen idempotent an und stellt sicher, dass die
 * Administrator-Rolle stets sämtliche Berechtigungen besitzt. Bewusst
 * unabhängig vom vollständigen Seed – so gehen neue Berechtigungen (z.B.
 * "uebergaben:delete") beim Update auch dann nicht verloren, wenn
 * SEED_ON_STARTUP deaktiviert ist.
 */
export async function syncBerechtigungen(prisma: SeedPrisma): Promise<void> {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
    });
  }
  const admin = await prisma.role.upsert({
    where: { name: Rolle.ADMINISTRATOR },
    create: { name: Rolle.ADMINISTRATOR },
    update: {},
  });
  await setzeRollenPermissions(prisma, admin.id, PERMISSIONS);
}

async function seedRollen(prisma: SeedPrisma) {
  await syncBerechtigungen(prisma);

  await migriereAltRolleMeisterSchichtleiter(prisma);

  for (const rolle of ROLLEN) {
    const role = await prisma.role.upsert({
      where: { name: rolle },
      create: { name: rolle },
      update: {},
    });
    const vorhandene = await prisma.rolePermission.count({ where: { roleId: role.id } });

    // Standard-Berechtigungen NUR beim ersten Anlegen einer Rolle setzen, damit
    // spätere Anpassungen über die Rollenverwaltung erhalten bleiben. Der
    // Administrator wird bereits in syncBerechtigungen mit allen Rechten
    // synchronisiert und hier deshalb ausgelassen.
    if (rolle !== Rolle.ADMINISTRATOR && vorhandene === 0) {
      await setzeRollenPermissions(prisma, role.id, ROLE_PERMISSIONS[rolle]);
    }
  }
}

/** Setzt die Berechtigungen einer Rolle exakt auf die übergebene Liste. */
async function setzeRollenPermissions(
  prisma: SeedPrisma,
  roleId: string,
  keys: readonly PermissionKey[],
) {
  const permissions = await prisma.permission.findMany({ where: { key: { in: [...keys] } } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
    skipDuplicates: true,
  });
}

/**
 * Einmalige Migration der früheren kombinierten Rolle „Meister/Schichtleiter":
 * Bestehende Zuordnungen werden auf „Schichtleiter" umgehängt (behalten Lese-/
 * Bearbeitungs-/Freigaberechte); die Anweisungs-Erstellung ist danach der neuen
 * Rolle „Meister" vorbehalten und wird bei Bedarf gezielt zugewiesen. Idempotent:
 * nach dem ersten Lauf existiert die alte Rolle nicht mehr.
 */
async function migriereAltRolleMeisterSchichtleiter(prisma: SeedPrisma) {
  const alt = await prisma.role.findUnique({ where: { name: "Meister/Schichtleiter" } });
  if (!alt) return;
  const schichtleiter = await prisma.role.upsert({
    where: { name: Rolle.SCHICHTLEITER },
    create: { name: Rolle.SCHICHTLEITER },
    update: {},
  });
  const zuordnungen = await prisma.userRole.findMany({ where: { roleId: alt.id } });
  for (const zuordnung of zuordnungen) {
    // Auf Schichtleiter umhängen (Duplikate überspringen).
    await prisma.userRole
      .create({ data: { userId: zuordnung.userId, roleId: schichtleiter.id } })
      .catch(() => undefined);
  }
  await prisma.userRole.deleteMany({ where: { roleId: alt.id } });
  await prisma.rolePermission.deleteMany({ where: { roleId: alt.id } });
  await prisma.role.delete({ where: { id: alt.id } });
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
  const username = (config.username?.trim() || email.split("@")[0] || "admin").toLowerCase();

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
  const user = await prisma.user.create({ data: { username, email, name, passwordHash } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
  log(`Bootstrap-Administrator angelegt: ${username} (${email})`);
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

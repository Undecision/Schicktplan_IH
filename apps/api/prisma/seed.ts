/**
 * Seed-Skript für Stammdaten.
 * Phase 1 (Auth/RBAC): Permissions, Rollen, Rollen-Permission-Zuordnung,
 *   Gewerk-Minimalstub, Bootstrap-Administrator (aus Env, siehe .env.example).
 * Phase 2 (Stammdaten): Fachbereiche, Schlagwörter, Schicht-Definitionen – TODO.
 *
 * Aufruf: pnpm --filter @schichtbuch/api prisma:seed
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { PERMISSIONS, Rolle, ROLLEN } from "@schichtbuch/shared";
import type { PermissionKey } from "@schichtbuch/shared";

const prisma = new PrismaClient();

const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  "eintraege:create": "Schichtbucheinträge anlegen",
  "eintraege:read": "Schichtbucheinträge lesen",
  "eintraege:update": "Schichtbucheinträge bearbeiten",
  "eintraege:comment": "Schichtbucheinträge kommentieren",
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
  ],
  [Rolle.LESEBERECHTIGTE]: ["eintraege:read", "berichte:read"],
};

const DEFAULT_GEWERKE = ["Elektrotechnik", "Mechanik", "Versorgung/Medien"];

async function seedPermissions() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
    });
  }
}

async function seedRollen() {
  await seedPermissions();

  for (const rolle of ROLLEN) {
    const role = await prisma.role.upsert({
      where: { name: rolle },
      create: { name: rolle },
      update: {},
    });

    const permissionKeys = ROLE_PERMISSIONS[rolle];
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...permissionKeys] } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }
}

async function seedGewerke() {
  for (const name of DEFAULT_GEWERKE) {
    await prisma.gewerk.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

async function seedBootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME ?? "Administrator";

  if (!email || !password) {
    console.log(
      "[seed] BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD nicht gesetzt – " +
        "überspringe Anlage des Bootstrap-Administrators.",
    );
    return;
  }

  const passwordHash = await argon2.hash(password);
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: Rolle.ADMINISTRATOR },
  });

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash },
    update: {},
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    create: { userId: user.id, roleId: adminRole.id },
    update: {},
  });

  console.log(`[seed] Bootstrap-Administrator sichergestellt: ${email}`);
}

async function seedFachbereiche() {
  // TODO (Phase 2): Druck, Beschichtung, Endfertigung, Medienversorgung, Palettierung, Logistik
}

async function seedSchlagwoerter() {
  // TODO (Phase 2): Pneumatik, Hydraulik, SPS, Elektrik, Mechanik, Sicherheit
}

async function seedSchichtDefinitionen() {
  // TODO (Phase 2): Früh/Spät/Nacht mit Start-/Endzeit
}

async function main() {
  await seedRollen();
  await seedGewerke();
  await seedBootstrapAdmin();
  await seedFachbereiche();
  await seedSchlagwoerter();
  await seedSchichtDefinitionen();
}

main()
  .catch((error) => {
    console.error("Seed fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

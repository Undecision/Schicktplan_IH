/**
 * Seed-Skript-Gerüst für Stammdaten (Gewerke, Fachbereiche, Schlagwörter, Rollen).
 * Wird ausgebaut, sobald die zugehörigen Modelle existieren (Phase 1: Role/Permission,
 * Phase 2: Gewerk/Fachbereich/TechnischerPlatz/Schlagwort/Schicht-Definition).
 *
 * Aufruf: pnpm --filter @schichtbuch/api prisma:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedRollen() {
  // TODO (Phase 1): Administrator, Meister/Schichtleiter, Instandhalter, Leseberechtigte
}

async function seedGewerke() {
  // TODO (Phase 2): Elektrotechnik, Mechanik, Versorgung/Medien
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

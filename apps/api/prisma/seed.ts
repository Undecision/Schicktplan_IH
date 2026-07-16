/**
 * Lokaler CLI-Seed (`pnpm --filter @schichtbuch/api prisma:seed`).
 * Nutzt dieselbe idempotente Logik wie der automatische Container-Seed
 * (src/bootstrap/seed-data.ts, SEED_ON_STARTUP).
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { runSeed } from "../src/bootstrap/seed-data";

const prisma = new PrismaClient();

runSeed(prisma, (plain) => argon2.hash(plain), {
  email: process.env.BOOTSTRAP_ADMIN_EMAIL,
  password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  name: process.env.BOOTSTRAP_ADMIN_NAME,
})
  .catch((error) => {
    console.error("Seed fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

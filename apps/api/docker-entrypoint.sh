#!/bin/sh
# Container-Start: erst Datenbank-Migrationen anwenden (idempotent), dann API starten.
# Der Seed (Rollen/Stammdaten/Bootstrap-Admin) läuft in der App selbst,
# gesteuert über SEED_ON_STARTUP (siehe SeedService).
set -e

cd /workspace/apps/api

echo "[entrypoint] Warte auf Datenbank und wende Migrationen an…"
pnpm exec prisma migrate deploy

echo "[entrypoint] Starte API…"
exec node dist/main.js

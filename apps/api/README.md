# @schichtbuch/api

NestJS-Backend des Instandhaltungsschichtbuchs.

## Entwicklung

```bash
pnpm --filter @schichtbuch/api dev
```

Erwartet eine laufende PostgreSQL- und MinIO-Instanz (siehe `/infra/docker-compose.yml`)
sowie eine `.env` im Repo-Root (siehe `.env.example`).

## Datenbank / Prisma

Migrations-Workflow:

```bash
# Schema ändern in prisma/schema.prisma, dann:
pnpm --filter @schichtbuch/api prisma:migrate    # prisma migrate dev – erzeugt + wendet Migration lokal an
pnpm --filter @schichtbuch/api prisma:generate    # prisma generate – Client neu generieren
pnpm --filter @schichtbuch/api prisma:deploy      # prisma migrate deploy – Migrationen in Staging/Prod anwenden
pnpm --filter @schichtbuch/api prisma:seed        # Stammdaten-Seed ausführen
```

Konventionen für neue Modelle: siehe Kommentar-Header in `prisma/schema.prisma`
(UUID-PKs, `createdAt`/`updatedAt`, Soft-Delete via `deletedAt`).

## Endpunkte

- `GET /api/health` – Liveness/Readiness (DB + MinIO)
- `GET /api/docs` – Swagger/OpenAPI

## Tests

```bash
pnpm --filter @schichtbuch/api test        # Unit-Tests
pnpm --filter @schichtbuch/api test:e2e    # E2E-Tests (benötigt laufende Infra)
```

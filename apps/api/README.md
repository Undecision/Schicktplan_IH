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

- `GET /api/health` – Liveness/Readiness (DB + MinIO), öffentlich
- `GET /api/docs` – Swagger/OpenAPI
- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`,
  `GET /api/auth/me` – lokale Authentifizierung (Argon2, JWT-Access +
  httpOnly-Refresh-Cookie)
- `GET/POST/PATCH /api/users`, `POST /api/users/:id/deactivate`,
  `POST /api/users/:id/reset-password` – Benutzerverwaltung
  (`admin:benutzer:manage`)
- `GET /api/gewerke` – Gewerke-Liste (nur lesend, für Benutzerformular; volle
  Verwaltung folgt in Phase 2)

Alle Endpunkte außer `/health`, `/` und `/auth/login|refresh|logout` verlangen
einen gültigen `Authorization: Bearer <accessToken>`-Header (siehe
`@RequirePermissions()`/`PermissionsGuard` in `src/auth`).

## Tests

```bash
pnpm --filter @schichtbuch/api test        # Unit-Tests
pnpm --filter @schichtbuch/api test:e2e    # E2E-Tests (benötigt laufende Infra)
```

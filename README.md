# Schichtbuch – Cloudbasiertes Instandhaltungsschichtbuch

Monorepo für das Instandhaltungsschichtbuch (SIG Combibloc GmbH, Werk Wittenberg).

## Struktur

```
apps/api        NestJS-Backend (REST + OpenAPI/Swagger, Prisma/PostgreSQL, MinIO)
apps/web        React + TypeScript + Vite Frontend (Tailwind, shadcn/ui)
packages/shared Gemeinsame TypeScript-Typen/DTOs
infra           Docker-Compose, Caddy-Reverse-Proxy, Backup-Skripte
docs            Fachliche/technische Dokumentation (DSGVO, Abnahme, …)
```

## Tech-Stack

- Frontend: React + TypeScript (Vite), Tailwind + shadcn/ui
- Backend: NestJS (TypeScript), REST + OpenAPI/Swagger
- Datenbank: PostgreSQL 16 (Prisma ORM)
- Dateispeicher: MinIO (S3-kompatibel)
- Auth: lokal (Argon2) + OIDC-ready (Entra ID per Config)
- Deployment: Docker-Compose (Proxmox-LXC), Reverse Proxy Caddy (HTTPS)

## Setup (lokale Entwicklung)

Voraussetzungen: Node.js ≥ 20, pnpm ≥ 10, Docker (für Postgres/MinIO).

```bash
# 1. Abhängigkeiten installieren
pnpm install

# 2. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env bei Bedarf anpassen

# 3. Infrastruktur starten (Postgres, MinIO, Caddy, ...)
docker compose --env-file .env -f infra/docker-compose.yml up -d postgres minio

# 4. Datenbank-Schema anwenden
pnpm --filter @schichtbuch/api prisma:migrate

# 5. Stammdaten + ersten Administrator anlegen
#    (BOOTSTRAP_ADMIN_EMAIL/-PASSWORD aus .env, siehe .env.example)
pnpm --filter @schichtbuch/api prisma:seed

# 6. Backend & Frontend im Dev-Modus starten (zwei Terminals)
pnpm dev:api
pnpm dev:web
```

Backend läuft dann unter `http://localhost:3000/api`, Swagger-Doku unter
`http://localhost:3000/api/docs`. Frontend läuft unter `http://localhost:5173`
(mit Dev-Proxy `/api` → Backend, siehe `apps/web/vite.config.ts`) – Login mit
den `BOOTSTRAP_ADMIN_*`-Zugangsdaten aus `.env`.

## Produktions-Deployment

Siehe [`DEPLOY.md`](./DEPLOY.md).

## Skripte (Root)

```bash
pnpm lint        # ESLint über alle Packages
pnpm typecheck   # TypeScript-Typprüfung über alle Packages
pnpm test        # Tests über alle Packages
pnpm build       # Produktions-Build über alle Packages
```

## Konventionen

- Konfiguration ausschließlich über Env-Variablen (siehe `.env.example`) –
  keine hartkodierten Pfade/Ports/Secrets.
- UUID-Primärschlüssel, `createdAt`/`updatedAt`, append-only Audit-Log für
  alle schreibenden Operationen (ab Phase 1).
- RBAC-Guard auf jedem Endpunkt; Gewerk-Sichtbarkeit als zusätzliche
  Datenfilter-Dimension (ab Phase 1).
- Alle geteilten Typen in `/packages/shared`.
- Zu jedem Arbeitspaket: Unit-/Integrationstests + kurze Doku-Ergänzung.
- DSGVO ab Testsystem aktiv (echte Daten): Verschlüsselung at-rest,
  verschlüsselte Backups, Zugriffskontrolle, Löschkonzept – siehe
  `docs/dsgvo-loeschkonzept.md`.

## Rollen (RBAC)

Administrator · Meister/Schichtleiter · Instandhalter · Leseberechtigte.

## Bauabfolge

Dieses Repository wird entlang der Phasen 0–11 des Lastenhefts aufgebaut
(Fundament → Auth/RBAC → Stammdaten → Schichtbucheinträge → … → Härtung/DSGVO).
Der aktuelle Stand: **Phase 0 (Fundament)** und **Phase 1 (Auth & RBAC)**
abgeschlossen – lokale Anmeldung, RBAC-Guards, Audit-Log-Fundament und
Benutzerverwaltung sind funktionsfähig.

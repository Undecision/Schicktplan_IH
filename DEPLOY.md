# Deployment

Zielumgebung: Proxmox-LXC (~4 vCPU / 8 GB RAM), 10–40 gleichzeitige Nutzer,
Docker Compose, Caddy als Reverse Proxy mit automatischem HTTPS.

## 1. Voraussetzungen

- Docker Engine + Docker Compose Plugin im LXC-Container.
- Für Produktivbetrieb: LXC mit "nesting" aktiviert (Docker-in-LXC) und
  ausreichend Disk-Volume für `postgres-data` / `minio-data`.

## 2. Konfiguration

```bash
cp .env.example .env
# .env bearbeiten: alle "change-me"-Werte durch starke Secrets ersetzen.
```

Wichtige Variablen:

- `CADDY_DOMAIN` – Domain/Hostname, unter dem die Anwendung erreichbar ist.
  Standardmäßig nutzt Caddy seine interne CA (selbstsigniertes Zertifikat) –
  passend für den internen LXC-Betrieb ohne öffentliche DNS-Auflösung. Für
  eine öffentlich erreichbare Domain `tls internal` in `infra/Caddyfile`
  entfernen, Caddy holt dann automatisch ein Let's-Encrypt-Zertifikat.
- `POSTGRES_*`, `S3_*` (MinIO-Zugangsdaten), `AUTH_JWT_*_SECRET`,
  `BACKUP_ENCRYPTION_KEY` – produktiv immer individuell setzen.

## 3. Start

Alle Befehle aus dem Repo-Root, mit explizitem `--env-file` (liegt außerhalb
von `infra/`):

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

Healthchecks sorgen dafür, dass `api`/`web` erst starten, wenn Postgres und
MinIO bereit sind, und Caddy erst, wenn `api`/`web` gesund sind.

Status prüfen:

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.yml logs -f api
```

## 4. Reverse-Proxy-Domain

Caddy routet:

- `https://<CADDY_DOMAIN>/api/*` → `api`-Container
- `https://<CADDY_DOMAIN>/*` → `web`-Container (statisches Frontend)

Ports 80/443 des LXC müssen auf den Caddy-Container gemappt sein (bereits in
`docker-compose.yml` konfiguriert).

## 5. Datenverschlüsselung (DSGVO-Vorbereitung)

- **At-rest**: Die Proxmox-LXC-Storage-Volumes (bzw. das zugrunde liegende
  ZFS/LVM-Storage-Backend) sollten verschlüsselt eingerichtet werden
  (Proxmox-Storage-Verschlüsselung oder verschlüsseltes Host-Dateisystem).
  Die Docker-Named-Volumes `postgres-data` und `minio-data` liegen auf diesem
  Storage und erben damit die Verschlüsselung.
- **Backups**: siehe `infra/scripts/backup.sh` – Dumps werden vor Ablage
  symmetrisch verschlüsselt (`BACKUP_ENCRYPTION_KEY`).
- **Zugriffskontrolle**: RBAC im Backend (Phase 1), Netzwerkzugriff auf
  Postgres/MinIO ausschließlich über das interne Compose-Netzwerk (keine
  Port-Exposition nach außen).

## 6. Volume-Backup

Siehe `infra/scripts/backup.sh` für automatisierte, verschlüsselte tägliche
Backups (`pg_dump` + MinIO-Snapshot) inkl. Restore-Anleitung.

## 7. Updates

```bash
git pull
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

Datenbank-Migrationen laufen nicht automatisch beim Container-Start (bewusst,
um versehentliche Migrationen zu vermeiden). Nach einem Update mit
Schema-Änderungen:

```bash
docker compose --env-file .env -f infra/docker-compose.yml exec api pnpm prisma:deploy
```

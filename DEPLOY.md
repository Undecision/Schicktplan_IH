# Deployment

Zielumgebung: Proxmox-LXC (~4 vCPU / 8 GB RAM), 10–40 gleichzeitige Nutzer,
Docker Compose, Caddy als Reverse Proxy mit automatischem HTTPS.

## 1. Proxmox-LXC anlegen (einmalig)

Dieses Repo stellt **Docker-Compose** bereit – das orchestriert Docker-Container
(postgres, minio, api, web, caddy), **nicht** das Proxmox-LXC selbst. Das LXC ist
der Host, in dem der Stack läuft, und wird einmalig auf dem Proxmox-Host angelegt.

### 1a. Container in der Proxmox-Weboberfläche erstellen

1. **Vorlage laden**: Datacenter → Storage (z.B. `local`) → CT Templates →
   _Templates_ → `debian-12-standard` herunterladen.
2. **Create CT** (oben rechts):
   - **General**: Hostname z.B. `schichtbuch`, Passwort/SSH-Key setzen.
     "Unprivileged container" angehakt lassen.
   - **Template**: das geladene `debian-12-standard`-Image wählen.
   - **Disks**: Root-Disk **≥ 40 GB** (Postgres + MinIO-Anhänge wachsen).
   - **CPU**: **4 Cores**.
   - **Memory**: **8192 MB** RAM (min. 4096), Swap 2048 MB.
   - **Network**: statische IP oder DHCP; Bridge `vmbr0`.
3. **Noch NICHT starten** – erst Nesting aktivieren (nächster Schritt).

### 1b. Nesting aktivieren (Docker-in-LXC)

Docker läuft in einem LXC nur mit aktiviertem `nesting`-Feature. Auf der
Proxmox-Host-Shell (`<CTID>` = die ID des Containers, z.B. 100):

```bash
pct set <CTID> --features nesting=1
pct start <CTID>
pct enter <CTID>
```

Alternativ in der Weboberfläche: Container → Options → Features → _Nesting_
anhaken (Container muss dazu gestoppt sein).

### 1c. Docker im LXC installieren

Innerhalb des Containers (`pct enter <CTID>` oder per SSH):

```bash
apt-get update && apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker run --rm hello-world   # Funktionstest
```

### 1d. Voraussetzungen-Checkliste

- LXC mit **nesting=1**, ~4 vCPU / 8 GB RAM, ≥ 40 GB Disk.
- Docker Engine + Compose-Plugin installiert (Schritt 1c).
- Ports **80/443** des LXC erreichbar (für Caddy/HTTPS).
- Ausreichend Disk für die Named Volumes `postgres-data` / `minio-data`.

## 2. Konfiguration

Repo in das LXC klonen und Umgebungsvariablen setzen:

```bash
git clone <REPO-URL> schichtbuch && cd schichtbuch
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

## 3. Start (erster Deploy)

Alle Befehle aus dem Repo-Root, mit explizitem `--env-file` (liegt außerhalb
von `infra/`):

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

Das war's – beim ersten Start passiert automatisch:

1. Healthchecks sorgen dafür, dass `api`/`web` erst starten, wenn Postgres und
   MinIO bereit sind, und Caddy erst, wenn `api`/`web` gesund sind.
2. Der API-Container wendet die **Datenbank-Migrationen** an
   (`prisma migrate deploy` im Entrypoint).
3. Ist `SEED_ON_STARTUP=true` gesetzt (Standard in `.env.example`), legt die API
   idempotent **Rollen, Permissions, Stammdaten-Startwerte und den
   Bootstrap-Administrator** an (aus `BOOTSTRAP_ADMIN_*`).

Status/Logs prüfen:

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.yml logs -f api
```

### Erster Login

Nach dem Start ist die Anwendung unter `https://<CADDY_DOMAIN>` erreichbar.
Anmeldung mit den `BOOTSTRAP_ADMIN_*`-Werten aus der `.env`
(Standard-Vorlage: `admin@example.com` / `Change-Me-Admin-Password-123`).

**Wichtig:** Direkt nach dem ersten Login ein eigenes Admin-Konto mit sicherem
Passwort anlegen, dann `SEED_ON_STARTUP` auf `false` setzen und die
`BOOTSTRAP_ADMIN_PASSWORD` aus der produktiven `.env` entfernen. Der Seed
überschreibt ein bereits existierendes Admin-Passwort NICHT – ein
Container-Neustart ist also unkritisch.

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

Neue Datenbank-Migrationen werden beim Neustart des API-Containers automatisch
angewendet (`prisma migrate deploy` im Entrypoint) – kein manueller Schritt
nötig. Der Seed ist idempotent und richtet keinen Schaden an, falls
`SEED_ON_STARTUP` noch auf `true` steht.

## 8. Hinweis zum Image-Build

Die API läuft auf `node:22-slim` (Debian/glibc), damit die nativen Abhängigkeiten
(argon2) und die Prisma-Engine ohne Sonderbehandlung bauen. Der Build braucht
Internet-Zugriff auf die npm-Registry und Docker Hub. Der erste `--build` dauert
je nach Verbindung einige Minuten (Kompilierung von argon2, Prisma-Generate,
Vite-Build).

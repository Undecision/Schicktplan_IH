#!/usr/bin/env bash
#
# Tägliches, verschlüsseltes Backup: PostgreSQL (pg_dump, custom-Format) +
# MinIO-Datenverzeichnis (Volume-Snapshot als tar), zusammengefasst und mit
# AES-256 (BACKUP_ENCRYPTION_KEY aus .env) verschlüsselt.
#
# Cron-Beispiel (täglich 02:00 Uhr, auf dem LXC-Host):
#   0 2 * * * /opt/schichtbuch/infra/scripts/backup.sh >> /var/log/schichtbuch-backup.log 2>&1
#
# Restore: siehe infra/scripts/restore.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker-compose.yml"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/infra/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fehler: $ENV_FILE nicht gefunden." >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" || "$BACKUP_ENCRYPTION_KEY" == "change-me-backup-key" ]]; then
  echo "Fehler: BACKUP_ENCRYPTION_KEY ist nicht gesetzt oder noch der Platzhalterwert." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "[backup] Dumping PostgreSQL (${POSTGRES_DB})..."
compose exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$WORKDIR/postgres.dump"

echo "[backup] Snapshotting MinIO-Datenverzeichnis..."
MINIO_VOLUME="$(docker volume ls --format '{{.Name}}' | grep -E '_minio-data$' | head -n1)"
if [[ -z "$MINIO_VOLUME" ]]; then
  echo "Fehler: MinIO-Docker-Volume nicht gefunden." >&2
  exit 1
fi
docker run --rm \
  -v "${MINIO_VOLUME}:/data:ro" \
  -v "$WORKDIR:/backup" \
  alpine:3 \
  tar -C /data -czf /backup/minio-data.tar.gz .

echo "[backup] Erzeuge verschlüsseltes Gesamtarchiv..."
ARCHIVE="$WORKDIR/schichtbuch-backup-$TIMESTAMP.tar"
tar -C "$WORKDIR" -cf "$ARCHIVE" postgres.dump minio-data.tar.gz

ENCRYPTED_FILE="$BACKUP_DIR/schichtbuch-backup-$TIMESTAMP.tar.enc"
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in "$ARCHIVE" \
  -out "$ENCRYPTED_FILE" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

echo "[backup] Backup gespeichert: $ENCRYPTED_FILE"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
echo "[backup] Räume Backups älter als ${RETENTION_DAYS} Tage auf..."
find "$BACKUP_DIR" -name 'schichtbuch-backup-*.tar.enc' -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] Fertig."

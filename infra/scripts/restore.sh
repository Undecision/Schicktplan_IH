#!/usr/bin/env bash
#
# Stellt ein mit backup.sh erzeugtes, verschlüsseltes Backup wieder her.
#
# ACHTUNG: Überschreibt die aktuelle PostgreSQL-Datenbank und den MinIO-
# Datenbestand. Vor dem Restore die betroffenen Container stoppen bzw. sich
# der Konsequenzen bewusst sein.
#
# Aufruf:
#   infra/scripts/restore.sh <pfad-zu-schichtbuch-backup-YYYYMMDD-HHMMSS.tar.enc>

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup-datei.tar.enc>" >&2
  exit 1
fi

ENCRYPTED_FILE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker-compose.yml"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"

if [[ ! -f "$ENCRYPTED_FILE" ]]; then
  echo "Fehler: Backup-Datei nicht gefunden: $ENCRYPTED_FILE" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fehler: $ENV_FILE nicht gefunden." >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "Fehler: BACKUP_ENCRYPTION_KEY ist nicht gesetzt." >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "[restore] Entschlüssele Backup..."
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "$ENCRYPTED_FILE" \
  -out "$WORKDIR/backup.tar" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

tar -C "$WORKDIR" -xf "$WORKDIR/backup.tar"

read -r -p "Aktuelle Datenbank '${POSTGRES_DB}' und MinIO-Daten werden ÜBERSCHRIEBEN. Fortfahren? [yes/NO] " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Abgebrochen."
  exit 1
fi

echo "[restore] Stelle PostgreSQL wieder her..."
compose exec -T postgres dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
compose exec -T postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$WORKDIR/postgres.dump"

echo "[restore] Stelle MinIO-Datenverzeichnis wieder her..."
MINIO_VOLUME="$(docker volume ls --format '{{.Name}}' | grep -E '_minio-data$' | head -n1)"
if [[ -z "$MINIO_VOLUME" ]]; then
  echo "Fehler: MinIO-Docker-Volume nicht gefunden." >&2
  exit 1
fi
compose stop minio
docker run --rm \
  -v "${MINIO_VOLUME}:/data" \
  -v "$WORKDIR:/backup:ro" \
  alpine:3 \
  sh -c "rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar -C /data -xzf /backup/minio-data.tar.gz"
compose start minio

echo "[restore] Fertig. Prüfe mit: docker compose --env-file $ENV_FILE -f $COMPOSE_FILE ps"

# DSGVO – Technische und organisatorische Maßnahmen (TOM)

Stand: v1. Ergänzt das Löschkonzept (`docs/dsgvo-loeschkonzept.md`).

## 1. Vertraulichkeit

- **Zugriffskontrolle**: Rollenbasierte Rechteverwaltung (RBAC) auf jedem
  Endpunkt (`@RequirePermissions`), zusätzlich Gewerk-Sichtbarkeit als
  Datenfilter. Rollen: Administrator, Meister/Schichtleiter, Instandhalter,
  Leseberechtigte.
- **Authentisierung**: Lokale Anmeldung mit Argon2id-Passwort-Hashing,
  Account-Lockout nach zu vielen Fehlversuchen, kurzlebiges JWT-Access-Token +
  httpOnly-Refresh-Cookie (`secure` hinter HTTPS). OIDC-Adapter (Entra ID)
  vorbereitet.
- **Netz**: Postgres und MinIO nur im internen Compose-Netz; kein öffentlicher
  Port. Öffentlicher Zugriff ausschließlich über Reverse Proxy/Tunnel mit TLS.
- **Transportverschlüsselung**: HTTPS (Caddy-TLS oder Cloudflare-Edge). HSTS via
  Helmet. Security-Header (CSP, X-Frame-Options, nosniff) durch Helmet.

## 2. Integrität

- **Revisionssicherheit**: Append-only Audit-Log, DB-seitig gegen UPDATE/DELETE
  gesichert (Postgres-Regel). Änderungsverlauf je Eintrag einsehbar.
- **Eingabevalidierung**: Global `ValidationPipe` mit `whitelist` +
  `forbidNonWhitelisted`; DTO-Validierung (class-validator). Datei-Uploads mit
  MIME-Whitelist und Größenlimit.
- **Rate-Limiting**: Globaler ThrottlerGuard gegen Brute-Force/Missbrauch.

## 3. Verfügbarkeit und Belastbarkeit

- **Backups**: Täglicher, symmetrisch verschlüsselter `pg_dump` + MinIO-Snapshot
  (`infra/scripts/backup.sh`), Aufbewahrung `BACKUP_RETENTION_DAYS`. Dokumentierte
  Restore-Anleitung.
- **At-rest-Verschlüsselung**: Über verschlüsseltes Proxmox-/ZFS-Storage der
  LXC-Volumes (siehe `DEPLOY.md` §5).

## 4. Betroffenenrechte (Art. 15–20 DSGVO)

- **Auskunft/Export**: Admin → Benutzerverwaltung → „DSGVO-Auskunft (Export)"
  liefert alle personenbezogenen Daten einer Person als JSON
  (`GET /api/admin/dsgvo/:userId/export`).
- **Löschung/Anonymisierung** (Art. 17): „Anonymisieren (DSGVO)"
  (`POST /api/admin/dsgvo/:userId/anonymisieren`) pseudonymisiert Name/E-Mail und
  deaktiviert das Konto. Fachliche Einträge und das revisionssichere Audit-Log
  bleiben aus Nachweisgründen erhalten, verlieren aber den Personenbezug.
- **Aufbewahrung**: Konfigurierbar über Storage-/Backup-Retention; fachliche
  Aufbewahrungsfristen siehe Löschkonzept.

## 5. Auftragsverarbeitung / Verantwortlichkeit

- Betrieb im eigenen Rechenzentrum (Proxmox-LXC) beim Kunden; keine externen
  Auftragsverarbeiter für die Kerndaten. Cloudflare (falls genutzt) nur als
  Edge/Transport – Konfiguration liegt beim Kunden.

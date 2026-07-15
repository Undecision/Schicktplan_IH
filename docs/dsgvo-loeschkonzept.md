# DSGVO-Löschkonzept (Grundgerüst)

> Status: Grundgerüst (Phase 0). Wird in Phase 11 (Härtung/DSGVO-Abschluss)
> vervollständigt und operativ umgesetzt (automatischer Job, Auskunfts-/
> Exportfunktion). Ab dem Testsystem werden echte Personendaten verarbeitet,
> daher gilt dieses Konzept bereits ab dem Alpha-Test.

## 1. Betroffene personenbezogene Daten

- Benutzerkonten (`User`): Name, E-Mail, Rollen-/Gewerkezuordnung, Login-Historie.
- Schichtbucheinträge: Ersteller, Bearbeiter, Verantwortlicher, Kommentare.
- Audit-Log: Actor je schreibender Operation (revisionssicher, siehe unten).
- Schichtübergaben: unterschreibende Personen (übergebende/übernehmende Schicht).

## 2. Aufbewahrungsfristen (konfigurierbar)

Fristen werden **nicht hartkodiert**, sondern als Konfiguration hinterlegt
(Env-Variablen bzw. Admin-Einstellung, Ausbau in Phase 11):

| Datenkategorie              | Standardfrist | Konfig-Variable (geplant)         |
| --------------------------- | ------------- | --------------------------------- |
| Schichtbucheinträge         | 10 Jahre      | `RETENTION_EINTRAEGE_YEARS`       |
| Audit-Log / Versionierung   | 10 Jahre      | `RETENTION_AUDITLOG_YEARS`        |
| Login-Events                | 12 Monate     | `RETENTION_LOGIN_EVENTS_MONTHS`   |
| Deaktivierte Benutzerkonten | 24 Monate     | `RETENTION_INACTIVE_USERS_MONTHS` |

Begründung Standardwerte: Instandhaltungsdokumentation hat betrieblichen/
gesetzlichen Nachweischarakter (Anlagenhistorie, Arbeitssicherheit) und wird
daher langfristig aufbewahrt; personenbezogene Zugriffs-/Login-Daten deutlich
kürzer.

## 3. Lösch- / Anonymisierungskonzept

- **Kein Hard-Delete** von Schichtbucheinträgen (Referenzintegrität,
  Revisionssicherheit) → nach Fristablauf **Anonymisierung** statt Löschung:
  Ersteller-/Bearbeiter-Referenz wird durch einen Platzhalter ("Ehemaliger
  Mitarbeiter") ersetzt, Freitext bleibt erhalten (betriebliche Historie).
- **Benutzerkonten**: Bei Austritt zunächst Deaktivierung (`status`), nach
  Ablauf der Frist Anonymisierung von Name/E-Mail, Rollen-/Gewerkezuordnung
  wird entfernt.
- **Login-Events**: nach Ablauf der Frist Hard-Delete (keine Referenzintegrität
  nötig, dienen nur der Sicherheitsüberwachung).
- **Audit-Log**: append-only, daher **keine Löschung einzelner Einträge**;
  Anonymisierung des `actor`-Feldes nach Fristablauf analog zu Benutzerkonten,
  Vorher-/Nachher-Stände bleiben für Revisionssicherheit erhalten.

## 4. Lösch-/Anonymisierungs-Job (Platzhalter)

Geplant als wiederkehrender Backend-Job (Phase 11):

```
apps/api/src/dsgvo/retention.job.ts   (Platzhalter, noch nicht implementiert)
```

Ablauf (geplant):

1. Ermittle Datensätze je Kategorie, deren Frist abgelaufen ist (Konfig aus
   Tabelle 2).
2. Anonymisiere/lösche gemäß Regeln aus Abschnitt 3.
3. Protokolliere den Lauf selbst im Audit-Log (Anzahl betroffener Datensätze,
   keine Personendaten im Log-Eintrag).

## 5. Auskunfts- und Exportfunktion (Platzhalter)

Geplant (Phase 11): Admin-Funktion "Auskunft nach Art. 15 DSGVO" – Export
aller personenbezogenen Daten zu einer Person (Benutzerkonto, erstellte/
bearbeitete Einträge, Audit-Log-Einträge als Actor, Übergabe-Unterschriften)
als strukturierte Datei (JSON/PDF).

## 6. Technische und organisatorische Maßnahmen (TOM)

Siehe `docs/dsgvo-tom.md` (wird in Phase 11 vervollständigt). Bereits ab
Phase 0 umgesetzt:

- Verschlüsselte tägliche Backups (`infra/scripts/backup.sh`).
- Zugriffskontrolle auf Infrastrukturebene: Postgres/MinIO nicht öffentlich
  exponiert, nur über internes Docker-Netzwerk erreichbar.
- HTTPS-Terminierung am Reverse Proxy (Caddy).

## 7. Zuständigkeit

Fachlicher Ansprechpartner und Verantwortlicher für dieses Löschkonzept:
Instandhaltung / IT SIG Combibloc GmbH, Werk Wittenberg (Detailkontakt bei
Produktivsetzung zu ergänzen).

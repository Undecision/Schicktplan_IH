# Abnahme-Checkliste (Kap. 21 Lastenheft)

Ausfüllbare Checkliste für die Gesamt-Abnahme (P11.4). Spalte „Status" beim
Abnahmetermin ausfüllen (✅/❌/Anmerkung).

| #   | Kriterium                                       | Abgedeckt in     | Prüfschritt                                                                                                                | Status |
| --- | ----------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | 3 Gewerke gleichzeitig nutzbar                  | P1.1, P2.1, P3.x | Je Gewerk (Elektrotechnik/Mechanik/Versorgung) Nutzer anlegen, parallel Einträge erfassen; Gewerk-Sichtbarkeit greift      |        |
| 2   | Automatischer Bericht je Schicht                | P7.1             | Berichte → Schichtbericht generieren (Tag/Schicht); Kennzahlen + Freigabe durch Meister                                    |        |
| 3   | Digitale Schichtübergabe                        | P8.1             | Übergabe → erstellen; offene Störungen/laufende Arbeiten automatisch übernommen; speichern & wieder aufrufen               |        |
| 4   | Unterschriftsfähiges PDF                        | P8.2             | Übergabe-Detail → „PDF"; Layout mit Unterschriftsfeldern, Erzeugung < 10 s                                                 |        |
| 5   | SAP-IH-Auftrag + EasyFlow-TAG je Eintrag        | P3.1             | Eintrag mit SAP (6–12 Ziffern) und TAG (z. B. PW4-M-1023) anlegen                                                          |        |
| 6   | Fachbereich + Technischer Platz je Eintrag      | P3.1             | Pflichtfelder im Eintragsformular                                                                                          |        |
| 7   | Dateianhänge (Bilder/Dokumente)                 | P4.x             | Bild + PDF an Eintrag hochladen, Vorschau, Download, Löschen                                                               |        |
| 8   | Vollständig durchsuchbar/filterbar              | P5.x             | Volltextsuche (Beschreibung/SAP/TAG **und** Techn. Platz/Gewerk/Fachbereich/Ersteller); kombinierbare, URL-teilbare Filter |        |
| 9   | Revisionssichere Protokollierung                | P1.6, P6.1       | Eintrag ändern → Änderungsverlauf zeigt Wer/Wann/Was; Audit-Log DB-seitig unveränderlich                                   |        |
| 10  | Benutzerrechte verwaltbar                       | P1.x             | Admin: Benutzer anlegen/bearbeiten/deaktivieren, Rollen & Gewerke zuweisen                                                 |        |
| 11  | Performant über aktuelle Browser; DSGVO-konform | P9, P10, P11     | Dashboard/Suche < Zielzeiten (siehe unten); Edge/Chrome/Firefox; DSGVO-Auskunft/Anonymisierung; verschlüsselte Backups     |        |

## Zusätzliche Prüfungen

- **Reporting/Export (P10)**: Berichte → „Auswertungen & Export" – Tages-/Wochen-/
  Monatsbericht sowie nach Fachbereich/Technischem Platz/SAP-Auftrag; Export als
  PDF und Excel.
- **Benachrichtigungen (P8.5)**: Bei aktivem SMTP/Teams kritischen Eintrag
  anlegen → Benachrichtigung wird versendet.

## Nicht-funktionale Ziele (P11.1)

- Seitenaufbau < 3 s, Suche < 2 s, PDF < 10 s (bei 10–40 gleichzeitigen Nutzern).
- Globales Rate-Limit aktiv; Security-Header (Helmet) gesetzt; Eingaben
  validiert/whitelisted.

## Durchgängiger Abnahme-Durchlauf

„3 Gewerke parallel → Einträge (mit SAP/TAG, Anhängen) → Suche/Filter →
Schichtbericht → Übergabe → unterschriftsfähiges PDF → revisionssichere
Historie prüfen → Rechteverwaltung prüfen." Ergebnis dokumentieren.

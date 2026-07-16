/**
 * DSGVO – Betroffenenrechte (P11.3). Auskunft/Export und Anonymisierung
 * personenbezogener Daten. Die revisionssichere Historie (Audit-Log) bleibt
 * erhalten; personenbezogene Namen/E-Mails werden bei Anonymisierung ersetzt.
 */
export interface PersonExport {
  erzeugtAm: string;
  person: {
    id: string;
    name: string;
    email: string;
    status: string;
    rollen: string[];
    createdAt: string;
  };
  eintraege: {
    id: string;
    zeitpunkt: string;
    beschreibung: string;
    status: string;
    gewerk: string;
  }[];
  kommentare: { id: string; text: string; createdAt: string; eintragId: string }[];
  auditEintraege: {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    createdAt: string;
  }[];
}

export interface AnonymisierenResult {
  id: string;
  anonymisiert: true;
}

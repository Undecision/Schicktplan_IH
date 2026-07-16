import { ZEIT_REGEX } from "@schichtbuch/shared";

export type FieldType = "text" | "time" | "boolean";

export interface StammdatenField {
  key: string;
  label: string;
  type: FieldType;
  /** Regex-Validierung (nur type "text"/"time"). */
  pattern?: RegExp;
  patternMessage?: string;
  /** Im Formular editierbar (Standard: true). aktiv wird separat behandelt. */
  editable?: boolean;
}

export interface StammdatenResource {
  /** REST-Endpunkt-Pfad ohne führenden Slash, z.B. "gewerke". */
  endpoint: string;
  labelSingular: string;
  labelPlural: string;
  /** Feld für die Duplikat-/Anzeige-Identität (z.B. "name" oder "bezeichnung"). */
  primaryField: string;
  fields: StammdatenField[];
}

export const STAMMDATEN_RESOURCES: Record<string, StammdatenResource> = {
  gewerke: {
    endpoint: "gewerke",
    labelSingular: "Gewerk",
    labelPlural: "Gewerke",
    primaryField: "name",
    fields: [{ key: "name", label: "Name", type: "text" }],
  },
  fachbereiche: {
    endpoint: "fachbereiche",
    labelSingular: "Fachbereich",
    labelPlural: "Fachbereiche",
    primaryField: "name",
    fields: [{ key: "name", label: "Name", type: "text" }],
  },
  "technische-plaetze": {
    endpoint: "technische-plaetze",
    labelSingular: "Technischer Platz",
    labelPlural: "Technische Plätze",
    primaryField: "bezeichnung",
    fields: [
      { key: "bezeichnung", label: "Bezeichnung", type: "text" },
      { key: "code", label: "Code", type: "text" },
      { key: "sapSyncFaehig", label: "SAP-synchronisierbar", type: "boolean" },
    ],
  },
  schlagwoerter: {
    endpoint: "schlagwoerter",
    labelSingular: "Schlagwort",
    labelPlural: "Schlagwörter",
    primaryField: "name",
    fields: [{ key: "name", label: "Name", type: "text" }],
  },
  "schicht-definitionen": {
    endpoint: "schicht-definitionen",
    labelSingular: "Schicht-Definition",
    labelPlural: "Schichten",
    primaryField: "name",
    fields: [
      { key: "name", label: "Name", type: "text" },
      {
        key: "startzeit",
        label: "Startzeit",
        type: "time",
        pattern: ZEIT_REGEX,
        patternMessage: 'Format "HH:MM"',
      },
      {
        key: "endzeit",
        label: "Endzeit",
        type: "time",
        pattern: ZEIT_REGEX,
        patternMessage: 'Format "HH:MM"',
      },
    ],
  },
};

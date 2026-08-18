import { ZEIT_REGEX } from "@schichtbuch/shared";

export type FieldType = "text" | "time" | "boolean" | "reference";

export interface StammdatenField {
  key: string;
  label: string;
  type: FieldType;
  /** Regex-Validierung (nur type "text"/"time"). */
  pattern?: RegExp;
  patternMessage?: string;
  /** Im Formular editierbar (Standard: true). aktiv wird separat behandelt. */
  editable?: boolean;
  /** Für type "reference": Ziel-Endpunkt und Label-Feld der Optionen. */
  refEndpoint?: string;
  refLabelField?: "name" | "bezeichnung";
}

export interface StammdatenResource {
  /** REST-Endpunkt-Pfad ohne führenden Slash, z.B. "gewerke". */
  endpoint: string;
  labelSingular: string;
  labelPlural: string;
  /** Feld für die Duplikat-/Anzeige-Identität (z.B. "name" oder "bezeichnung"). */
  primaryField: string;
  fields: StammdatenField[];
  /** true = bietet zusätzlich einen Excel-Import an (nur technische Plätze). */
  importierbar?: boolean;
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
    primaryField: "code",
    importierbar: true,
    fields: [
      { key: "code", label: "Techn. Platz", type: "text" },
      { key: "bezeichnung", label: "Bezeichnung", type: "text" },
      {
        key: "fachbereichId",
        label: "Fachbereich (optional)",
        type: "reference",
        refEndpoint: "fachbereiche",
        refLabelField: "name",
      },
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

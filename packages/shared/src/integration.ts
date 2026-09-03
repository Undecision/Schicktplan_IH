/**
 * „Billige" Verknüpfung zu externen Systemen (SAP, EasyFlow): pro Feld eine
 * URL-Vorlage, in der `{nummer}` durch den eingegebenen Wert ersetzt wird
 * (fehlt der Platzhalter, wird die Nummer angehängt). Global in der
 * Administration pflegbar; ohne Vorlage bleibt das Feld reiner Text.
 */
export interface IntegrationLinksConfig {
  /** URL-Vorlage für SAP-IH-Aufträge (z.B. "https://sap.example.com/order/{nummer}"). */
  sapUrlTemplate: string | null;
  /** URL-Vorlage für EasyFlow-TAGs. */
  easyFlowUrlTemplate: string | null;
}

/**
 * Baut aus einer URL-Vorlage und einer Nummer einen sicheren Link. Gibt null
 * zurück, wenn Vorlage/Nummer leer sind oder das Ergebnis kein http(s)-Link ist
 * (verhindert z.B. `javascript:`-URLs).
 */
export function baueIntegrationsLink(
  template: string | null | undefined,
  nummer: string | null | undefined,
): string | null {
  const t = template?.trim();
  const n = nummer?.trim();
  if (!t || !n) return null;
  const url = t.includes("{nummer}")
    ? t.replace(/\{nummer\}/g, encodeURIComponent(n))
    : t + encodeURIComponent(n);
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

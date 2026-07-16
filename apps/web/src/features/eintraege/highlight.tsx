import type { ReactNode } from "react";
import { HIGHLIGHT_END, HIGHLIGHT_START } from "@schichtbuch/shared";

/**
 * Rendert einen Volltext-Auszug (P5.1) und hebt die zwischen `⟦…⟧` markierten
 * Treffer hervor. Da der Text als React-Nodes (nicht via dangerouslySetInnerHTML)
 * gerendert wird, sind eingebettete Zeichen aus Nutzereingaben unkritisch.
 */
export function Highlighted({ text, fallback }: { text?: string | null; fallback: string }) {
  if (!text) return <>{fallback}</>;

  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    const start = rest.indexOf(HIGHLIGHT_START);
    if (start === -1) {
      nodes.push(rest);
      break;
    }
    if (start > 0) nodes.push(rest.slice(0, start));
    rest = rest.slice(start + HIGHLIGHT_START.length);
    const end = rest.indexOf(HIGHLIGHT_END);
    if (end === -1) {
      nodes.push(rest);
      break;
    }
    nodes.push(
      <mark key={key++} className="rounded-sm bg-yellow-400/30 px-0.5 text-foreground">
        {rest.slice(0, end)}
      </mark>,
    );
    rest = rest.slice(end + HIGHLIGHT_END.length);
  }
  return <>{nodes}</>;
}

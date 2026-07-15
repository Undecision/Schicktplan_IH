const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parst einfache Dauer-Strings wie "15m" oder "7d" (s/m/h/d) in Millisekunden. */
export function parseDurationToMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Ungültiges Dauerformat: "${value}" (erwartet z.B. "15m", "7d").`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_MS[unit];
}

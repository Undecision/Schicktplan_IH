import { parseDurationToMs } from "./duration";

describe("parseDurationToMs", () => {
  it.each([
    ["15m", 15 * 60_000],
    ["7d", 7 * 86_400_000],
    ["30s", 30_000],
    ["2h", 2 * 3_600_000],
  ])("parst %s zu %i ms", (input, expected) => {
    expect(parseDurationToMs(input)).toBe(expected);
  });

  it("wirft bei ungültigem Format", () => {
    expect(() => parseDurationToMs("invalid")).toThrow();
  });
});

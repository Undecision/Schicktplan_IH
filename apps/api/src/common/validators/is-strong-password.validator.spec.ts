import { isStrongPassword } from "./is-strong-password.validator";

describe("isStrongPassword", () => {
  it("akzeptiert ein Passwort, das die Policy erfüllt", () => {
    expect(isStrongPassword("Sicheres-Passwort-123")).toBe(true);
  });

  it("lehnt zu kurze Passwörter ab", () => {
    expect(isStrongPassword("Ab1!")).toBe(false);
  });

  it("lehnt Passwörter ohne Großbuchstaben ab", () => {
    expect(isStrongPassword("nur-kleinbuchstaben-123")).toBe(false);
  });

  it("lehnt Passwörter ohne Ziffer/Sonderzeichen ab", () => {
    expect(isStrongPassword("NurBuchstabenOhneZiffern")).toBe(false);
  });
});

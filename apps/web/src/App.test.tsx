import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";

vi.mock("@/features/auth/api", () => ({
  fetchMe: vi.fn().mockRejectedValue(new Error("nicht angemeldet")),
  refreshAccessToken: vi.fn().mockRejectedValue(new Error("kein Refresh-Token")),
  login: vi.fn(),
  logoutRequest: vi.fn(),
}));

describe("App", () => {
  it("leitet nicht angemeldete Nutzer zur Login-Seite um", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Schichtbuch" })).toBeInTheDocument();
    });
    expect(screen.getByLabelText("E-Mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Passwort")).toBeInTheDocument();
  });
});
